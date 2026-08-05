-- Remove the throwaway session used to verify the RPC gateway end to end
-- (create → read → merge-patch → first-write-wins stamp → consent record).
--
-- The gateway deliberately exposes no delete, and anon has no direct table
-- access, so the probe row can only be cleared with service-role rights —
-- i.e. from a migration. consent_records cascades via quiz_session_id.
--
-- Scoped by the probe's exact marker rather than by id so it stays harmless if
-- re-run against a database that never had it.
DELETE FROM public.quiz_sessions
WHERE first_name = 'GatewayProbe'
  AND email = 'probe@example.invalid';
