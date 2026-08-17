import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildUrlValidationResponse,
  isValidZoomSignature,
} from "../_shared/zoom-webhook-signature.ts";

// Zoom event receiver. Two jobs:
//   endpoint.url_validation     → the handshake that enables the subscription
//   meeting.participant_joined  → mark the call joined (Will made it)
//   meeting.ended               → status 'held' + queue the auto-recap
//
// Every non-handshake event is signature-verified before it is parsed as
// meaning anything. This webhook mutates lead state and triggers an outbound
// message, so a forged event is a real attack surface.
//
// Deployed with verify_jwt = false (see config.toml) — Zoom can't send a
// Supabase JWT, so ZOOM_WEBHOOK_SECRET is the authentication.
//
// ⚠️ NOT DEPLOYABLE YET — same three blockers as instant-call-create: Will's
// secrets, the unapplied migrations in supabase/migrations-pending/, and the
// approved plan doc.

serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  const secret = Deno.env.get("ZOOM_WEBHOOK_SECRET");
  if (!secret) {
    console.error("zoom-webhook: ZOOM_WEBHOOK_SECRET not configured");
    return new Response("misconfigured", { status: 500 });
  }

  // Read the body ONCE as text — the signature covers the exact bytes Zoom sent.
  const rawBody = await req.text();

  let payload: { event?: string; payload?: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("invalid_json", { status: 400 });
  }

  // ── Handshake ────────────────────────────────────────────────────────────
  // Zoom sends this unsigned when the subscription URL is first saved, and
  // expects the HMAC of plainToken back within 3 seconds.
  if (payload.event === "endpoint.url_validation") {
    const plainToken = (payload.payload as { plainToken?: string } | undefined)?.plainToken;
    if (!plainToken) return new Response("missing_plain_token", { status: 400 });
    const body = await buildUrlValidationResponse(secret, plainToken);
    return new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Authenticate every real event ────────────────────────────────────────
  const valid = await isValidZoomSignature(
    secret,
    rawBody,
    req.headers.get("x-zm-request-timestamp"),
    req.headers.get("x-zm-signature"),
  );
  if (!valid) {
    console.warn("zoom-webhook: rejected request with invalid signature");
    return new Response("invalid_signature", { status: 403 });
  }

  const object = (payload.payload as { object?: Record<string, unknown> } | undefined)?.object;
  const meetingId = object?.id != null ? String(object.id) : null;
  if (!meetingId) return new Response("ok"); // nothing to correlate — ack and drop

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: call } = await supabase
    .from("instant_calls")
    .select("id, quiz_session_id, status")
    .eq("meeting_id", meetingId)
    .maybeSingle();

  if (!call) {
    // A meeting Will started by hand, or one from another environment. Ack so
    // Zoom doesn't retry, but don't invent a row.
    console.warn(`zoom-webhook: no instant_calls row for meeting ${meetingId}`);
    return new Response("ok");
  }

  const now = new Date().toISOString();

  if (payload.event === "meeting.participant_joined") {
    // First join wins; later participants must not overwrite joined_at.
    if (call.status === "requested") {
      await supabase
        .from("instant_calls")
        .update({ status: "will_joined", joined_at: now })
        .eq("id", call.id);
    }
    await logConversation(supabase, call.quiz_session_id, "instant_call_joined", payload.event);
    return new Response("ok");
  }

  if (payload.event === "meeting.ended") {
    // Only a call somebody actually joined is 'held'. One that ended without a
    // join stays on the timeout path so the homeowner still gets the fallback.
    const held = call.status === "will_joined";
    await supabase
      .from("instant_calls")
      .update({
        status: held ? "held" : "timed_out",
        ended_at: now,
        // The recap goes out through the compliance filter on a separate pass,
        // not inline here — a slow send must never make Zoom retry this event.
        recap_pending: held,
      })
      .eq("id", call.id);

    await logConversation(supabase, call.quiz_session_id, "instant_call_ended", payload.event);
    return new Response("ok");
  }

  // Subscribed to something we don't handle yet — ack rather than 4xx so Zoom
  // doesn't disable the subscription.
  return new Response("ok");
});

// The single call shape this helper needs, rather than the whole client type —
// keeps it typed without dragging the supabase-js generics through a Deno file.
interface ConversationLogger {
  from(table: string): {
    insert(row: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
  };
}

// Full audit trail per CORA.md — every automated touch is logged.
async function logConversation(
  supabase: ConversationLogger,
  quizSessionId: string | null,
  kind: string,
  event: string,
) {
  const { error } = await supabase.from("cora_conversations").insert({
    quiz_session_id: quizSessionId,
    direction: "system",
    channel: "zoom",
    message_type: kind,
    body: event,
  });
  if (error) console.warn("zoom-webhook: cora_conversations insert failed", error.message);
}
