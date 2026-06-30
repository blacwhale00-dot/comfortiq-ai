-- Persist the computed Guzzler Score (0-100) on the session so the score reveal
-- can be re-shown later -- e.g. the incomplete/expired funnel screen -- without
-- recomputing. Null until the quiz is finalized and scored.
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS guzzler_score INTEGER;
