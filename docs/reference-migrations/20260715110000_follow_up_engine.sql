-- Phase 2: revenue-recovery follow-up engine, rebuilt on solid ground.
--
-- Enrollment is a Postgres trigger on field_leads.outcome (the Phase 0 failure
-- was client-side persistence — never again). Cadence lives in a config table
-- so Will can tune it without code changes. A pg_cron job invokes the
-- process-follow-ups edge function every 15 minutes; drafts require human
-- approval before anything sends.

CREATE TYPE public.sequence_status AS ENUM ('active', 'paused', 'completed', 'cancelled');
CREATE TYPE public.follow_up_msg_status AS ENUM ('draft', 'approved', 'sent', 'skipped', 'failed');
CREATE TYPE public.msg_channel AS ENUM ('sms');

-- Tunable cadence: which day (after enrollment) each step fires.
CREATE TABLE public.follow_up_cadence (
  step INTEGER PRIMARY KEY CHECK (step >= 1),
  day_offset INTEGER NOT NULL CHECK (day_offset >= 0)
);
INSERT INTO public.follow_up_cadence (step, day_offset)
VALUES (1, 1), (2, 3), (3, 7), (4, 14), (5, 30);

CREATE TABLE public.follow_up_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.field_leads(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1,
  status public.sequence_status NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- When the next step is due. NULL while a draft is waiting on approval.
  next_action_at TIMESTAMP WITH TIME ZONE,
  paused_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_active_sequence_per_lead
  ON public.follow_up_sequences (lead_id) WHERE status = 'active';
CREATE INDEX idx_follow_up_sequences_due
  ON public.follow_up_sequences (status, next_action_at);

CREATE TABLE public.follow_up_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.follow_up_sequences(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  channel public.msg_channel NOT NULL DEFAULT 'sms',
  draft_body TEXT NOT NULL,
  -- What actually goes out (operator may edit before approving).
  final_body TEXT,
  status public.follow_up_msg_status NOT NULL DEFAULT 'draft',
  approved_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  twilio_sid TEXT,
  twilio_status TEXT,
  twilio_error_code TEXT,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, step)
);
CREATE INDEX idx_follow_up_messages_status ON public.follow_up_messages (status, created_at);
CREATE INDEX idx_follow_up_messages_twilio_sid ON public.follow_up_messages (twilio_sid);

-- Inbound SMS thread (customer replies, captured by the Twilio webhook).
CREATE TABLE public.inbound_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.field_leads(id) ON DELETE CASCADE,
  from_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  twilio_sid TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbound_messages_lead ON public.inbound_messages (lead_id, received_at);

-- Operator-only RLS on all engine tables; the worker uses the service role.
ALTER TABLE public.follow_up_cadence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators manage cadence" ON public.follow_up_cadence
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Operators manage sequences" ON public.follow_up_sequences
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Operators manage follow-up messages" ON public.follow_up_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Operators read inbound messages" ON public.inbound_messages
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER follow_up_sequences_updated_at
  BEFORE UPDATE ON public.follow_up_sequences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER follow_up_messages_updated_at
  BEFORE UPDATE ON public.follow_up_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reusable Slack ping (Vault 'slack_webhook_url'; silent no-op when unset).
CREATE OR REPLACE FUNCTION public.slack_ping(message TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hook TEXT;
BEGIN
  SELECT decrypted_secret INTO hook FROM vault.decrypted_secrets WHERE name = 'slack_webhook_url';
  IF hook IS NULL THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := hook,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('text', message)
  );
END $$;

-- Enrollment: the moment a lead's outcome becomes no_sale / pending_decision it
-- enters a sequence (Day-1 step from the cadence table). Marking it sold
-- completes any active sequence and pings Slack with the win.
CREATE OR REPLACE FUNCTION public.enroll_follow_up()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  first_offset INTEGER;
  had_sequence BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.outcome IS NOT DISTINCT FROM OLD.outcome THEN
    RETURN NEW;
  END IF;

  IF NEW.outcome IN ('no_sale', 'pending_decision') AND NOT NEW.opted_out THEN
    SELECT day_offset INTO first_offset FROM public.follow_up_cadence WHERE step = 1;
    INSERT INTO public.follow_up_sequences (lead_id, current_step, status, next_action_at)
    VALUES (NEW.id, 1, 'active', now() + make_interval(days => coalesce(first_offset, 1)))
    ON CONFLICT (lead_id) WHERE status = 'active' DO NOTHING;
  ELSIF NEW.outcome = 'sold' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.follow_up_sequences WHERE lead_id = NEW.id
    ) INTO had_sequence;
    UPDATE public.follow_up_sequences
      SET status = 'completed', next_action_at = NULL, updated_at = now()
      WHERE lead_id = NEW.id AND status IN ('active', 'paused');
    IF had_sequence THEN
      PERFORM public.slack_ping(
        '🏆 Lead recovered: ' || coalesce(NEW.customer_name, 'Unknown')
        || CASE WHEN NEW.ticket_value IS NOT NULL
                THEN ' — $' || to_char(NEW.ticket_value, 'FM999,999,990')
                ELSE '' END);
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER field_leads_enroll_insert
  AFTER INSERT ON public.field_leads
  FOR EACH ROW WHEN (NEW.outcome IS NOT NULL)
  EXECUTE FUNCTION public.enroll_follow_up();
CREATE TRIGGER field_leads_enroll_update
  AFTER UPDATE OF outcome ON public.field_leads
  FOR EACH ROW EXECUTE FUNCTION public.enroll_follow_up();

-- Scheduler: every 15 minutes, invoke the process-follow-ups edge function.
-- URL + service key come from Vault (same pattern as send-due-reminders — and
-- this time the secrets are seeded in the same change, so it can never repeat
-- the June 30 silent-failure mode).
SELECT cron.unschedule('process-follow-ups')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-follow-ups');

SELECT cron.schedule(
  'process-follow-ups',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets
            WHERE name = 'follow_ups_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets
                                     WHERE name = 'cora_reminders_service_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
