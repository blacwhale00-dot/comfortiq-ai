-- Close the quiz_sessions hole: anon could read, modify and destroy EVERY lead.
--
-- Before this, three policies were `USING (true)` / `WITH CHECK (true)` with
-- `GRANT ALL ... TO anon`. Since the publishable key ships inside the JS bundle,
-- anyone could dump every homeowner's name, email, phone and street address —
-- or issue a single UPDATE across all rows (including flipping sms_consent,
-- which is exactly the column send-due-reminders gates sends on).
--
-- The funnel is anonymous by design — a homeowner has no account — so there is
-- no auth.uid() to scope rows to. Instead the session's UUID becomes the
-- capability: you can act on precisely the session whose id you already hold,
-- and on nothing else. Direct table access is revoked and everything goes
-- through these three SECURITY DEFINER functions.
--
-- Threat model, stated plainly: knowing a session UUID grants full control of
-- THAT session. UUIDv4 is unguessable and only ever handed to the browser that
-- created it, so this is a bounded, single-record capability — as opposed to
-- the unbounded access to all rows that it replaces.

-- ---------------------------------------------------------------------------
-- 1. Revoke the blanket access.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read quiz sessions"   ON public.quiz_sessions;
DROP POLICY IF EXISTS "Anyone can update quiz sessions" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Anyone can create a quiz session" ON public.quiz_sessions;

REVOKE ALL ON TABLE public.quiz_sessions FROM anon, authenticated;

-- RLS stays enabled with zero policies: even if a GRANT is restored by a future
-- `supabase db reset` or dashboard action, nothing is reachable without a
-- policy. Defence in depth against exactly the drift that hid the missing
-- suppression_list.
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Read one session by id.
--    Returns the whole row: it is that homeowner's own data, and the caller
--    already proved possession of the id. Returns NULL for an unknown id rather
--    than raising, so a stale localStorage entry degrades quietly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.quiz_session_get(p_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT to_jsonb(q) FROM public.quiz_sessions q WHERE q.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- 3. Create a session.
--    The explicit column list below IS the write contract — a column absent
--    from it cannot be set by any client, now or later. id, created_at and
--    updated_at are deliberately excluded so the server always owns them.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.quiz_session_create(p_patch jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.quiz_sessions AS q (
    first_name, last_name, email, phone, age,
    street_address, city, state, zip_code,
    system_age, square_footage, num_systems, health_conditions, challenges,
    project_tier, solar_interest, total_discount_earned, funnel_status,
    pain_temperature, pain_bills, pain_system_age, pain_emergencies,
    pain_confusion, pain_health, pain_trust, pain_moisture, pain_financial,
    pain_confidence,
    upload_outdoor, upload_breaker, upload_thermostat, upload_air_handler,
    upload_bill,
    roi_report, residents, guzzler_score, guzzler_report, entry_intent,
    quiz_completed_at, lead_source, utm_source, utm_medium, utm_campaign,
    referrer, sms_consent, sms_consent_at
  )
  SELECT
    r.first_name, r.last_name, r.email, r.phone, r.age,
    r.street_address, r.city, r.state, r.zip_code,
    r.system_age, r.square_footage, r.num_systems, r.health_conditions, r.challenges,
    r.project_tier, r.solar_interest, r.total_discount_earned, r.funnel_status,
    r.pain_temperature, r.pain_bills, r.pain_system_age, r.pain_emergencies,
    r.pain_confusion, r.pain_health, r.pain_trust, r.pain_moisture, r.pain_financial,
    r.pain_confidence,
    r.upload_outdoor, r.upload_breaker, r.upload_thermostat, r.upload_air_handler,
    r.upload_bill,
    r.roi_report, r.residents, r.guzzler_score, r.guzzler_report, r.entry_intent,
    r.quiz_completed_at, r.lead_source, r.utm_source, r.utm_medium, r.utm_campaign,
    r.referrer, COALESCE(r.sms_consent, false), r.sms_consent_at
  FROM jsonb_populate_record(NULL::public.quiz_sessions, p_patch) AS r
  RETURNING q.id INTO new_id;

  RETURN new_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Patch one session by id.
--    jsonb_populate_record is seeded with the EXISTING row, so keys absent from
--    the patch keep their current values — this is a merge, not a replace. A
--    caller cannot null out a column simply by omitting it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.quiz_session_update(p_id uuid, p_patch jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.quiz_sessions AS q SET
    first_name = r.first_name, last_name = r.last_name, email = r.email,
    phone = r.phone, age = r.age,
    street_address = r.street_address, city = r.city, state = r.state,
    zip_code = r.zip_code,
    system_age = r.system_age, square_footage = r.square_footage,
    num_systems = r.num_systems, health_conditions = r.health_conditions,
    challenges = r.challenges, project_tier = r.project_tier,
    solar_interest = r.solar_interest,
    total_discount_earned = r.total_discount_earned,
    funnel_status = r.funnel_status,
    pain_temperature = r.pain_temperature, pain_bills = r.pain_bills,
    pain_system_age = r.pain_system_age, pain_emergencies = r.pain_emergencies,
    pain_confusion = r.pain_confusion, pain_health = r.pain_health,
    pain_trust = r.pain_trust, pain_moisture = r.pain_moisture,
    pain_financial = r.pain_financial, pain_confidence = r.pain_confidence,
    upload_outdoor = r.upload_outdoor, upload_breaker = r.upload_breaker,
    upload_thermostat = r.upload_thermostat,
    upload_air_handler = r.upload_air_handler, upload_bill = r.upload_bill,
    roi_report = r.roi_report, residents = r.residents,
    guzzler_score = r.guzzler_score, guzzler_report = r.guzzler_report,
    entry_intent = r.entry_intent, quiz_completed_at = r.quiz_completed_at,
    lead_source = r.lead_source, utm_source = r.utm_source,
    utm_medium = r.utm_medium, utm_campaign = r.utm_campaign,
    referrer = r.referrer,
    sms_consent = r.sms_consent, sms_consent_at = r.sms_consent_at
  FROM jsonb_populate_record(
    (SELECT existing FROM public.quiz_sessions existing WHERE existing.id = p_id),
    p_patch
  ) AS r
  WHERE q.id = p_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Grants. EXECUTE on the gateway, nothing on the table.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.quiz_session_get(uuid)          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.quiz_session_create(jsonb)      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.quiz_session_update(uuid, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.quiz_session_get(uuid)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_session_create(jsonb)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_session_update(uuid, jsonb) TO anon, authenticated;
