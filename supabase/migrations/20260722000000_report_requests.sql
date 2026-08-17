-- The GOLD report handoff, recorded once per session. A homeowner who reaches
-- GOLD (900/900) submits their email on the trophy screen; the send-report edge
-- function (service role) verifies GOLD server-side and writes exactly one row
-- here. This is the seam the Phase 3 "Dynamic PDF Generator" ticket plugs into:
-- rendering the PDF + emailing it flips the row 'requested' -> 'sent' (and fills
-- pdf_url / provider_id / sent_at). Mirrors the cora_reminders design — a
-- dedicated table with a status lifecycle, driven entirely by the service role.
CREATE TABLE public.report_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'rendering', 'sent', 'failed', 'skipped')),
  pdf_url TEXT,
  provider_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- One handoff per session: a re-submit upserts, never duplicates.
  UNIQUE (quiz_session_id)
);

-- Phase 3's pickup query: rows waiting to be rendered/sent.
CREATE INDEX idx_report_requests_status ON public.report_requests (status);

-- RLS: rows hold homeowner emails, so keep them off the public (anon) client
-- entirely. Enabling RLS with NO policy denies anon all access; the send-report
-- edge function uses the service role, which bypasses RLS. Same posture as the
-- read/update side of cora_reminders.
ALTER TABLE public.report_requests ENABLE ROW LEVEL SECURITY;
