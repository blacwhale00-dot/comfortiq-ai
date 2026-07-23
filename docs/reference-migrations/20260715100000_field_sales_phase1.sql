-- Phase 1: field-sales screenshot-to-lead pipeline.
--
-- field_leads is the operator-facing sales table (Will's calls), distinct from
-- the legacy marketplace `leads` table (homeowner/contractor model, unused).
-- Outcome is a Postgres enum so the Phase 2 follow-up trigger conditions can
-- never drift from what the UI writes.

CREATE TYPE public.call_outcome AS ENUM ('sold', 'no_sale', 'follow_up_needed', 'pending_decision');

CREATE TABLE public.field_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id),
  customer_name TEXT,
  phone TEXT,
  email TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  job_number TEXT,
  job_type TEXT,
  -- [{ type, brand, model, serial, install_year }] straight from extraction.
  equipment JSONB NOT NULL DEFAULT '[]',
  notes_visible TEXT,          -- notes extracted from the screenshot
  call_notes TEXT,             -- Will's post-call (voice-transcribed) notes
  outcome public.call_outcome, -- null until set after the call
  outcome_set_at TIMESTAMP WITH TIME ZONE,
  ticket_value NUMERIC,        -- for the recovered-revenue KPI
  opted_out BOOLEAN NOT NULL DEFAULT false,
  screenshot_paths TEXT[] NOT NULL DEFAULT '{}',
  -- Digits-only phone for dedupe; generated so it can never drift from phone.
  phone_normalized TEXT GENERATED ALWAYS AS (regexp_replace(coalesce(phone, ''), '\D', '', 'g')) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dedupe on phone + address (the confirm step upserts against this).
CREATE UNIQUE INDEX field_leads_dedupe
  ON public.field_leads (phone_normalized, lower(coalesce(street_address, '')))
  WHERE phone_normalized <> '';
CREATE INDEX idx_field_leads_outcome ON public.field_leads (outcome, created_at);

-- Operator-only table: no anon access at all (unlike the consumer funnel tables).
ALTER TABLE public.field_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators manage field leads"
  ON public.field_leads FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER field_leads_updated_at
  BEFORE UPDATE ON public.field_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Stamp when the outcome was (re)set — Phase 2 enrollment anchors Day 1 to it.
CREATE OR REPLACE FUNCTION public.stamp_outcome_set_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.outcome IS DISTINCT FROM OLD.outcome THEN
    NEW.outcome_set_at = now();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER field_leads_outcome_stamp
  BEFORE UPDATE OF outcome ON public.field_leads
  FOR EACH ROW EXECUTE FUNCTION public.stamp_outcome_set_at();

-- Private bucket for Successware screenshots. Only the authenticated operator
-- can touch objects under their own uid/ folder.
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-screenshots', 'lead-screenshots', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Operators upload own lead screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lead-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Operators read own lead screenshots"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lead-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Operators delete own lead screenshots"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lead-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Slack ping on every new lead — server-side (AFTER INSERT + pg_net) so it
-- cannot be skipped by a flaky client. Webhook URL lives in Vault under
-- 'slack_webhook_url'; if unset the trigger is a silent no-op so lead capture
-- never breaks on notification plumbing.
CREATE OR REPLACE FUNCTION public.notify_slack_new_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hook TEXT;
BEGIN
  SELECT decrypted_secret INTO hook FROM vault.decrypted_secrets WHERE name = 'slack_webhook_url';
  IF hook IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := hook,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'text',
      '📸 New lead captured: ' || coalesce(NEW.customer_name, 'Unknown')
        || ' — ' || coalesce(NEW.city, '?')
        || ' — ' || coalesce(NEW.job_type, '?')
    )
  );
  RETURN NEW;
END $$;

CREATE TRIGGER field_leads_slack_ping
  AFTER INSERT ON public.field_leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_slack_new_lead();
