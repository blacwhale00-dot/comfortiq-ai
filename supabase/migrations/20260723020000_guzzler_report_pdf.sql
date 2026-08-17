-- Phase 3 "Dynamic PDF Generator" support.
--
-- 1. Persist the engine's reveal payload (GuzzlerRevealData) at quiz completion
--    so the GOLD PDF renders from the EXACT values the score screen showed —
--    score, grade, category breakdown, monthly waste, top drivers. No scoring
--    logic is duplicated in the edge function; it just reads these values back.
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS guzzler_report JSONB;

-- 2. Allow a 'generated' state on report_requests: PDF built + stored but not yet
--    emailed (e.g. before the email provider key is configured). 'sent' still
--    means the homeowner was actually emailed.
ALTER TABLE public.report_requests
  DROP CONSTRAINT IF EXISTS report_requests_status_check;
ALTER TABLE public.report_requests
  ADD CONSTRAINT report_requests_status_check
  CHECK (status IN ('requested', 'rendering', 'generated', 'sent', 'failed', 'skipped'));

-- 3. Private bucket for the rendered PDFs. Not public — the file is emailed as an
--    attachment; the service-role edge function is the only writer/reader (it
--    bypasses storage RLS), so no anon policies are needed.
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-reports', 'pdf-reports', false)
ON CONFLICT (id) DO NOTHING;
