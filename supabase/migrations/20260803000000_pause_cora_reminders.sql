-- PAUSE the Cora SMS reminder worker — TCPA compliance hold (approved by Will
-- 2026-08-03).
--
-- Reason: the quiz gate (src/components/quiz/ResultsGate.tsx) collects a
-- required mobile number with NO consent disclosure — no opt-in, no "automated
-- marketing texts", no msg-and-data-rates notice, no STOP instruction — and
-- QuizPage then enrols that number into the 5-message drip automatically. STOP
-- handling / suppression_list is live and correct, but that is the revocation
-- half of TCPA; prior express written consent (the acquisition half) does not
-- exist yet. Today the only thing stopping delivery is the carrier rejecting us
-- for unregistered A2P 10DLC (error 30034) — an accident, not a control. This
-- makes the hold deliberate.
--
-- Deactivate rather than unschedule: the job definition, its schedule and its
-- run history all survive, so resuming is a one-line flip of `active` back to
-- true (see the companion resume migration when consent capture ships).
--
-- NOTE: this stops the worker being INVOKED. It does not stop the client from
-- inserting new pending cora_reminders rows on quiz completion — those keep
-- queueing. Before resuming, expire or purge the accumulated backlog, or every
-- queued reminder fires at once on the first tick after reactivation.
-- Use cron.alter_job() rather than UPDATE cron.job — the catalog table is owned
-- by supabase_admin and a direct UPDATE is permission-denied for the migration
-- role. alter_job is pg_cron's supported API and runs as the job's owner.
DO $$
DECLARE
  target BIGINT;
BEGIN
  SELECT jobid INTO target FROM cron.job WHERE jobname = 'send-due-reminders';

  -- Fail loudly rather than silently reporting a pause that never happened.
  IF target IS NULL THEN
    RAISE EXCEPTION
      'send-due-reminders cron job not found — cannot confirm the worker is paused';
  END IF;

  PERFORM cron.alter_job(target, active := false);

  RAISE NOTICE 'send-due-reminders paused (jobid %)', target;
END $$;
