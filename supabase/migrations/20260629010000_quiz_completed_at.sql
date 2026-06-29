-- When the homeowner completed the quiz -- the anchor for the 48-hour photo
-- upload window (see src/lib/guzzler-timer.ts). First-write-wins from the app, so
-- the countdown never resets. Null until the quiz is finished; the timer falls
-- back to created_at when this is absent.
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS quiz_completed_at TIMESTAMP WITH TIME ZONE;
