-- Everything else in ComfortIQ's own schema that anon can still reach.
--
-- Found while verifying 20260806000000: funnel_events was not the only table
-- carrying `USING (true)`, and closing it alone did NOT close the enumeration
-- chain it was part of. Rather than fix the one that was demonstrated and leave
-- the rest for the next audit, this closes every remaining public read path we
-- own. Each section says what was open and why it is safe to close.
--
-- SCOPE — this database is shared with D.A.V.E.
-- Roughly a dozen tables here belong to D.A.V.E, not ComfortIQ (agent_activity,
-- closed_deals, equipment_options, market_data, messages, prolinkhub, proposals,
-- quiz_answers, quiz_questions, quiz_results, sessions, systems). Several are
-- anon-readable. They are deliberately NOT touched: we don't own their access
-- model, and D.A.V.E's own front end may read them with the anon key — revoking
-- would break another live product to fix a risk that isn't ours to assess.
-- They are reported upward instead. Every table below is one ComfortIQ created.
--
-- Deliberately left open, ours and correct:
--   • rebate_programs / repair_calc_config — public reference data (rebate rules,
--     cost thresholds), no PII, read straight from the browser by the
--     repair-vs-replace calculator. Reads stay; writes were never granted.
-- Nothing else is left open. Note that cora_reminders and repair_history are
-- NOT in that list even though their policies were already INSERT-only: a
-- policy without a matching grant is half a lock, and §2 closes the other half.

-- ---------------------------------------------------------------------------
-- 1. property_intelligence — the hole that survived 20260806000000.
--
-- Shipped with all three of SELECT / INSERT / UPDATE as `USING (true)`
-- (20260422114854). Verified against production on 2026-08-06: it returns real
-- rows to the anon key, and every row carries BOTH a quiz_session_id and a
-- street_address. That makes it worse than funnel_events was — it leaks the
-- homeowner's address directly, and it re-opens the exact capability-enumeration
-- chain that migration closed, because it hands out the same session UUIDs.
-- The open UPDATE also let anyone rewrite any lead's address or lock flags.
--
-- The browser has two legitimate needs here, so this exposes exactly two narrow
-- functions and nothing else.
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.property_intelligence FROM anon, authenticated;
DROP POLICY IF EXISTS "Anyone can read property intelligence"   ON public.property_intelligence;
DROP POLICY IF EXISTS "Anyone can create property intelligence" ON public.property_intelligence;
DROP POLICY IF EXISTS "Anyone can update property intelligence" ON public.property_intelligence;
ALTER TABLE public.property_intelligence ENABLE ROW LEVEL SECURITY;

-- Write path: create-or-update the record for one session. The caller supplies
-- only what a homeowner actually reports about their own property. Everything
-- that makes an intelligence record TRUSTWORTHY — the county/permit fields, the
-- enrichment confidence, the source attributions and the lock flags — is
-- server-owned and unreachable from here, so a caller can no longer assert that
-- unverified data came from the county.
--
-- The enforce_property_intelligence_rules() trigger still fires on both paths;
-- SECURITY DEFINER changes who is doing the write, not which triggers run.
CREATE OR REPLACE FUNCTION public.property_intelligence_upsert(
  p_quiz_session_id uuid,
  p_street_address  text DEFAULT NULL,
  p_zip_code        text DEFAULT NULL,
  p_state           text DEFAULT 'GA',
  p_reported_sqft   text DEFAULT NULL,
  p_reported_age    integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_quiz_session_id IS NULL THEN
    RAISE EXCEPTION 'quiz_session_id is required';
  END IF;

  UPDATE public.property_intelligence
  SET street_address                = left(p_street_address, 250),
      zip_code                      = left(p_zip_code, 20),
      state                         = left(p_state, 2),
      homeowner_reported_sqft       = left(p_reported_sqft, 40),
      homeowner_reported_system_age = p_reported_age,
      updated_at                    = now()
  WHERE quiz_session_id = p_quiz_session_id;

  IF NOT FOUND THEN
    INSERT INTO public.property_intelligence (
      quiz_session_id, street_address, zip_code, state,
      homeowner_reported_sqft, homeowner_reported_system_age
    ) VALUES (
      p_quiz_session_id,
      left(p_street_address, 250),
      left(p_zip_code, 20),
      left(p_state, 2),
      left(p_reported_sqft, 40),
      p_reported_age
    );
  END IF;
END;
$$;

-- Read path: the scoring step needs the enrichment fields for the session it is
-- scoring. Same capability model as quiz_session_get — hold the UUID, read that
-- one row — but returning strictly less: street_address, zip and raw_payload are
-- NOT in the projection, because nothing in the funnel needs to read an address
-- back and a read path that can't return it can't leak it.
CREATE OR REPLACE FUNCTION public.property_intelligence_get(p_quiz_session_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT to_jsonb(t) FROM (
    SELECT county_year_built,
           source_year_built,
           permit_silence_years,
           permit_last_hvac_date,
           homeowner_reported_system_age
    FROM public.property_intelligence
    WHERE quiz_session_id = p_quiz_session_id
    LIMIT 1
  ) t;
$$;

REVOKE ALL ON FUNCTION public.property_intelligence_upsert(uuid, text, text, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.property_intelligence_get(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.property_intelligence_upsert(uuid, text, text, text, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.property_intelligence_get(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. repair_replace_analysis — the same enumeration hole, not yet exploitable.
--
-- Shipped with both `FOR INSERT WITH CHECK (true)` and `FOR SELECT USING (true)`
-- (20260723000000), and it stores quiz_session_id. Empty today only because no
-- homeowner has completed a repair analysis yet; the first one would have
-- reopened the chain silently.
--
-- The browser genuinely inserts here (RepairHistoryChat persists the analysis
-- run), so unlike funnel_events the INSERT stays. Only the read goes.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'repair_replace_analysis'
      AND cmd IN ('SELECT', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.repair_replace_analysis', pol.policyname);
  END LOOP;
END $$;

REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.repair_replace_analysis FROM anon, authenticated;
GRANT INSERT ON TABLE public.repair_replace_analysis TO anon, authenticated;

-- Same treatment for repair_history and cora_reminders. Both already have
-- INSERT-only policies and no SELECT policy — but a policy is only half the
-- lock. The table GRANT still carries SELECT on both, so PostgREST answers 200
-- (an RLS-filtered empty array) rather than 403, and the moment a policy is
-- dropped or loosened by accident the rows are simply readable. cora_reminders
-- in particular holds phone numbers and the message bodies queued to them.
--
-- Both are written from the browser and read only by send-due-reminders under
-- the service role, so INSERT stays and everything else goes.
REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.repair_history FROM anon, authenticated;
GRANT INSERT ON TABLE public.repair_history TO anon, authenticated;

REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.cora_reminders FROM anon, authenticated;
GRANT INSERT ON TABLE public.cora_reminders TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. The legacy Lovable-era tables — unused, and wide open.
--
-- leads, appointments, photos, contractors and homeowners predate the funnel
-- (supabase-schema.sql) and carry `Public can view/insert/update` policies with
-- USING (true). `leads` in particular is SELECT + INSERT + UPDATE to anyone
-- holding the publishable key.
--
-- Nothing in src/ or supabase/functions/ references any of them — quiz_sessions
-- is the operative lead record, as noted at the top of 20260723000000. They are
-- empty. Revoking access rather than dropping them: they may still hold
-- something in a branch or a backup, and DROP is irreversible on a database
-- whose migration ledger has already drifted twice. Dropping them is a separate,
-- deliberate decision.
--
-- (communications from that schema was never created here; the loop skips
-- anything absent rather than failing.)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'leads', 'appointments', 'photos', 'contractors', 'homeowners', 'communications'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl
    ) THEN
      RAISE NOTICE 'skipping %, not present on this database', tbl;
      CONTINUE;
    END IF;

    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, tbl);
    END LOOP;

    -- RLS on with zero policies, plus the grant revoked: the same two
    -- independent locks used on quiz_sessions.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', tbl);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Grant hygiene on the two service-role-only tables.
--
-- suppression_list and report_requests already have RLS enabled with no
-- policies, so reads come back empty — but the GRANT to anon survives and
-- PostgREST answers 200 rather than 403. They hold opted-out phone numbers and
-- requester email addresses. Neither is touched from the browser; both are
-- written by edge functions under the service role.
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.suppression_list FROM anon, authenticated;
REVOKE ALL ON TABLE public.report_requests  FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Assert the end state across every table ComfortIQ owns.
--
-- This is the check that would have caught funnel_events months ago, so it is
-- written as a standing invariant rather than a one-off cleanup. When a table we
-- own legitimately needs public read, add it to `allowed` in the same migration
-- that opens it — which forces the decision to be explicit and reviewable.
--
-- The list is ours-only by design (see the SCOPE note at the top). An invariant
-- over all of `public` would fail on D.A.V.E's tables, and the fix for that is a
-- conversation with D.A.V.E's owner, not a REVOKE from this migration.
-- ---------------------------------------------------------------------------
-- Deliberately NOT written against information_schema.role_table_grants. That
-- view only exposes grants where the querying role is the grantor, the grantee,
-- or a member of one of them — so it can under-report and quietly pass. Its
-- columns are also sql_identifier domains rather than text, which makes
-- aggregation over them fragile. has_table_privilege() asks the catalog for the
-- EFFECTIVE privilege, including anything inherited via PUBLIC, which is the
-- actual question: can the anon key read this table.
DO $$
DECLARE
  tbl       TEXT;
  offenders TEXT[] := '{}';
  ours TEXT[] := ARRAY[
    'quiz_sessions', 'consent_records', 'funnel_events', 'cora_reminders',
    'suppression_list', 'report_requests', 'repair_history',
    'repair_replace_analysis', 'property_intelligence',
    'leads', 'appointments', 'photos', 'contractors', 'homeowners'
  ];
  allowed TEXT[] := ARRAY['rebate_programs', 'repair_calc_config'];
BEGIN
  FOREACH tbl IN ARRAY ours LOOP
    CONTINUE WHEN tbl = ANY (allowed);
    -- Skip anything not on this database (the legacy set is uneven here).
    CONTINUE WHEN to_regclass('public.' || quote_ident(tbl)) IS NULL;

    IF has_table_privilege('anon',          'public.' || quote_ident(tbl), 'SELECT')
    OR has_table_privilege('authenticated', 'public.' || quote_ident(tbl), 'SELECT') THEN
      offenders := offenders || tbl;
    END IF;
  END LOOP;

  IF array_length(offenders, 1) > 0 THEN
    RAISE EXCEPTION 'anon/authenticated still hold SELECT on ComfortIQ tables: %',
      array_to_string(offenders, ', ');
  END IF;

  -- The replacement paths must work for the role that will use them, or the
  -- funnel breaks silently the moment this deploys.
  IF NOT has_function_privilege('anon',
        'public.property_intelligence_upsert(uuid, text, text, text, text, integer)', 'EXECUTE')
     OR NOT has_function_privilege('anon',
        'public.property_intelligence_get(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon cannot execute the property_intelligence gateway';
  END IF;

  RAISE NOTICE 'confirmed: no anon-readable ComfortIQ table outside the reference allowlist';
END $$;
