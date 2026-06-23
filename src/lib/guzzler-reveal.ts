// Presentation-layer derivations for the post-quiz score reveal.
// Kept separate from the scoring engine (guzzler-score.ts): the engine owns the
// score/tier math, this module only shapes what the reveal screen displays.

import { quizQuestions, bridgedAnswersForScoring } from "@/components/quiz/conciergeConfig";
import type {
  GuzzlerResultsData,
  GuzzlerRevealData,
  CategoryScore,
} from "@/components/quiz/GuzzlerResults";

// Value unlocked the moment the quiz is finished, and the ceiling the photo
// upload flow builds toward. Exported so the upload flow stays in sync with the
// number the score reveal shows.
export const QUIZ_COMPLETE_VALUE = 200;
export const MAX_UNLOCK_VALUE = 900;

// Letter grade for a 0–100 severity value (higher value = more waste = worse
// grade). Shared by the overall score and every category so the grade can never
// contradict the Mild/Moderate/High/Severe tier.
function gradeForScore(value: number): string {
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

// 0–1 spec weight of the option the homeowner picked for a given question.
function weightOf(answers: Record<string, string | number>, questionId: string): number | null {
  const q = quizQuestions.find((qq) => qq.id === questionId);
  if (!q) return null;
  const answer = answers[questionId];
  if (answer == null) return null;
  const opt = q.options.find((o) => o.value === String(answer));
  return opt?.weight ?? null;
}

// Which of the 12 questions roll up into each reveal category.
const CATEGORY_DEFS: { key: CategoryScore["key"]; label: string; questions: string[] }[] = [
  { key: "equipment", label: "Equipment", questions: ["system_age", "noises", "short_cycling"] },
  { key: "efficiency", label: "Efficiency", questions: ["bills", "seer_rating"] },
  { key: "envelope", label: "Home Envelope", questions: ["comfort_rooms", "humidity"] },
  { key: "maintenance", label: "Maintenance", questions: ["filter_freq", "tune_up", "repairs", "repair_cost"] },
];

function buildCategories(answers: Record<string, string | number>): CategoryScore[] {
  return CATEGORY_DEFS.map((def) => {
    const weights = def.questions
      .map((id) => weightOf(answers, id))
      .filter((w): w is number => w != null);
    const avg = weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;
    const score = Math.round(avg * 100);
    return { key: def.key, label: def.label, score, grade: gradeForScore(score) };
  });
}

// Human-readable driver per question, surfaced when the answer's weight is high.
const DRIVER_PHRASES: Record<string, string> = {
  system_age: "Aging system near the end of its life",
  seer_rating: "Low efficiency rating — a wide SEER gap",
  bills: "Energy bills climbing every cooling season",
  comfort_rooms: "Uneven temperatures from room to room",
  short_cycling: "Short cycling wearing the system down",
  repairs: "Repeat repairs piling up",
  repair_cost: "Money already sunk into past repairs",
  humidity: "Humidity the system can't keep up with",
  noises: "Noises or smells from failing parts",
  filter_freq: "Airflow choked by a neglected filter",
  tune_up: "Overdue for professional maintenance",
};

function buildTopDrivers(answers: Record<string, string | number>): string[] {
  return Object.keys(DRIVER_PHRASES)
    .map((id) => ({ id, weight: weightOf(answers, id) ?? 0 }))
    .filter((d) => d.weight >= 0.5)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((d) => DRIVER_PHRASES[d.id]);
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
    categories: buildCategories(answers),
    topDrivers: buildTopDrivers(answers),
    unlockedValue: QUIZ_COMPLETE_VALUE,
    maxValue: MAX_UNLOCK_VALUE,
  };
}
