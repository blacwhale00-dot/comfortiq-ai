-- Lead-source attribution: where each lead came from — paid ads, a partner /
-- lead seller (e.g. Oncore), organic search, or direct. Captured client-side at
-- first touch (src/lib/lead-source.ts) from UTM params, a ?src= partner ref, or
-- the document referrer, then stamped onto the session when it's created. The
-- command center groups on lead_source; the utm_* columns keep the raw detail
-- for per-campaign drill-down.
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT;

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_lead_source
  ON public.quiz_sessions (lead_source);
