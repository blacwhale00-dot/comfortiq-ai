// Single source of truth for the Guzzler *band* vocabulary and its numeric
// encoding for the Cora mascot's Rive state machine.
//
// ⚠️ READ THIS BEFORE CHANGING ANYTHING HERE — the app currently carries TWO
// severity systems with DIFFERENT thresholds, and they disagree:
//
//   tierForScore  (src/lib/guzzler-score.ts)   Mild <35 · Moderate 35–59 · High 60–79 · Severe ≥80
//   bandForScore  (this module, moved here)    sipping ≤25 · steady ≤50 · drinking ≤75 · bleeding >75
//
// They diverge for scores 26–34, 51–59 and 76–79. The score reveal paints its
// gauge from the *tier* (TIER_PRESENTATION in components/quiz/guzzler-tiers.ts),
// so driving the mascot's `band` input from bandForScore would let the mascot's
// arc glow a different severity than the gauge sitting next to it — on the most
// important screen in the funnel.
//
// Until Will rules on which thresholds the four bands own (see the 17-08 brief,
// acceptance criterion "Reveal band color matches the computed score band"),
// presentation surfaces derive the band from the tier via bandForTier() so the
// mascot can never contradict what the homeowner is looking at. The
// repair-vs-replace calculator keeps using bandForScore() — its behavior is
// unchanged by this module, which only gave the function a permanent home.
//
// When the ruling lands, ONE of these two functions changes and the tests in
// src/test/guzzler-band.test.ts show exactly which scores move.

import type { GuzzlerBand } from "@/lib/repair-replace";
import type { GuzzlerTier } from "@/components/quiz/guzzler-tiers";

export type { GuzzlerBand };

// Least → most severe. The array index IS the number the .riv state machine's
// `band` input expects (0 = Sipping … 3 = Bleeding), per the delivery contract.
export const BAND_ORDER = ["sipping", "steady", "drinking", "bleeding"] as const;

/** Numeric encoding of a band for the Rive `band` input. Null bands read as 0. */
export function riveBandIndex(band: GuzzlerBand | null | undefined): number {
  if (!band) return 0;
  const i = BAND_ORDER.indexOf(band);
  return i === -1 ? 0 : i;
}

/**
 * Band from a raw 0–100 score. Unchanged from the original definition in
 * RepairHistoryChat — the repair-vs-replace math depends on these exact cuts.
 */
export function bandForScore(score: number | null): GuzzlerBand | null {
  if (score == null) return null;
  if (score <= 25) return "sipping";
  if (score <= 50) return "steady";
  if (score <= 75) return "drinking";
  return "bleeding";
}

/**
 * Band from a presentation tier — a pure 1:1 rename, no thresholds of its own.
 * Use this anywhere the band is shown next to tier-colored UI so the two can
 * never disagree.
 */
export function bandForTier(tier: GuzzlerTier): GuzzlerBand {
  switch (tier) {
    case "Mild":
      return "sipping";
    case "Moderate":
      return "steady";
    case "High":
      return "drinking";
    case "Severe":
      return "bleeding";
  }
}
