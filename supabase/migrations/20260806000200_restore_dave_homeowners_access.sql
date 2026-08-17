-- Revert this project's changes to public.homeowners. It is D.A.V.E's table,
-- not ours, and 20260806000100 should never have touched it.
--
-- WHAT HAPPENED
-- That migration locked down a set of "legacy Lovable-era, unused" tables. The
-- list was built from supabase-schema.sql plus a grep showing nothing in src/ or
-- supabase/functions/ referenced them. homeowners passed both tests — nothing in
-- ComfortIQ reads or writes it, and 20260723000000 explicitly calls it "an
-- unused table". Both facts are true and both are irrelevant: D.A.V.E's RLS
-- policies reference homeowners from inside their USING clauses, and a policy
-- that reads a table the caller has no SELECT on fails the whole query.
--
-- Verified from outside with the publishable key, immediately after the push:
-- quiz_answers, quiz_results, sessions, messages and systems all went from
-- "200 []" to "42501 permission denied for table homeowners". Five of D.A.V.E's
-- tables, unreadable, because of a REVOKE in ComfortIQ's migration.
--
-- WHY THE GREP WASN'T ENOUGH
-- "No code in THIS repo touches it" is not the same as "nothing touches it" on a
-- shared database, and it says nothing at all about whether another product's
-- policies depend on it. Grant changes on a shared database need to be checked
-- against the catalog's policy definitions, not one repo's source.
--
-- WHAT THIS DOES
-- Restores anon/authenticated read access so D.A.V.E behaves exactly as it did
-- before the push. The permissive SELECT policy is a RECONSTRUCTION — the
-- original policy definitions were dropped by that migration's cleanup loop and
-- are not recoverable from this repo, because D.A.V.E's migrations live
-- elsewhere. It matches the era's pattern (the same `USING (true)` shape every
-- other table from that generation carries) and it restores the observable
-- behavior, but D.A.V.E's owner should confirm it against their own migrations.
--
-- homeowners is empty on this database, so no data was exposed while it was
-- locked and none is exposed by restoring it.

GRANT SELECT ON TABLE public.homeowners TO anon, authenticated;

-- RLS stays enabled; this re-adds the read path the dropped policy provided.
ALTER TABLE public.homeowners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view homeowners" ON public.homeowners;
CREATE POLICY "Public can view homeowners"
  ON public.homeowners FOR SELECT
  USING (true);

-- NOTE FOR FUTURE LOCKDOWNS
-- The invariant in 20260806000100 lists homeowners under `ours`. It is not ours.
-- Any future migration that re-asserts that invariant must drop homeowners from
-- the list, or it will fail against this restore — correctly, because the two
-- statements genuinely contradict each other. The ComfortIQ-owned set is the
-- eleven tables created by this repo's own migrations, plus the four genuinely
-- dead ones from supabase-schema.sql (leads, appointments, photos, contractors),
-- which are confirmed still locked and are NOT referenced by D.A.V.E's policies.

DO $$
BEGIN
  IF NOT has_table_privilege('anon', 'public.homeowners', 'SELECT') THEN
    RAISE EXCEPTION 'homeowners is still unreadable by anon — D.A.V.E stays broken';
  END IF;

  -- The four tables this migration does NOT restore must remain locked, or the
  -- revert has quietly gone further than intended.
  IF has_table_privilege('anon', 'public.leads', 'SELECT')
  OR has_table_privilege('anon', 'public.appointments', 'SELECT')
  OR has_table_privilege('anon', 'public.photos', 'SELECT')
  OR has_table_privilege('anon', 'public.contractors', 'SELECT') THEN
    RAISE EXCEPTION 'the genuinely-dead legacy tables must stay revoked';
  END IF;

  RAISE NOTICE 'confirmed: homeowners restored for D.A.V.E, legacy tables still closed';
END $$;
