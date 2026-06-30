// Presentation-layer derivations for the post-quiz score reveal.
// Kept separate from the scoring engine (guzzler-score.ts): the engine owns the
// score/tier math and the factor severities, this module only shapes what the
// reveal screen displays. The category breakdown and top drivers are built from
// the engine's own factorScores, so they always agree with the headline score.

import { bridgedAnswersForScoring } from "@/components/quiz/conciergeConfig";
import type {
  GuzzlerResultsData,
  GuzzlerRevealData,
  CategoryScore,
  FactorKey,
  FactorScore,
} from "@/components/quiz/GuzzlerResults";

// Value unlocked the moment the quiz is finished, and the ceiling the photo
// upload flow builds toward. Exported so the upload flow stays in sync with the
// number the score reveal shows.
export const QUIZ_COMPLETE_VALUE = 200;
export const MAX_UNLOCK_VALUE = 900;

// Letter grade for a 0–100 severity value (higher value = more waste = worse
// grade). Shared by the overall score and every category so the grade can never
// contradict the Mild/Moderate/High/Severe tier. Exported so screens that
// re-display a persisted score (e.g. the incomplete funnel) reuse the same map.
export function gradeForScore(value: number): string {
  const v = Math.max(0, Math.min(100, value));
  if (v < 10) return "A+";
  if (v < 20) return "A";
  if (v < 30) return "B+";
  if (v < 40) return "B";
  if (v < 50) return "C+";
  if (v < 60) return "C";
  if (v < 70) return "D+";
  if (v < 80) return "D";
  return "F";
}

// Human-readable label + driver phrase for each scoring factor.
const FACTOR_LABEL: Record<FactorKey, string> = {
  systemAge: "System Age",
  bills: "Energy Bills",
  homeAge: "Home Age",
  silence: "HVAC Modernization Gap",
};

const FACTOR_DRIVER: Record<FactorKey, string> = {
  systemAge: "System nearing the end of its expected life",
  bills: "Energy bills climbing every cooling season",
  homeAge: "Older home with aging HVAC infrastructure",
  silence: "Long gap since the last HVAC system permit",
};

// One category bar per scoring factor — these ARE the score's components.
function buildCategories(factorScores: FactorScore[]): CategoryScore[] {
  return factorScores.map((f) => ({
    key: f.key,
    label: FACTOR_LABEL[f.key],
    score: f.severity,
    grade: gradeForScore(f.severity),
  }));
}

// Top 3 factors actually pushing the score up (severity ≥ 50), worst first.
function buildTopDrivers(factorScores: FactorScore[]): string[] {
  return [...factorScores]
    .filter((f) => f.severity >= 50)
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 3)
    .map((f) => FACTOR_DRIVER[f.key]);
}

// Rough monthly dollars lost to inefficiency. Anchored to reported bill pressure
// and scaled by overall severity. An estimate, not a metered figure — the visual
// audit (electric bill upload) refines it later.
function monthlyWasteEstimate(score: number, bills: string | number): number {
  const billBase = bills === "high" ? 380 : bills === "med" ? 270 : 180;
  const severity = Math.max(0, Math.min(100, score)) / 100;
  return Math.round((billBase * 0.6 * severity) / 5) * 5;
}

// Combine the engine result with the reveal-only extras the screen renders.
export function deriveRevealData(
  base: GuzzlerResultsData,
  answers: Record<string, string | number>,
): GuzzlerRevealData {
  const bills = bridgedAnswersForScoring(answers).bills;
  return {
    ...base,
    grade: gradeForScore(base.score),
    monthlyWaste: monthlyWasteEstimate(base.score, bills),
    categories: buildCategories(base.factorScores),
    topDrivers: buildTopDrivers(base.factorScores),
    unlockedValue: QUIZ_COMPLETE_VALUE,
    maxValue: MAX_UNLOCK_VALUE,
  };
}
