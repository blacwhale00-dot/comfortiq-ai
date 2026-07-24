import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { toE164 } from "../_shared/phone.ts";

// Cora SMS worker. Invoked ~every 5 minutes by pg_cron (see the
// schedule_reminders migration). Sends every reminder whose send_at has passed,
// applies guards (no-phone, unnormalizable number, opt-out suppression,
// resolved-lead), and records the outcome. Transient send failures stay pending
// and retry on later ticks up to MAX_ATTEMPTS. The copy + send_at were frozen at
// quiz completion by the TS engine (src/lib/cora-reminders.ts) — this function
// never recomputes either; it just sends and marks.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// How many due reminders to process per invocation. Keeps a single run bounded;
// anything left over is picked up by the next 5-minute tick.
const BATCH_SIZE = 50;

// Twilio returns 21610 when the recipient has replied STOP — the number is
// blocked at the carrier/Twilio level. We treat it as a hard opt-out: record the
// number in suppression_list and skip, never retry. Belt-and-suspenders next to
// the sms-inbound webhook, which is the primary opt-out capture path.
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

// Retry budget for transient failures (network / Twilio 5xx / 429). A reminder
// that keeps failing transiently stays pending and is retried on later 5-minute
// ticks until it reaches this many attempts, then it's marked failed. Terminal
// errors (bad number, opt-out) never retry.
const MAX_ATTEMPTS = 5;

// A send either succeeds, hits a hard opt-out (record + suppress, never retry),
// fails terminally (bad number, to==from — never retry), or fails transiently
// (leave pending, retry on a later tick).
type TwilioResult =
  | { ok: true; sid: string }
  | { ok: false; kind: "optout" | "terminal" | "transient"; error: string };

async function sendViaTwilio(
  to: string,
  body: string,
  creds: { accountSid: string; authToken: string; from: string },
): Promise<TwilioResult> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: creds.from, Body: body });

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${creds.accountSid}:${creds.authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
  } catch (e) {
    // DNS / connection / timeout — nothing reached Twilio. Retry on a later tick.
    return {
      ok: false,
      kind: "transient",
      error: `network error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const payload = await resp.json().catch(() => ({}));

  if (resp.ok) {
    return { ok: true, sid: payload.sid ?? "" };
  }

  const detail = `twilio ${resp.status}: ${payload.message ?? "unknown error"} (code ${payload.code ?? "?"})`;
  // Recipient opted out at the carrier level — record + suppress, never retry.
  if (payload.code === TWILIO_STOPPED_CODE) return { ok: false, kind: "optout", error: detail };
  // Twilio server error or rate-limit — the same request may succeed later.
  if (resp.status >= 500 || resp.status === 429) return { ok: false, kind: "transient", error: detail };
  // Any other 4xx (invalid number, to==from, unroutable) won't fix itself.
  return { ok: false, kind: "terminal", error: detail };
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
    const summary = { processed: reminders.length, sent: 0, skipped: 0, retried: 0, failed: 0 };

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

      // Guard 1b: normalize to E.164. An unnormalizable number can never send,
      // so skip it terminally rather than burning attempts on a guaranteed 21211.
      const to = toE164(r.phone);
      if (!to) {
        await supabase
          .from("cora_reminders")
          .update({ status: "skipped", last_error: `unnormalizable phone: ${r.phone}` })
          .eq("id", r.id);
        summary.skipped++;
        continue;
      }

      // Guard 1c: shared suppression list. Opt-outs captured by the sms-inbound
      // webhook (or a prior carrier 21610) live here; no outbound path may bypass
      // this check (Will §5).
      const { data: suppressed } = await supabase
        .from("suppression_list")
        .select("phone")
        .eq("phone", to)
        .maybeSingle();
      if (suppressed) {
        await supabase
          .from("cora_reminders")
          .update({ status: "skipped", last_error: "suppressed (opt-out)" })
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

      const result = await sendViaTwilio(to, r.message, creds);
      const attempts = r.attempts + 1;

      if (result.ok) {
        await supabase
          .from("cora_reminders")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_sid: result.sid,
            attempts,
          })
          .eq("id", r.id);
        summary.sent++;
      } else if (result.kind === "optout") {
        // Carrier-level opt-out. Record it in the shared suppression list so no
        // future send (any channel) reaches this number, then skip the reminder.
        await supabase.from("suppression_list").upsert(
          {
            phone: to,
            reason: "optout",
            source: "send-due-reminders",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "phone" },
        );
        await supabase
          .from("cora_reminders")
          .update({ status: "skipped", attempts, last_error: result.error })
          .eq("id", r.id);
        summary.skipped++;
      } else if (result.kind === "transient" && attempts < MAX_ATTEMPTS) {
        // Leave the row pending so the next 5-minute tick retries it; just record
        // the failed attempt and its reason.
        await supabase
          .from("cora_reminders")
          .update({ attempts, last_error: result.error })
          .eq("id", r.id);
        summary.retried++;
      } else {
        // Terminal error, or a transient one that exhausted MAX_ATTEMPTS.
        await supabase
          .from("cora_reminders")
          .update({ status: "failed", attempts, last_error: result.error })
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
