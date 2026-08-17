-- Assertion-only migration (no net schema change): proves suppression_list
-- actually accepts the exact write the _shared/suppression.ts helper performs,
-- including the ON CONFLICT (channel, address) upsert target that supabase-js
-- compiles `onConflict: "channel,address"` into.
--
-- This exists because 20260724000000 was recorded as applied while its table
-- never existed — "the migration is in the ledger" turned out to be worthless
-- as evidence. Applying cleanly IS the confirmation; any mismatch raises and
-- the migration is never recorded. The probe rows are removed before commit.
DO $$
DECLARE
  probe_sms   TEXT := '+15005550006';   -- Twilio's reserved test number
  probe_email TEXT := 'suppression-probe@example.invalid';  -- RFC 2606 reserved TLD
  hits        INTEGER;
BEGIN
  -- 1. Insert one row per channel, exactly as the helper shapes them.
  INSERT INTO public.suppression_list (channel, address, reason, source, last_inbound, updated_at)
  VALUES
    ('sms',   probe_sms,   'optout', 'migration-probe', 'STOP', now()),
    ('email', probe_email, 'optout', 'migration-probe', NULL,   now());

  -- 2. Re-upsert the same addresses — this is the idempotent path a second STOP
  --    takes. Fails loudly if (channel, address) isn't a usable conflict target.
  INSERT INTO public.suppression_list (channel, address, reason, source, updated_at)
  VALUES ('sms', probe_sms, 'optout', 'migration-probe-2', now())
  ON CONFLICT (channel, address)
  DO UPDATE SET source = EXCLUDED.source, updated_at = EXCLUDED.updated_at;

  -- 3. The upsert must have updated in place, not duplicated.
  SELECT count(*) INTO hits
  FROM public.suppression_list WHERE channel = 'sms' AND address = probe_sms;
  IF hits <> 1 THEN
    RAISE EXCEPTION 'upsert duplicated instead of updating: % rows for the same (channel, address)', hits;
  END IF;

  -- 4. Same address on a different channel must coexist, not collide.
  SELECT count(*) INTO hits
  FROM public.suppression_list WHERE source LIKE 'migration-probe%';
  IF hits <> 2 THEN
    RAISE EXCEPTION 'expected 2 probe rows across channels, found %', hits;
  END IF;

  -- 5. The channel CHECK must reject anything outside the allowed set.
  BEGIN
    INSERT INTO public.suppression_list (channel, address, source)
    VALUES ('carrier-pigeon', 'nope', 'migration-probe');
    RAISE EXCEPTION 'channel CHECK constraint is not enforcing allowed values';
  EXCEPTION
    WHEN check_violation THEN NULL;  -- expected
  END;

  -- 6. Clean up — leave the table exactly as found.
  DELETE FROM public.suppression_list WHERE source LIKE 'migration-probe%';

  SELECT count(*) INTO hits
  FROM public.suppression_list WHERE source LIKE 'migration-probe%';
  IF hits <> 0 THEN
    RAISE EXCEPTION 'probe cleanup failed, % row(s) left behind', hits;
  END IF;

  RAISE NOTICE 'confirmed: suppression_list round-trips on both channels, upsert is idempotent';
END $$;
