-- First-write-wins stamp for the 48h upload window anchor.
--
-- QuizPage previously expressed this as
--   .update({ quiz_completed_at }).eq("id", …).is("quiz_completed_at", null)
-- which the RPC gateway (20260803050000) can't represent: quiz_session_update
-- is an unconditional merge-patch. Emulating it as read-then-write in the
-- browser would introduce a race where a double submit resets the countdown —
-- and the countdown is what Cora's five reminders are anchored to, so a reset
-- would silently re-schedule every one of them.
--
-- Keeping the guard in a single statement preserves the original semantics
-- exactly: the first stamp wins, later calls are no-ops.
CREATE OR REPLACE FUNCTION public.quiz_session_stamp_completed(
  p_id uuid,
  p_completed_at timestamptz
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.quiz_sessions
     SET quiz_completed_at = p_completed_at
   WHERE id = p_id
     AND quiz_completed_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.quiz_session_stamp_completed(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quiz_session_stamp_completed(uuid, timestamptz)
  TO anon, authenticated;
