import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Cora SMS worker. Invoked ~every 5 minutes by pg_cron (see the
// schedule_reminders migration). Sends every reminder whose send_at has passed,
// applies two suppression guards, and records the outcome. The copy + send_at
// were frozen at quiz completion by the TS engine (src/lib/cora-reminders.ts) —
// this function never recomputes either; it just sends and marks.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// How many due reminders to process per invocation. Keeps a single run bounded;
// anything left over is picked up by the next 5-minute tick.
const BATCH_SIZE = 50;

// Twilio returns 21610 when the recipient has replied STOP — the number is
// blocked at the carrier/Twilio level. Treat it as terminal (skip, never retry)
// rather than a transient failure. This is our opt-out compliance without an
// inbound webhook (see plan.md "Suppression design").
const TWILIO_STOPPED_CODE = 21610;

// Session funnel_status values that mean the lead is already resolved, so the
// reminder is moot. GOLD (all 4 photos in) is detected separately below.
const RESOLVED_STATUSES = new Set(["booked", "audit_booked", "audit_complete"]);

interface ReminderRow {
  id: string;
  quiz_session_id: string;
  milestone: string;
  message: string;
  phone: string | null;
  attempts: number;
}

interface SessionRow {
  funnel_status: string | null;
  upload_outdoor: string | null;
  upload_breaker: string | null;
  upload_thermostat: string | null;
  upload_bill: string | null;
}

// A lead is "resolved" — and so should not be nudged — once they've reached
// GOLD (all four equipment photos uploaded) or booked an audit.
function isResolved(session: SessionRow): boolean {
  const reachedGold =
    !!session.upload_outdoor &&
    !!session.upload_breaker &&
    !!session.upload_thermostat &&
    !!session.upload_bill;
  const booked = !!session.funnel_status && RESOLVED_STATUSES.has(session.funnel_status);
  return reachedGold || booked;
}

type TwilioResult =
  | { ok: true; sid: string }
  | { ok: false; terminal: boolean; error: string };

async function sendViaTwilio(
  to: string,
  body: string,
  creds: { accountSid: string; authToken: string; from: string },
): Promise<TwilioResult> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: creds.from, Body: body });

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${creds.accountSid}:${creds.authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const payload = await resp.json().catch(() => ({}));

  if (resp.ok) {
    return { ok: true, sid: payload.sid ?? "" };
  }
  return {
    ok: false,
    terminal: payload.code === TWILIO_STOPPED_CODE,
    error: `twilio ${resp.status}: ${payload.message ?? "unknown error"} (code ${payload.code ?? "?"})`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const from = Deno.env.get("TWILIO_FROM");
    if (!accountSid || !authToken || !from) {
      return json({ error: "Twilio secrets not configured" }, 500);
    }
    const creds = { accountSid, authToken, from };

    // Due + unsent. Oldest first so a backlog drains in send order.
    const nowIso = new Date().toISOString();
    const { data: due, error: fetchError } = await supabase
      .from("cora_reminders")
      .select("id, quiz_session_id, milestone, message, phone, attempts")
      .eq("status", "pending")
      .lte("send_at", nowIso)
      .order("send_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error("send-due-reminders: fetch failed:", fetchError.message);
      return json({ error: "Failed to load reminders" }, 500);
    }

    const reminders = (due ?? []) as ReminderRow[];
    const summary = { processed: reminders.length, sent: 0, skipped: 0, failed: 0 };

    for (const r of reminders) {
      // Guard 1: no destination → nothing to send. Terminal skip.
      if (!r.phone) {
        await supabase
          .from("cora_reminders")
          .update({ status: "skipped", last_error: "no phone on record" })
          .eq("id", r.id);
        summary.skipped++;
        continue;
      }

      // Guard 2: lead already resolved (GOLD or booked) → suppress. One cheap
      // read of the session row; no timer/copy recomputation.
      const { data: session } = await supabase
        .from("quiz_sessions")
        .select("funnel_status, upload_outdoor, upload_breaker, upload_thermostat, upload_bill")
        .eq("id", r.quiz_session_id)
        .single();

      if (session && isResolved(session as SessionRow)) {
        await supabase
          .from("cora_reminders")
          .update({ status: "skipped", last_error: "lead already resolved" })
          .eq("id", r.id);
        summary.skipped++;
        continue;
      }

      const result = await sendViaTwilio(r.phone, r.message, creds);

      if (result.ok) {
        await supabase
          .from("cora_reminders")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_sid: result.sid,
            attempts: r.attempts + 1,
          })
          .eq("id", r.id);
        summary.sent++;
      } else if (result.terminal) {
        // Recipient opted out (STOP) — never retry.
        await supabase
          .from("cora_reminders")
          .update({ status: "skipped", attempts: r.attempts + 1, last_error: result.error })
          .eq("id", r.id);
        summary.skipped++;
      } else {
        await supabase
          .from("cora_reminders")
          .update({ status: "failed", attempts: r.attempts + 1, last_error: result.error })
          .eq("id", r.id);
        summary.failed++;
      }
    }

    return json(summary);
  } catch (e) {
    console.error("send-due-reminders error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
