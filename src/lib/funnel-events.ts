// Fire-and-forget touchpoint tracking for the CRM command center. Every call is
// best-effort: an event must never block or break the funnel itself, so failures
// (including the table not being migrated yet) are logged and swallowed — the
// same contract as persistEntryIntent / stampQuizCompletedAt in QuizPage.
//
// The only way the browser touches funnel_events. Direct table access is revoked
// for anon (see 20260806000000_funnel_events_gateway.sql): the table used to be
// world-readable, and since it stores quiz_session_id on nearly every row, that
// handed out the UUIDs that the quiz_sessions gateway treats as capabilities.
// Everything funnels through here so no screen can quietly reintroduce a
// `supabase.from("funnel_events")` call.

import { supabase } from "@/integrations/supabase/client";

export type FunnelEventType =
  | "intent_chosen" // step: door ('researching' | 'ready_now' | 'newsletter')
  | "quiz_started"
  | "question_answered" // step: question number as string ("1".."12")
  | "gate_viewed"
  | "contact_submitted"
  | "score_revealed" // metadata: { score }
  | "photo_uploaded" // step: upload slot id; metadata: { tier }
  | "audit_complete" // all 5 slots in (GOLD)
  | "repair_analysis_completed" // step: recommendation; metadata: { regret_score, … }
  | "window_expired_viewed"; // homeowner landed on the expired screen

// Scalars only. The RPC caps the serialized size, and anything structured
// belongs on the lead file rather than in the touchpoint log.
export type FunnelEventMetadata = Record<string, string | number | boolean | null>;

export function trackFunnelEvent(
  quizSessionId: string | null,
  eventType: FunnelEventType,
  step?: string,
  metadata?: FunnelEventMetadata,
) {
  void supabase
    .rpc("funnel_event_create", {
      p_quiz_session_id: quizSessionId,
      p_event_type: eventType,
      p_step: step ?? null,
      p_metadata: metadata ?? {},
    })
    .then(({ error }) => {
      if (error) console.warn("funnel event not recorded:", error.message);
    });
}
