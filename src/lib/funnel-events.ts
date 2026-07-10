// Fire-and-forget touchpoint tracking for the CRM command center. Every call is
// best-effort: an event must never block or break the funnel itself, so failures
// (including the table not being migrated yet) are logged and swallowed — the
// same contract as persistEntryIntent / stampQuizCompletedAt in QuizPage.

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
  | "window_expired_viewed"; // homeowner landed on the expired screen

export function trackFunnelEvent(
  quizSessionId: string | null,
  eventType: FunnelEventType,
  step?: string,
  metadata?: Record<string, string | number | boolean>,
) {
  void supabase
    .from("funnel_events")
    .insert({
      quiz_session_id: quizSessionId,
      event_type: eventType,
      step: step ?? null,
      metadata: metadata ?? {},
    })
    .then(({ error }) => {
      if (error) console.warn("funnel event not recorded:", error.message);
    });
}
