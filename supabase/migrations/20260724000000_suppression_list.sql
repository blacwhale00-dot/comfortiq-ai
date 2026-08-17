-- Shared SMS suppression list — the single source of truth for opt-outs across
-- every SMS path (Cora reminders now; bookings / conversational Cora later).
-- Written by the sms-inbound webhook when a homeowner texts a STOP-style
-- keyword, and by send-due-reminders when Twilio reports a carrier-level opt-out
-- (code 21610). Every outbound path MUST check this table before sending
-- (Will's §5: "a suppression check runs before *every* send").
CREATE TABLE public.suppression_list (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- E.164, the dedupe + lookup key. UNIQUE gives us the lookup index for free.
  phone        TEXT NOT NULL UNIQUE,
  reason       TEXT NOT NULL DEFAULT 'optout'
                 CHECK (reason IN ('optout', 'bounce', 'complaint', 'manual')),
  source       TEXT,          -- which path recorded it ('sms-inbound', 'send-due-reminders', 'manual')
  last_inbound TEXT,          -- raw inbound body that triggered the opt-out (audit trail)
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Service-role only: this table holds phone numbers + opt-out state. No anon /
-- authenticated policies (Will's standing rule for new tables). The service
-- role bypasses RLS, and both the worker and the inbound webhook use it.
ALTER TABLE public.suppression_list ENABLE ROW LEVEL SECURITY;
