-- Close the last anon read path into homeowner PII.
--
-- funnel_events shipped with `USING (true)` SELECT for everyone. The table
-- header says "Rows hold no PII — contact fields stay on quiz_sessions", and
-- that was true when it was written. It stopped being true on 2026-08-03.
--
-- The quiz_sessions gateway (20260803050000) made the session UUID a
-- capability: hold the UUID, read that one row. funnel_events stores
-- quiz_session_id on nearly every row and hands the whole column to anon. So:
--
--   GET  /rest/v1/funnel_events?select=quiz_session_id   -> every session UUID
--   POST /rest/v1/rpc/quiz_session_get {p_id: <uuid>}    -> name, email, phone,
--                                                           address, uploads
--
-- Verified against production on 2026-08-06: a real lead's full contact record
-- came back through this chain using nothing but the publishable key. The
-- capability model is only as private as the least-guarded copy of the UUID,
-- and this was an unauthenticated, enumerable copy of all of them.
--
-- Same shape as the quiz_sessions and consent_records gateways: revoke direct
-- access, RLS on with zero policies, one narrow SECURITY DEFINER entry point
-- for the single thing the browser legitimately does (append one event).

REVOKE ALL ON TABLE public.funnel_events FROM anon, authenticated;
DROP POLICY IF EXISTS "Anyone can read funnel events"   ON public.funnel_events;
DROP POLICY IF EXISTS "Anyone can create a funnel event" ON public.funnel_events;

-- RLS stays enabled with zero policies, so a future GRANT restored by hand
-- still doesn't reopen the table — the same belt-and-braces as quiz_sessions.
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

-- Append one touchpoint. Write-only by construction: it RETURNS void rather
-- than the row, so nothing about existing events can be read back through it,
-- and there is no filter argument to turn it into a query.
--
-- event_type is deliberately not constrained to an enum. The client union in
-- src/lib/funnel-events.ts is the working contract; pinning it here too would
-- mean a migration every time a new touchpoint is added, and the failure mode
-- of an unrecognized event_type is a useless analytics row, not an exposure.
CREATE OR REPLACE FUNCTION public.funnel_event_create(
  p_quiz_session_id uuid,
  p_event_type      text,
  p_step            text DEFAULT NULL,
  p_metadata        jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_event_type IS NULL OR btrim(p_event_type) = '' THEN
    RAISE EXCEPTION 'event_type is required';
  END IF;

  -- Metadata is a small bag of scalars (score, tier, confidence). Anything
  -- larger is either a bug or someone using the log as free storage.
  IF pg_column_size(p_metadata) > 4096 THEN
    RAISE EXCEPTION 'metadata too large';
  END IF;

  INSERT INTO public.funnel_events (quiz_session_id, event_type, step, metadata)
  VALUES (
    p_quiz_session_id,
    left(btrim(p_event_type), 64),
    left(p_step, 64),
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL  ON FUNCTION public.funnel_event_create(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.funnel_event_create(uuid, text, text, jsonb) TO anon, authenticated;

-- Prove the hole is actually closed, in the same transaction that closes it.
-- Applying cleanly IS the confirmation; a mismatch raises and the migration is
-- never recorded as applied.
DO $$
DECLARE
  leftover INTEGER;
BEGIN
  SELECT count(*) INTO leftover
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'funnel_events';
  IF leftover <> 0 THEN
    RAISE EXCEPTION 'funnel_events still has % RLS polic(ies)', leftover;
  END IF;

  SELECT count(*) INTO leftover
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name = 'funnel_events'
    AND grantee IN ('anon', 'authenticated');
  IF leftover <> 0 THEN
    RAISE EXCEPTION 'anon/authenticated still hold % grant(s) on funnel_events', leftover;
  END IF;

  -- The replacement path must actually work for the role that will use it,
  -- or the funnel silently stops logging the moment this deploys.
  IF NOT has_function_privilege(
       'anon',
       'public.funnel_event_create(uuid, text, text, jsonb)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'anon cannot execute funnel_event_create — tracking would go dark';
  END IF;

  RAISE NOTICE 'confirmed: funnel_events is write-only via RPC, readable only by the service role';
END $$;
