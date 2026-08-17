import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createInstantMeeting,
  getZoomAccessToken,
  readZoomCredentials,
} from "../_shared/zoom.ts";
import { buildContextCard, sendTelegramMessage } from "../_shared/telegram.ts";

// "Talk to Will NOW" — creates a per-homeowner Zoom instant meeting and pings
// Will to join. Direct Server-to-Server OAuth, no middleware (17-08 decision).
//
// ⚠️ NOT DEPLOYABLE YET. Three things are outstanding, all tracked in the
// 17-08 summary:
//   1. Will's four Zoom secrets (ZOOM_ACCOUNT_ID / _CLIENT_ID / _CLIENT_SECRET /
//      _WEBHOOK_SECRET) are not set.
//   2. The availability + instant_calls tables live in
//      supabase/migrations-pending/ and are UNAPPLIED, pending the approved plan
//      doc and a signature-probe project verification.
//   3. No consumer-facing button calls this. That is intentional: Will's rule is
//      "No dead 'Talk to Will NOW' button, ever" — it renders only once the
//      server can answer the availability check, which needs (2).
//
// Flow: availability re-check (server-side, never trust the client) → S2S token
// → instant meeting → instant_calls row → Telegram card to Will → join URL back.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const credsResult = readZoomCredentials((k) => Deno.env.get(k));
  if ("missing" in credsResult) {
    console.error(`instant-call-create: missing Zoom secrets: ${credsResult.missing.join(", ")}`);
    return json({ error: "zoom_not_configured" }, 503);
  }

  let sessionId: string | undefined;
  try {
    ({ sessionId } = await req.json());
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!sessionId) return json({ error: "sessionId required" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── 1. Availability re-check, server-side ────────────────────────────────
  // The button is already gated on this, but the client's view can be seconds
  // stale and Will may have flipped to /busy pulling into a customer's drive.
  const { data: availability, error: availabilityError } = await supabase
    .from("will_availability")
    .select("is_live")
    .order("toggled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (availabilityError) {
    console.error("instant-call-create: availability lookup failed", availabilityError.message);
    return json({ error: "availability_unavailable" }, 503);
  }
  if (!availability?.is_live) {
    // Not an error — the consumer UI falls through to Path B (evening booking).
    return json({ available: false }, 409);
  }

  // ── 2. Lead context for Will's card ──────────────────────────────────────
  const { data: session } = await supabase
    .from("quiz_sessions")
    .select("id, first_name, guzzler_score")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return json({ error: "session_not_found" }, 404);

  const { data: analysis } = await supabase
    .from("repair_replace_analysis")
    .select("recommendation, guzzler_band, reasoning_summary")
    .eq("quiz_session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ── 3. Zoom instant meeting ──────────────────────────────────────────────
  let meeting;
  try {
    const token = await getZoomAccessToken(credsResult.creds);
    meeting = await createInstantMeeting(
      token,
      `ComfortIQ — ${session.first_name ?? "Homeowner"}`,
    );
  } catch (err) {
    console.error("instant-call-create:", (err as Error).message);
    return json({ error: "zoom_unavailable" }, 502);
  }

  // ── 4. Record the call ───────────────────────────────────────────────────
  const { data: call, error: insertError } = await supabase
    .from("instant_calls")
    .insert({
      quiz_session_id: sessionId,
      meeting_provider: "zoom",
      meeting_id: meeting.meetingId,
      meeting_url: meeting.joinUrl,
      status: "requested",
    })
    .select("id")
    .single();

  if (insertError) {
    // The room exists but we can't track it — the webhook would have nothing to
    // update and the 4-minute fallback would never fire. Fail loudly instead of
    // handing over an untracked link.
    console.error("instant-call-create: instant_calls insert failed", insertError.message);
    return json({ error: "call_not_recorded" }, 500);
  }

  // ── 5. Ping Will (best-effort — never blocks the homeowner) ──────────────
  const ping = await sendTelegramMessage(
    (k) => Deno.env.get(k),
    buildContextCard({
      firstName: session.first_name ?? null,
      score: session.guzzler_score ?? null,
      band: analysis?.guzzler_band ?? null,
      verdict: analysis?.recommendation ?? null,
      repairSummary: analysis?.reasoning_summary ?? null,
      startUrl: meeting.startUrl,
    }),
  );

  if (ping.sent) {
    await supabase
      .from("instant_calls")
      .update({ will_notified_at: new Date().toISOString() })
      .eq("id", call.id);
  } else {
    // will_notified_at stays null: the timeout job treats an un-notified call as
    // an immediate fallback candidate rather than making the homeowner wait 4
    // minutes for someone who was never told.
    console.error(`instant-call-create: Will not notified (${ping.reason})`);
  }

  return json({
    available: true,
    instantCallId: call.id,
    joinUrl: meeting.joinUrl,
    willNotified: ping.sent,
  });
});
