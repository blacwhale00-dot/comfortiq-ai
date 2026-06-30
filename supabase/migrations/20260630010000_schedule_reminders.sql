-- Run the Cora SMS worker every ~5 minutes. pg_cron invokes the
-- send-due-reminders edge function over HTTP via pg_net. Both extensions ship
-- with Supabase but must be enabled once.
--
-- The function URL and service-role key are read from Supabase Vault so no
-- secret is hard-coded here. Set them once before this schedule can fire
-- (Dashboard -> Project Settings -> Vault, or via SQL):
--   select vault.create_secret(
--     'https://<project-ref>.functions.supabase.co/send-due-reminders',
--     'cora_reminders_function_url');
--   select vault.create_secret('<service-role-key>', 'cora_reminders_service_key');
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop any prior definition first so this migration is safely re-runnable.
SELECT cron.unschedule('send-due-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-due-reminders');

SELECT cron.schedule(
  'send-due-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets
            WHERE name = 'cora_reminders_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets
                                     WHERE name = 'cora_reminders_service_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
