ALTER TABLE public.quiz_sessions
  ADD COLUMN pain_temperature integer DEFAULT NULL,
  ADD COLUMN pain_bills integer DEFAULT NULL,
  ADD COLUMN pain_system_age integer DEFAULT NULL,
  ADD COLUMN pain_emergencies integer DEFAULT NULL,
  ADD COLUMN pain_confusion integer DEFAULT NULL,
  ADD COLUMN pain_health integer DEFAULT NULL,
  ADD COLUMN pain_trust integer DEFAULT NULL,
  ADD COLUMN pain_moisture integer DEFAULT NULL,
  ADD COLUMN pain_financial integer DEFAULT NULL,
  ADD COLUMN pain_confidence integer DEFAULT NULL;