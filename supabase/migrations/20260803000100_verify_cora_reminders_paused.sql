-- Assertion-only migration (no schema change): proves the TCPA compliance hold
-- in 20260803000000_pause_cora_reminders.sql actually took effect on the remote
-- database. Applying cleanly IS the confirmation — if the worker were still
-- armed this migration would fail and never be recorded.
DO $$
DECLARE
  is_active BOOLEAN;
  sched     TEXT;
BEGIN
  SELECT active, schedule INTO is_active, sched
  FROM cron.job WHERE jobname = 'send-due-reminders';

  IF is_active IS NULL THEN
    RAISE EXCEPTION 'send-due-reminders cron job is missing entirely';
  END IF;

  IF is_active THEN
    RAISE EXCEPTION
      'send-due-reminders is STILL ACTIVE (schedule %) — the pause did not take', sched;
  END IF;

  RAISE NOTICE 'confirmed: send-due-reminders is paused (schedule % retained)', sched;
END $$;
