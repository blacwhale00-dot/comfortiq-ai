-- Append-only touchpoint log for the CRM command center. One row per funnel
-- moment (quiz start, each answer, gate, score reveal, each photo, expiry) so
-- drop-off and time-between-steps can be computed exactly, rather than inferred
-- from quiz_sessions.funnel_status (which is a current-state column that
-- overwrites itself as the lead progresses).
--
-- quiz_session_id is nullable: the earliest touchpoints (page view, intent door)
-- can fire before a session row exists. Once the session is created the client
-- passes the id on every subsequent event.
CREATE TABLE public.funnel_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  -- Step detail where it applies: question number for question_answered,
  -- slot id for photo_uploaded, door for intent_chosen.
  step TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_funnel_events_session ON public.funnel_events (quiz_session_id, created_at);
CREATE INDEX idx_funnel_events_type ON public.funnel_events (event_type, created_at);

-- RLS follows the public-funnel-table pattern (quiz_sessions): the anon client
-- inserts as the homeowner moves, and the command-center dashboard reads. Rows
-- hold no PII — contact fields stay on quiz_sessions. No UPDATE/DELETE policies:
-- the log is append-only for everyone but the service role.
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a funnel event"
  ON public.funnel_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read funnel events"
  ON public.funnel_events FOR SELECT
  USING (true);
