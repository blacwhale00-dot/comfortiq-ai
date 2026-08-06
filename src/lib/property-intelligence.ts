// The only way the browser touches property_intelligence.
//
// Direct table access is revoked for anon (see
// 20260806000100_close_legacy_public_tables.sql). The table previously allowed
// `USING (true)` on SELECT, INSERT and UPDATE, and every row holds a
// street_address next to a quiz_session_id — so it both leaked addresses
// outright and handed out the session UUIDs that the quiz_sessions gateway
// treats as capabilities.
//
// Same contract as quiz-session.ts: each helper resolves rather than throws, so
// a lost write never strands a homeowner mid-quiz, but every failure is LOGGED —
// supabase-js resolves with `{ error }` instead of rejecting, which is how a
// broken write went unnoticed for months.

import { supabase } from "@/integrations/supabase/client";

/** The enrichment fields the scoring step reads back. Deliberately does not
 *  include street_address or zip — nothing in the funnel needs to read an
 *  address back, so the RPC does not return one. */
export interface PropertyIntelligence {
  county_year_built: number | null;
  source_year_built: "County" | "Shovels" | "Zillow" | "EDS" | null;
  permit_silence_years: number | null;
  permit_last_hvac_date: string | null;
  homeowner_reported_system_age: number | null;
}

export interface PropertyIntelligenceInput {
  streetAddress: string | null;
  zipCode: string | null;
  reportedSqft: string | null;
  reportedAge: number | null;
}

/**
 * Create or update the intelligence record for one session.
 *
 * Only homeowner-reported fields are sent. The county/permit data, enrichment
 * confidence, source attributions and lock flags are server-owned — the browser
 * cannot claim that unverified data came from the county.
 */
export async function upsertPropertyIntelligence(
  quizSessionId: string,
  input: PropertyIntelligenceInput,
): Promise<boolean> {
  const { error } = await supabase.rpc("property_intelligence_upsert", {
    p_quiz_session_id: quizSessionId,
    p_street_address: input.streetAddress,
    p_zip_code: input.zipCode,
    p_state: "GA",
    p_reported_sqft: input.reportedSqft,
    p_reported_age: input.reportedAge,
  });
  if (error) {
    console.error("property_intelligence_upsert failed:", error.message);
    return false;
  }
  return true;
}

/**
 * Read the enrichment fields for one session. Returns null when there's no
 * record yet — an expected case, not an error: enrichment runs after the quiz.
 */
export async function getPropertyIntelligence(
  quizSessionId: string,
): Promise<PropertyIntelligence | null> {
  const { data, error } = await supabase.rpc("property_intelligence_get", {
    p_quiz_session_id: quizSessionId,
  });
  if (error) {
    console.error("property_intelligence_get failed:", error.message);
    return null;
  }
  // The RPC returns jsonb, which the generated types widen to Json. The shape is
  // fixed by the function's own projection, not by the caller.
  return (data as unknown as PropertyIntelligence | null) ?? null;
}
