-- TCPA consent capture — the acquisition half of SMS compliance.
--
-- suppression_list (20260803010000) handles *revocation*: someone texts STOP and
-- we never contact them again. This handles the other half, which was missing
-- entirely: evidence that the homeowner agreed to be texted in the first place.
-- Until now the quiz collected a required mobile number with no disclosure at
-- all and enrolled it straight into a 5-message marketing drip.
--
-- Two pieces:
--   consent_records          append-only evidence log — the legal artifact
--   quiz_sessions.sms_consent  denormalized flag the send path gates on
--
-- Written create-or-migrate (see 20260803010000 for why the ledger isn't
-- trusted on this project).

-- ---------------------------------------------------------------------------
-- consent_records: append-only. One row per consent decision, capturing the
-- EXACT disclosure text shown. Never UPDATE a row here — a change of mind is a
-- new row, so the history stays intact and auditable. Revocation via STOP is
-- recorded in suppression_list; this table records what was agreed and when.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_records (
  id                 UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_session_id    UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  channel            TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  -- E.164 phone or lowercased email — same convention as suppression_list.
  address            TEXT NOT NULL,
  -- false is meaningful: it records that we asked and they declined.
  consented          BOOLEAN NOT NULL,
  -- Version + verbatim text of what they were shown (src/lib/sms-consent.ts).
  disclosure_version TEXT NOT NULL,
  disclosure_text    TEXT NOT NULL,
  method             TEXT NOT NULL DEFAULT 'web_form'
                       CHECK (method IN ('web_form', 'sms_reply', 'verbal', 'import')),
  page_url           TEXT,   -- where the checkbox was presented
  user_agent         TEXT,   -- browser that submitted it
  -- NOTE: ip_address is intentionally nullable and currently unpopulated. The
  -- browser cannot see its own public IP, so filling this needs the submit to
  -- route through an edge function. Left as a column so that change is additive.
  ip_address         TEXT,
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_session
  ON public.consent_records (quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_lookup
  ON public.consent_records (channel, address, created_at DESC);

-- RLS mirrors cora_reminders: anon may INSERT (the gate writes one at
-- completion) but never read, update or delete. Rows hold phone numbers and
-- email addresses. All reads go through the service role, which bypasses RLS.
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can record their own consent" ON public.consent_records;
CREATE POLICY "Anyone can record their own consent"
  ON public.consent_records FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- quiz_sessions flags: what send-due-reminders actually gates on, so the hot
-- send path is one column read rather than a join into the evidence log.
--
-- DEFAULT false is deliberate and load-bearing: every pre-existing session —
-- including the reminder backlog queued while the worker was paused — becomes
-- non-consented, so none of it can send. Consent has to be affirmatively
-- collected from here on, never assumed retroactively.
-- ---------------------------------------------------------------------------
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS sms_consent_at TIMESTAMP WITH TIME ZONE;
