-- Entry-door intent: which of the three landing "intent doors" the homeowner
-- chose on entry -- 'researching' or 'ready_now'. (Door 3 'newsletter' signups
-- are stored as quiz_sessions rows tagged funnel_status = 'newsletter'.) Lets
-- ComfortIQ tier leads (ready-now = hotter) without inferring intent later.
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS entry_intent TEXT;
