import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// GOLD report handoff — the trigger behind the Trophy screen's "Send My Report".
//
// A homeowner who reached GOLD (900/900) submits their email; this function is
// the server-side boundary that:
//   1. re-verifies GOLD from the DB (never trusts the client),
//   2. records an idempotent report request (one row per session), and
//   3. advances the session's funnel_status to "report_requested".
//
// It deliberately does NOT render or email the PDF. That is the Phase 3
// "Dynamic PDF Generator" ticket, which plugs into renderAndSendReport() below
// and transitions the report_requests row 'requested' -> 'sent'. Keeping the
// trigger and the generator separate mirrors how the tickets split the work and
// how cora-reminders.ts (freeze) and send-due-reminders (send) are split.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// One @, a domain, and a dotted TLD — matches the client-side check on the
// trophy screen so both sides agree on what "valid" means.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The five uploads that define GOLD. Mirrors src/lib/upload-progress.ts — a lead
// only reaches the trophy screen with all five in, and this is where we prove it
// server-side before promising a report.
const GOLD_UPLOAD_KEYS = [
  "upload_outdoor",
  "upload_breaker",
  "upload_thermostat",
  "upload_air_handler",
  "upload_bill",
] as const;

interface SessionRow {
  email: string | null;
  first_name: string | null;
  funnel_status: string | null;
  upload_outdoor: string | null;
  upload_breaker: string | null;
  upload_thermostat: string | null;
  upload_air_handler: string | null;
  upload_bill: string | null;
}

function reachedGold(session: SessionRow): boolean {
  return GOLD_UPLOAD_KEYS.every((k) => !!session[k]);
}

/**
 * PHASE 3 SEAM — "Dynamic PDF Generator" ticket.
 *
 * Render the personalized Guzzler Score PDF for this GOLD session and email it to
 * `email`, then flip the report_requests row to 'sent' (set pdf_url, provider_id,
 * sent_at) — or 'failed' with last_error. Intentionally a no-op for the Trophy
 * ticket: this ticket only guarantees the request is captured and the funnel
 * advances. Wire the PDF renderer + email provider here; nothing else in this
 * file needs to change.
 */
// deno-lint-ignore no-unused-vars
async function renderAndSendReport(
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  session: SessionRow,
  email: string,
): Promise<void> {
  // no-op — leaves status 'requested' for the Phase 3 generator to pick up.
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
    const { sessionId, email: postedEmail } = await req.json();
    if (!sessionId) {
      return json({ error: "sessionId required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch just what the handoff needs to verify GOLD + resolve the recipient.
    const { data: session, error: fetchError } = await supabase
      .from("quiz_sessions")
      .select(
        "email, first_name, funnel_status, upload_outdoor, upload_breaker, upload_thermostat, upload_air_handler, upload_bill",
      )
      .eq("id", sessionId)
      .single();

    if (fetchError || !session) {
      return json({ error: "Session not found" }, 404);
    }

    // Server-side GOLD guard — the guarantee the client-side redirect can't give.
    if (!reachedGold(session as SessionRow)) {
      return json(
        { status: "not_gold", error: "Report unlocks only after all five photos are uploaded." },
        403,
      );
    }

    // Recipient: the freshly-submitted email if it's valid, else the one captured
    // at the quiz gate. Guarantees we never record a report request we can't send.
    const trimmed = typeof postedEmail === "string" ? postedEmail.trim() : "";
    const email = EMAIL_RE.test(trimmed)
      ? trimmed
      : session.email && EMAIL_RE.test(session.email)
        ? session.email
        : null;
    if (!email) {
      return json({ error: "A valid email is required." }, 400);
    }

    // Idempotency: one handoff per session. If it's already sent (or mid-render),
    // report that instead of re-queuing — a double-tap can't duplicate the email.
    const { data: existing } = await supabase
      .from("report_requests")
      .select("status")
      .eq("quiz_session_id", sessionId)
      .maybeSingle();

    if (existing?.status === "sent") {
      return json({ status: "already_sent", email });
    }
    if (existing?.status === "rendering") {
      return json({ status: "in_progress", email });
    }

    // Record (or re-request) the handoff. onConflict keeps it to a single row and
    // only touches the columns we pass, so Phase 3's attempts/last_error survive.
    const { data: request, error: upsertError } = await supabase
      .from("report_requests")
      .upsert(
        { quiz_session_id: sessionId, email, status: "requested" },
        { onConflict: "quiz_session_id" },
      )
      .select("id")
      .single();

    if (upsertError || !request) {
      console.error("send-report: failed to record request:", upsertError?.message);
      return json({ error: "Failed to record report request" }, 500);
    }

    // Preserve the existing funnel semantics and pin the report email onto the
    // session (same two writes the trophy screen used to do client-side).
    await supabase
      .from("quiz_sessions")
      .update({ email, funnel_status: "report_requested" })
      .eq("id", sessionId);

    // Phase 3 fulfilment (no-op today) — never let it break the handoff response.
    try {
      await renderAndSendReport(supabase, request.id as string, session as SessionRow, email);
    } catch (e) {
      console.error("send-report: renderAndSendReport failed:", e);
    }

    return json({ status: "requested", email });
  } catch (e) {
    console.error("send-report error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
