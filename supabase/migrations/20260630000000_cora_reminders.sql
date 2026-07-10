-- Cora's 5 reminder SMS messages, frozen at quiz completion. The TS engine
-- (src/lib/cora-reminders.ts) is the source of truth for the copy + send_at;
-- both are written verbatim into each row so the worker never recomputes
-- anything. The send-due-reminders edge function (service role) reads pending
-- rows where send_at <= now() and transitions them to sent / failed / skipped.
CREATE TABLE public.cora_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  milestone TEXT NOT NULL
    CHECK (milestone IN ('immediate', 'halfway', 'urgent', 'final_hour', 'expired')),
  message TEXT NOT NULL,
  send_at TIMESTAMP WITH TIME ZONE NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  sent_at TIMESTAMP WITH TIME ZONE,
  provider_sid TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Idempotent persist: re-submitting the quiz is a no-op, never a duplicate.
  UNIQUE (quiz_session_id, milestone)
);

-- The worker's hot query: pending rows that are due (status, send_at).
CREATE INDEX idx_cora_reminders_due ON public.cora_reminders (status, send_at);
CREATE INDEX idx_cora_reminders_quiz_session_id ON public.cora_reminders (quiz_session_id);

-- RLS: tighter than the public funnel tables, since rows hold phone numbers and
-- message bodies. The anon client may only INSERT (persist at completion); all
-- reads and updates go through the service role, which bypasses RLS.
ALTER TABLE public.cora_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a cora reminder"
  ON public.cora_reminders FOR INSERT
  WITH CHECK (true);
