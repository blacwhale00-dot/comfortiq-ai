-- Harden consent_records: evidence you can forge isn't evidence.
--
-- The table shipped with `FOR INSERT WITH CHECK (true)` and `GRANT ALL TO anon`,
-- so anyone holding the publishable key could insert a row asserting that any
-- phone number or email had consented, with any disclosure text and any
-- timestamp. For the one table whose entire purpose is to prove consent in a
-- TCPA dispute, that undermines the whole point.
--
-- Same shape as the quiz_sessions gateway (20260803050000): revoke direct
-- access, expose one narrow SECURITY DEFINER entry point. The function fixes
-- the fields a caller has no business choosing — the disclosure text and
-- version come from the server, not the request — so a record can only ever
-- describe a disclosure we actually published.

REVOKE ALL ON TABLE public.consent_records FROM anon, authenticated;
DROP POLICY IF EXISTS "Anyone can record their own consent" ON public.consent_records;

-- RLS on with zero policies: nothing reaches the table except the service role.
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- The published disclosure. Mirrors src/lib/sms-consent.ts — when that copy
-- changes, bump the version there AND add the new text here in the same commit.
-- Recording the text server-side is what makes the row trustworthy: the client
-- says *whether* someone consented, never *to what*.
CREATE OR REPLACE FUNCTION public.sms_consent_disclosure(p_version text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_version
    WHEN '2026-08-03.v1' THEN
      'Yes, text me my results and reminders. By checking this box, you agree to '
      'receive automated marketing text messages from ComfortIQ at the mobile '
      'number provided — about 5 messages over 48 hours. Consent is not a '
      'condition of purchase. Message frequency varies and message and data '
      'rates may apply. Reply STOP to cancel or HELP for help. See our Privacy '
      'Policy at /privacy.'
    ELSE NULL
  END;
$$;

-- Record one consent decision. Both outcomes are worth storing: a `false` row
-- is evidence we asked and were told no.
CREATE OR REPLACE FUNCTION public.consent_record_create(
  p_quiz_session_id uuid,
  p_channel         text,
  p_address         text,
  p_consented       boolean,
  p_version         text,
  p_page_url        text DEFAULT NULL,
  p_user_agent      text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  disclosure TEXT;
  new_id     UUID;
BEGIN
  disclosure := public.sms_consent_disclosure(p_version);
  IF disclosure IS NULL THEN
    RAISE EXCEPTION 'unknown consent disclosure version: %', p_version;
  END IF;

  INSERT INTO public.consent_records (
    quiz_session_id, channel, address, consented,
    disclosure_version, disclosure_text, method, page_url, user_agent
  ) VALUES (
    p_quiz_session_id,
    p_channel,
    -- Normalize email so a consent row and a suppression row agree on identity.
    CASE WHEN p_channel = 'email' THEN lower(trim(p_address)) ELSE trim(p_address) END,
    p_consented,
    p_version,
    disclosure,          -- server-supplied, never client-supplied
    'web_form',
    left(p_page_url, 500),
    left(p_user_agent, 500)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consent_record_create(uuid, text, text, boolean, text, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consent_record_create(uuid, text, text, boolean, text, text, text)
  TO anon, authenticated;
