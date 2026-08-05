-- Remove the throwaway session used to verify the standalone landing page
-- (landing/index.html) still works after quiz_sessions moved behind the RPC
-- gateway. That page posts to the REST API directly rather than through the
-- React client, so it needed its own end-to-end check.
--
-- Same reasoning as 20260803080000: the gateway exposes no delete and anon has
-- no table access, so cleanup requires service-role rights. funnel_events rows
-- are removed first — they reference the session but do not cascade.
DELETE FROM public.funnel_events
WHERE quiz_session_id IN (
  SELECT id FROM public.quiz_sessions
  WHERE first_name = 'LandingProbe' AND phone = '+15005550006'
);

DELETE FROM public.quiz_sessions
WHERE first_name = 'LandingProbe' AND phone = '+15005550006';
