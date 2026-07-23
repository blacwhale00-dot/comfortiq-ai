import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// The revenue-recovery worker. Invoked every 15 minutes by pg_cron (see the
// follow_up_engine migration) and kicked directly by the app after an
// approve/skip so sends feel instant. Each tick:
//
//   1. Reconcile: advance sequences whose current-step message was sent or
//      skipped (the approvals UI writes 'skipped' directly).
//   2. Send: deliver 'approved' messages — but only inside the 8am–8pm
//      America/New_York window; outside it they stay queued for morning.
//   3. Draft: for sequences that are due (next_action_at <= now) with no
//      message yet at the current step, generate a personal SMS draft from
//      Will's call notes via the Anthropic API and post it to Slack for
//      approval. Drafts NEVER send without approval.
//
// All secrets come from function env (supabase secrets set); nothing is
// hard-coded.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const SEND_WINDOW = { startHour: 8, endHour: 20, timeZone: "America/New_York" };
const BATCH = 25;

interface Lead {
  id: string;
  customer_name: string | null;
  phone: string | null;
  city: string | null;
  job_type: string | null;
  equipment: unknown;
  notes_visible: string | null;
  call_notes: string | null;
  outcome: string | null;
  outcome_set_at: string | null;
  opted_out: boolean;
}

interface Sequence {
  id: string;
  lead_id: string;
  current_step: number;
  status: string;
  enrolled_at: string;
  next_action_at: string | null;
  field_leads: Lead | null;
}

interface Msg {
  id: string;
  sequence_id: string;
  step: number;
  draft_body: string;
  final_body: string | null;
  status: string;
}

function hourInET(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: SEND_WINDOW.timeZone,
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
}

export function insideSendWindow(now: Date): boolean {
  const hour = hourInET(now);
  return hour >= SEND_WINDOW.startHour && hour < SEND_WINDOW.endHour;
}

async function slackPing(text: string): Promise<void> {
  const hook = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!hook) return; // visibility must never break the pipeline
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    console.error("slack ping failed:", e);
  }
}

// Move a sequence to the next cadence step, or complete it after the last one.
async function advanceSequence(
  db: SupabaseClient,
  seq: { id: string; current_step: number; enrolled_at: string },
): Promise<void> {
  const nextStep = seq.current_step + 1;
  const { data: cadence } = await db
    .from("follow_up_cadence")
    .select("day_offset")
    .eq("step", nextStep)
    .maybeSingle();

  if (!cadence) {
    await db
      .from("follow_up_sequences")
      .update({ status: "completed", next_action_at: null })
      .eq("id", seq.id);
    return;
  }
  const due = new Date(
    new Date(seq.enrolled_at).getTime() + cadence.day_offset * 86_400_000,
  ).toISOString();
  await db
    .from("follow_up_sequences")
    .update({ current_step: nextStep, next_action_at: due })
    .eq("id", seq.id);
}

type TwilioResult = { ok: true; sid: string } | { ok: false; error: string; code: string | null };

async function sendSms(to: string, body: string): Promise<TwilioResult> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const from = Deno.env.get("TWILIO_FROM")!;
  const statusCallback = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-webhook`;

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body, StatusCallback: statusCallback }).toString(),
    },
  );
  const payload = await resp.json().catch(() => ({}));
  if (resp.ok) return { ok: true, sid: payload.sid ?? "" };
  return {
    ok: false,
    code: payload.code != null ? String(payload.code) : null,
    error: `twilio ${resp.status}: ${payload.message ?? "unknown"} (code ${payload.code ?? "?"})`,
  };
}

function equipmentSummary(equipment: unknown): string {
  if (!Array.isArray(equipment) || equipment.length === 0) return "not on file";
  return equipment
    .map((e) => {
      const item = e as Record<string, unknown>;
      return [item.install_year, item.brand, item.type].filter(Boolean).join(" ");
    })
    .filter((s) => s !== "")
    .join("; ") || "not on file";
}

async function generateDraft(
  lead: Lead,
  step: number,
  totalSteps: number,
  priorMessages: { step: number; body: string }[],
  replies: { body: string; received_at: string }[],
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const daysSince = lead.outcome_set_at
    ? Math.round((Date.now() - new Date(lead.outcome_set_at).getTime()) / 86_400_000)
    : null;

  const context = [
    `Customer: ${lead.customer_name ?? "unknown"} in ${lead.city ?? "the Atlanta area"}`,
    `Job type: ${lead.job_type ?? "HVAC estimate"}`,
    `Equipment: ${equipmentSummary(lead.equipment)}`,
    `Call outcome: ${lead.outcome ?? "no_sale"}${daysSince != null ? ` (${daysSince} days ago)` : ""}`,
    `Will's call notes: ${lead.call_notes ?? "(none — keep it short and service-minded)"}`,
    lead.notes_visible ? `Dispatch notes: ${lead.notes_visible}` : null,
    priorMessages.length
      ? `Previous texts already sent:\n${priorMessages.map((m) => `  ${m.step}. ${m.body}`).join("\n")}`
      : "No previous follow-up texts sent yet.",
    replies.length
      ? `Customer replies so far:\n${replies.map((r) => `  - ${r.body}`).join("\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You write follow-up SMS messages for Will, a 20-year HVAC field-sales veteran at RS Andrews in Atlanta. He met this homeowner in person and didn't close the sale — this is touch ${step} of ${totalSteps}.

${context}

Write ONE text message from Will. Rules:
- Under 320 characters, plain text, at most one emoji.
- Sound like a seasoned field guy texting from his truck: warm, direct, zero corporate polish.
- Reference something SPECIFIC from the call notes or equipment (age of system, the noise they mentioned, the price concern...). Never a generic "just checking in".
- One clear, low-pressure next step (a question is good).
- Sign it "–Will @ RS Andrews".
${step === 1 ? '- End with: "Reply STOP to opt out."' : ""}

Return ONLY the SMS text — no quotes, no commentary.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`anthropic ${resp.status}: ${detail.slice(0, 200)}`);
  }
  const payload = await resp.json();
  const text: string =
    payload?.content?.find((b: { type: string }) => b.type === "text")?.text?.trim() ?? "";
  if (!text) throw new Error("empty draft from model");
  return text.slice(0, 320);
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
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const now = new Date();
    const summary = { advanced: 0, sent: 0, queued: 0, drafted: 0, cancelled: 0, failed: 0 };

    // ---- 1. Reconcile: advance past sent/skipped current-step messages ----
    const { data: activeSeqs, error: seqError } = await db
      .from("follow_up_sequences")
      .select("id, lead_id, current_step, status, enrolled_at, next_action_at, field_leads(*)")
      .eq("status", "active")
      .limit(200);
    if (seqError) throw seqError;

    const sequences = (activeSeqs ?? []) as unknown as Sequence[];
    for (const seq of sequences) {
      const { data: msg } = await db
        .from("follow_up_messages")
        .select("id, status, step")
        .eq("sequence_id", seq.id)
        .eq("step", seq.current_step)
        .maybeSingle();
      if (msg && (msg.status === "sent" || msg.status === "skipped")) {
        await advanceSequence(db, seq);
        summary.advanced++;
      }
    }

    // ---- 2. Send approved messages (inside the ET window only) ----
    const { data: approvedRaw, error: apprError } = await db
      .from("follow_up_messages")
      .select("id, sequence_id, step, draft_body, final_body, status")
      .eq("status", "approved")
      .order("approved_at", { ascending: true })
      .limit(BATCH);
    if (apprError) throw apprError;

    for (const msg of (approvedRaw ?? []) as Msg[]) {
      if (!insideSendWindow(now)) {
        summary.queued++;
        continue;
      }
      const { data: seqRow } = await db
        .from("follow_up_sequences")
        .select("id, lead_id, current_step, enrolled_at, field_leads(*)")
        .eq("id", msg.sequence_id)
        .single();
      const seq = seqRow as unknown as Sequence | null;
      const lead = seq?.field_leads;

      if (!lead || lead.opted_out || !lead.phone) {
        await db
          .from("follow_up_messages")
          .update({ status: "skipped", last_error: !lead ? "lead missing" : lead.opted_out ? "opted out" : "no phone" })
          .eq("id", msg.id);
        continue;
      }

      const body = msg.final_body ?? msg.draft_body;
      const result = await sendSms(lead.phone, body);
      if (result.ok) {
        await db
          .from("follow_up_messages")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            twilio_sid: result.sid,
            twilio_status: "queued",
          })
          .eq("id", msg.id);
        await advanceSequence(db, seq!);
        await slackPing(`✅ Message sent to ${lead.customer_name ?? lead.phone} (step ${msg.step}): "${body}"`);
        summary.sent++;
      } else {
        await db
          .from("follow_up_messages")
          .update({ status: "failed", last_error: result.error, twilio_error_code: result.code })
          .eq("id", msg.id);
        const a2p = result.code === "30034" ? " — A2P 10DLC registration issue, check the Twilio console" : "";
        await slackPing(`⚠️ Send failure for ${lead.customer_name ?? lead.phone} (step ${msg.step}): ${result.error}${a2p}`);
        summary.failed++;
      }
    }

    // ---- 3. Draft generation for due sequences ----
    const { count: totalSteps } = await db
      .from("follow_up_cadence")
      .select("step", { count: "exact", head: true });

    const due = sequences.filter(
      (s) => s.next_action_at != null && new Date(s.next_action_at) <= now,
    );
    for (const seq of due.slice(0, BATCH)) {
      const lead = seq.field_leads;
      if (!lead) continue;

      // Lead resolved or opted out since enrollment → stop the sequence.
      if (lead.opted_out || lead.outcome === "sold") {
        await db
          .from("follow_up_sequences")
          .update({ status: lead.opted_out ? "cancelled" : "completed", next_action_at: null })
          .eq("id", seq.id);
        summary.cancelled++;
        continue;
      }

      // Already has a message at this step (e.g. draft awaiting approval).
      const { data: existing } = await db
        .from("follow_up_messages")
        .select("id")
        .eq("sequence_id", seq.id)
        .eq("step", seq.current_step)
        .maybeSingle();
      if (existing) {
        // Draft pending approval — clear the due flag so we don't regenerate.
        await db.from("follow_up_sequences").update({ next_action_at: null }).eq("id", seq.id);
        continue;
      }

      const { data: prior } = await db
        .from("follow_up_messages")
        .select("step, final_body, draft_body, status")
        .eq("sequence_id", seq.id)
        .eq("status", "sent")
        .order("step");
      const { data: replies } = await db
        .from("inbound_messages")
        .select("body, received_at")
        .eq("lead_id", seq.lead_id)
        .order("received_at");

      try {
        const draft = await generateDraft(
          lead,
          seq.current_step,
          totalSteps ?? 5,
          (prior ?? []).map((m) => ({ step: m.step, body: m.final_body ?? m.draft_body })),
          replies ?? [],
        );
        await db.from("follow_up_messages").insert({
          sequence_id: seq.id,
          step: seq.current_step,
          draft_body: draft,
          status: "draft",
        });
        await db.from("follow_up_sequences").update({ next_action_at: null }).eq("id", seq.id);
        await slackPing(
          `✍️ Draft ready for ${lead.customer_name ?? "unknown"} (step ${seq.current_step}): "${draft}"\n` +
            `Context: ${lead.job_type ?? "HVAC"} in ${lead.city ?? "?"} · outcome ${lead.outcome ?? "?"} · approve in the app`,
        );
        summary.drafted++;
      } catch (e) {
        // Leave next_action_at set so the next tick retries.
        console.error(`draft generation failed for sequence ${seq.id}:`, e);
        summary.failed++;
      }
    }

    return json(summary);
  } catch (e) {
    console.error("process-follow-ups error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
