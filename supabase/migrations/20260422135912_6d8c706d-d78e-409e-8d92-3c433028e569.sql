ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS residents INTEGER;