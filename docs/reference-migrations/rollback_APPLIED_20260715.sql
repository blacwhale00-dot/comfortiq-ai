-- DOWN-MIGRATION: reverse the 2026-07-15 wrong-project deploy on ComfortIQ/D.A.V.E
-- (hlzgdlomdwblxalzwurt). Removes ONLY objects created by migrations
-- field_sales_phase1 (20260715102530) and follow_up_engine (20260715102939)
-- plus the session-created vault secret. Verified 2026-07-15: no pre-existing
-- object depends on any of these (no FKs, no views, no triggers).
-- DO NOT RUN without explicit approval.

BEGIN;

-- 1. Cron job created by the session (jobid 2). Pre-existing jobid 1
--    ('send-due-reminders') is untouched.
SELECT cron.unschedule('process-follow-ups')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-follow-ups');
-- Optional: purge its run-history log rows (harmless either way)
DELETE FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'process-follow-ups');

-- 2a. Session-created triggers (all live on session-created tables)
DROP TRIGGER IF EXISTS field_leads_enroll_insert   ON public.field_leads;
DROP TRIGGER IF EXISTS field_leads_enroll_update   ON public.field_leads;
DROP TRIGGER IF EXISTS field_leads_slack_ping      ON public.field_leads;
DROP TRIGGER IF EXISTS field_leads_outcome_stamp   ON public.field_leads;
DROP TRIGGER IF EXISTS field_leads_updated_at      ON public.field_leads;
DROP TRIGGER IF EXISTS follow_up_sequences_updated_at ON public.follow_up_sequences;
DROP TRIGGER IF EXISTS follow_up_messages_updated_at  ON public.follow_up_messages;

-- 2b. Session-created functions (verified absent from all pre-15-Jul
--     migrations and referenced by nothing outside the session objects)
DROP FUNCTION IF EXISTS public.enroll_follow_up();
DROP FUNCTION IF EXISTS public.notify_slack_new_lead();
DROP FUNCTION IF EXISTS public.slack_ping(TEXT);
DROP FUNCTION IF EXISTS public.stamp_outcome_set_at();
DROP FUNCTION IF EXISTS public.set_updated_at();

-- 3. Session-created tables, children first. Contains only the session's own
--    test row ('CLAUDE TEST - Dave Harper', +1555...) and its cascade.
DROP TABLE IF EXISTS public.inbound_messages;
DROP TABLE IF EXISTS public.follow_up_messages;
DROP TABLE IF EXISTS public.follow_up_sequences;
DROP TABLE IF EXISTS public.follow_up_cadence;
DROP TABLE IF EXISTS public.field_leads;

-- 4. Session-created enum types (no remaining columns use them)
DROP TYPE IF EXISTS public.follow_up_msg_status;
DROP TYPE IF EXISTS public.sequence_status;
DROP TYPE IF EXISTS public.msg_channel;
DROP TYPE IF EXISTS public.call_outcome;

-- 5. Storage: the 3 session-added policies on (pre-existing) storage.objects,
--    then the session-created bucket. Bucket verified EMPTY (0 objects); the
--    object delete is belt-and-braces.
DROP POLICY IF EXISTS "Operators upload own lead screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Operators read own lead screenshots"   ON storage.objects;
DROP POLICY IF EXISTS "Operators delete own lead screenshots" ON storage.objects;
DELETE FROM storage.objects WHERE bucket_id = 'lead-screenshots';
DELETE FROM storage.buckets WHERE id = 'lead-screenshots';

-- 6. Vault secret created by the session (a function URL, not key material).
--    The two pre-existing cora_* vault secrets are untouched.
DELETE FROM vault.secrets WHERE name = 'follow_ups_function_url';

-- 7. Migration-history rows for the two session migrations only
DELETE FROM supabase_migrations.schema_migrations
WHERE version IN ('20260715102530', '20260715102939')
  AND name IN ('field_sales_phase1', 'follow_up_engine');

COMMIT;
