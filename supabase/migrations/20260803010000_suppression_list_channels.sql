-- Establish suppression_list in its channel-aware shape: a single table that is
-- the source of truth for opt-outs across SMS *and* email (and any future
-- channel). (channel, address) is the natural key — `address` holds an E.164
-- phone for channel='sms' and a lowercased email for channel='email'.
-- Normalization is centralized in supabase/functions/_shared/suppression.ts so
-- every caller agrees on what "same address" means.
--
-- WHY THIS IS CREATE-OR-MIGRATE, not a plain ALTER:
-- Migration 20260724000000_suppression_list.sql is recorded as applied in
-- supabase_migrations.schema_migrations, but the table it declares DOES NOT
-- EXIST on this database (verified 2026-08-03 via `supabase db dump --schema
-- public`). The history on this project has drifted in both directions —
-- funnel_events is the mirror image, present in the schema but recorded as
-- unapplied. So this migration trusts the live catalog, not the ledger:
--   • table absent            → create it in the final channel/address shape
--   • table present w/ phone  → migrate it forward, backfilling channel='sms'
--   • table already migrated  → no-op
-- That makes it safe to run whatever state any given environment is in.
--
-- Consequence of the phantom table, for the record: every suppression write
-- from sms-inbound has been failing against a missing relation, and the
-- pre-send check in send-due-reminders was failing *open*. Both are addressed
-- here and in the accompanying _shared/suppression.ts (which fails closed).

DO $$
DECLARE
  has_table  BOOLEAN;
  has_phone  BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'suppression_list'
  ) INTO has_table;

  IF NOT has_table THEN
    CREATE TABLE public.suppression_list (
      id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      channel      TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
      -- E.164 phone or lowercased email, per `channel`.
      address      TEXT NOT NULL,
      reason       TEXT NOT NULL DEFAULT 'optout'
                     CHECK (reason IN ('optout', 'bounce', 'complaint', 'manual')),
      source       TEXT,          -- which path recorded it ('sms-inbound', 'send-due-reminders', 'manual')
      last_inbound TEXT,          -- raw inbound body that triggered it (audit trail)
      created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    RAISE NOTICE 'suppression_list created in channel/address shape';

  ELSE
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'suppression_list'
        AND column_name = 'phone'
    ) INTO has_phone;

    IF has_phone THEN
      ALTER TABLE public.suppression_list ADD COLUMN IF NOT EXISTS channel TEXT;
      ALTER TABLE public.suppression_list ADD COLUMN IF NOT EXISTS address TEXT;

      -- Every pre-existing row is a phone opt-out from the SMS rail.
      UPDATE public.suppression_list
      SET channel = 'sms', address = phone
      WHERE address IS NULL;

      ALTER TABLE public.suppression_list ALTER COLUMN channel SET NOT NULL;
      ALTER TABLE public.suppression_list ALTER COLUMN address SET NOT NULL;
      ALTER TABLE public.suppression_list
        ADD CONSTRAINT suppression_list_channel_check CHECK (channel IN ('sms', 'email'));

      -- Drops the old phone UNIQUE constraint/index along with the column.
      ALTER TABLE public.suppression_list DROP COLUMN phone;
      RAISE NOTICE 'suppression_list migrated from phone-keyed to channel/address';
    ELSE
      RAISE NOTICE 'suppression_list already in channel/address shape — no change';
    END IF;
  END IF;
END $$;

-- The dedupe + lookup key, and the ON CONFLICT target for every upsert path.
CREATE UNIQUE INDEX IF NOT EXISTS suppression_list_channel_address_key
  ON public.suppression_list (channel, address);

-- Service-role only: the table holds phone numbers, email addresses and opt-out
-- state. No anon/authenticated policies (Will's standing rule for new tables).
-- Both the worker and the inbound webhook use the service role, which bypasses
-- RLS; with RLS on and zero policies, nothing else can read it.
ALTER TABLE public.suppression_list ENABLE ROW LEVEL SECURITY;
