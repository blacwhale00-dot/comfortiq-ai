// The only way the browser touches quiz_sessions.
//
// Direct table access is revoked for anon (see
// 20260803050000_quiz_session_rpc_gateway.sql). The table previously allowed
// `USING (true)` read and update, which let anyone holding the publishable key
// — it ships in the JS bundle — dump or overwrite every homeowner's record.
// Access is now a capability: you can act on the one session whose UUID you
// hold, and on nothing else.
//
// Everything funnels through here so no screen can quietly reintroduce a
// `supabase.from("quiz_sessions")` call.
//
// Each helper resolves rather than throws, matching how the funnel already
// treats persistence — a lost write must never strand a homeowner mid-quiz.
// Unlike the raw client, though, these LOG every failure: supabase-js resolves
// with `{ error }` instead of rejecting, so `try/catch` around it catches
// nothing, which is how a broken write went unnoticed for months.

import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type QuizSession = Tables<"quiz_sessions">;

// The server owns id/created_at/updated_at; the RPC's column list is the real
// contract, and anything outside it is ignored server-side rather than erroring.
export type QuizSessionPatch = Omit<
  TablesUpdate<"quiz_sessions">,
  "id" | "created_at" | "updated_at"
>;
export type QuizSessionInsert = Omit<
  TablesInsert<"quiz_sessions">,
  "id" | "created_at" | "updated_at"
>;

/**
 * Create a session. Returns its id, or null if the insert failed.
 */
export async function createQuizSession(patch: QuizSessionInsert): Promise<string | null> {
  const { data, error } = await supabase.rpc("quiz_session_create", {
    p_patch: patch as unknown as Json,
  });
  if (error) {
    console.error("quiz_session_create failed:", error.message);
    return null;
  }
  return (data as string) ?? null;
}

/**
 * Read one session by id. Returns null when it doesn't exist — a stale
 * localStorage id is an expected, non-exceptional case.
 */
export async function getQuizSession(id: string): Promise<QuizSession | null> {
  const { data, error } = await supabase.rpc("quiz_session_get", { p_id: id });
  if (error) {
    console.error("quiz_session_get failed:", error.message);
    return null;
  }
  return (data as QuizSession | null) ?? null;
}

/**
 * Merge-patch one session. Keys you omit keep their current values, so a
 * partial update can never blank a column it didn't mention.
 *
 * @returns true if the write succeeded.
 */
export async function updateQuizSession(
  id: string,
  patch: QuizSessionPatch,
): Promise<boolean> {
  const { error } = await supabase.rpc("quiz_session_update", {
    p_id: id,
    p_patch: patch as unknown as Json,
  });
  if (error) {
    console.error("quiz_session_update failed:", error.message);
    return false;
  }
  return true;
}

/**
 * Stamp the quiz-completion time — the anchor for the 48h upload window and,
 * through it, Cora's five reminders.
 *
 * First write wins, enforced in a single statement server-side: a re-submit
 * must never reset the countdown, or every reminder would be rescheduled.
 */
export async function stampQuizCompleted(id: string, completedAt: string): Promise<void> {
  const { error } = await supabase.rpc("quiz_session_stamp_completed", {
    p_id: id,
    p_completed_at: completedAt,
  });
  if (error) console.warn("quiz_completed_at not stamped:", error.message);
}
