-- Audit trail for the transactional-send exception (Will's ruling, 2026-08-03):
-- "a report they explicitly requested is transactional, not marketing. One-time
-- send, no re-enrollment in any sequence, log it."
--
-- So send-report may deliver to an address that is on suppression_list — but
-- ONLY because the homeowner actively clicked "Send My Report" for that specific
-- session, and every such send is recorded here rather than happening invisibly.
--
-- SCOPE: this exception is send-report's alone. The Priority-3 marketing emails
-- (score delivery, booking confirmation, consent confirmation) must keep hard-
-- blocking on suppression — an unsubscribe still means no marketing, ever.

ALTER TABLE public.report_requests
  ADD COLUMN IF NOT EXISTS suppression_override BOOLEAN NOT NULL DEFAULT false;

-- When the override fired, for the audit trail. Null when it didn't.
ALTER TABLE public.report_requests
  ADD COLUMN IF NOT EXISTS suppression_override_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.report_requests.suppression_override IS
  'True when this report was delivered to an address on suppression_list, permitted because the homeowner explicitly requested it (transactional, not marketing). Never set implicitly.';
