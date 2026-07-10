// Analytics engine for the CRM command center (/command-center). Pure functions
// over quiz_sessions rows — no Supabase imports — so every number on the
// dashboard is unit-testable. The funnel model is derived from funnel_status,
// which the app already maintains at every step:
//
//   started → question_1..12 → quiz_complete → audit_bronze → audit_silver
//   → audit_gold → booked / audit_booked / audit_complete
//
// ('newsletter' rows are door-3 signups, not funnel participants — excluded.)

export interface SessionSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  funnel_status: string | null;
  guzzler_score: number | null;
  entry_intent: string | null;
  quiz_completed_at: string | null;
  created_at: string;
  updated_at: string;
  upload_outdoor: string | null;
  upload_breaker: string | null;
  upload_thermostat: string | null;
  upload_bill: string | null;
  lead_source: string | null;
  utm_source: string | null;
}

// The 48h photo-upload window (mirrors guzzler-timer.ts).
export const UPLOAD_WINDOW_HOURS = 48;

// Ordered milestones for the funnel display. `rank` is the session's furthest
// point; a session counts toward every step at or below its rank.
export const FUNNEL_STEPS = [
  { key: "started", label: "Started quiz" },
  { key: "midway", label: "Reached question 6" },
  { key: "quiz_complete", label: "Finished quiz + contact" },
  { key: "audit_bronze", label: "Began photo uploads" },
  { key: "audit_silver", label: "All 4 equipment photos" },
  { key: "audit_gold", label: "GOLD — bill uploaded" },
  { key: "booked", label: "Audit booked" },
] as const;

export type FunnelStepKey = (typeof FUNNEL_STEPS)[number]["key"];

const BOOKED_STATUSES = new Set(["booked", "audit_booked", "audit_complete"]);

// Map a funnel_status to the index of the furthest FUNNEL_STEPS milestone the
// session has passed, or -1 for non-participants (newsletter, unknown).
export function stageRank(funnelStatus: string | null): number {
  const status = funnelStatus ?? "started";
  if (status === "newsletter") return -1;
  if (BOOKED_STATUSES.has(status)) return 6;
  if (status === "audit_gold") return 5;
  if (status === "audit_silver") return 4;
  if (status === "audit_bronze") return 3;
  if (status === "quiz_complete") return 2;
  const q = /^question_(\d+)$/.exec(status);
  if (q) return Number(q[1]) >= 6 ? 1 : 0;
  if (status === "started") return 0;
  // Unknown status: count as started so the lead is never invisible.
  return 0;
}

export interface FunnelStepStat {
  key: FunnelStepKey;
  label: string;
  count: number;
  /** Share of step-1 sessions that reached this step (0–100). */
  pctOfStart: number;
  /** Share of the previous step's sessions that reached this one (0–100). */
  conversionFromPrev: number;
  /** Sessions whose furthest point is exactly this step. */
  droppedHere: number;
}

export function buildFunnelSteps(sessions: SessionSummary[]): FunnelStepStat[] {
  const ranks = sessions.map((s) => stageRank(s.funnel_status)).filter((r) => r >= 0);
  const counts = FUNNEL_STEPS.map((_, i) => ranks.filter((r) => r >= i).length);
  const exact = FUNNEL_STEPS.map((_, i) => ranks.filter((r) => r === i).length);

  return FUNNEL_STEPS.map((step, i) => ({
    key: step.key,
    label: step.label,
    count: counts[i],
    pctOfStart: counts[0] === 0 ? 0 : Math.round((counts[i] / counts[0]) * 100),
    conversionFromPrev:
      i === 0 ? 100 : counts[i - 1] === 0 ? 0 : Math.round((counts[i] / counts[i - 1]) * 100),
    // A "drop" at the final step isn't a drop — they made it.
    droppedHere: i === FUNNEL_STEPS.length - 1 ? 0 : exact[i],
  }));
}

export interface RecoveryLead {
  id: string;
  name: string;
  phone: string;
  guzzler_score: number | null;
  entry_intent: string | null;
  /** Hours remaining in the 48h window; negative = expired. */
  hoursLeft: number;
  photosUploaded: number;
}

function windowAnchor(s: SessionSummary): string {
  return s.quiz_completed_at ?? s.created_at;
}

function photosUploaded(s: SessionSummary): number {
  return [s.upload_outdoor, s.upload_breaker, s.upload_thermostat, s.upload_bill].filter(
    Boolean,
  ).length;
}

// The recovery queue: finished the quiz (we have their phone), started or
// stalled inside the upload phase, not yet GOLD or booked. Sorted most-urgent
// first. Expired leads (window closed) are included at the end — they're the
// win-back list — capped by `expiredGraceDays` so ancient sessions age out.
export function buildRecoveryQueue(
  sessions: SessionSummary[],
  now: Date,
  expiredGraceDays = 14,
): RecoveryLead[] {
  const leads: RecoveryLead[] = [];
  for (const s of sessions) {
    const rank = stageRank(s.funnel_status);
    if (rank < 2 || rank >= 5) continue; // pre-contact, or already GOLD/booked
    if (!s.phone) continue;

    const anchorMs = new Date(windowAnchor(s)).getTime();
    const hoursLeft = UPLOAD_WINDOW_HOURS - (now.getTime() - anchorMs) / 3_600_000;
    if (hoursLeft < -expiredGraceDays * 24) continue;

    leads.push({
      id: s.id,
      name: [s.first_name, s.last_name].filter(Boolean).join(" ") || "Unknown",
      phone: s.phone,
      guzzler_score: s.guzzler_score,
      entry_intent: s.entry_intent,
      hoursLeft: Math.round(hoursLeft * 10) / 10,
      photosUploaded: photosUploaded(s),
    });
  }
  // Active windows first (soonest to expire on top), then expired win-backs
  // (most recently expired on top). hoursLeft descending happens to do both.
  return leads.sort((a, b) => {
    const aActive = a.hoursLeft > 0;
    const bActive = b.hoursLeft > 0;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return aActive ? a.hoursLeft - b.hoursLeft : b.hoursLeft - a.hoursLeft;
  });
}

export interface SourceStat {
  /** Grouping key, e.g. "partner:oncore", "paid:facebook", "organic". */
  key: string;
  /** Display label, e.g. "oncore · partner", "facebook · paid", "Organic". */
  label: string;
  count: number;
  /** Sessions from this source that captured contact (reached quiz_complete). */
  completed: number;
  conversionPct: number;
}

// Where the leads come from: paid ads vs partners/lead sellers (Oncore etc.)
// vs organic vs direct. Paid and partner rows split out by utm_source so each
// campaign / seller is its own line; organic, direct, and untracked (rows from
// before attribution shipped) stay single lines.
export function buildSourceBreakdown(sessions: SessionSummary[]): SourceStat[] {
  const groups = new Map<string, { label: string; count: number; completed: number }>();
  for (const s of sessions) {
    if (stageRank(s.funnel_status) < 0) continue;
    const category = s.lead_source ?? "untracked";
    let key: string;
    let label: string;
    if (category === "partner" || category === "paid") {
      const name = s.utm_source ?? category;
      key = `${category}:${name}`;
      label = `${name} · ${category}`;
    } else {
      key = category;
      label = category.charAt(0).toUpperCase() + category.slice(1);
    }
    const group = groups.get(key) ?? { label, count: 0, completed: 0 };
    group.count += 1;
    if (stageRank(s.funnel_status) >= 2) group.completed += 1;
    groups.set(key, group);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      label: g.label,
      count: g.count,
      completed: g.completed,
      conversionPct: g.count === 0 ? 0 : Math.round((g.completed / g.count) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export interface DailyStats {
  newToday: number;
  completedToday: number;
  goldToday: number;
  recoveryActive: number;
  expiringSoon: number; // active recovery windows with < 6h left
}

function isSameLocalDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function buildDailyStats(sessions: SessionSummary[], now: Date): DailyStats {
  const funnel = sessions.filter((s) => stageRank(s.funnel_status) >= 0);
  const recovery = buildRecoveryQueue(sessions, now);
  const active = recovery.filter((l) => l.hoursLeft > 0);
  return {
    newToday: funnel.filter((s) => isSameLocalDay(s.created_at, now)).length,
    completedToday: funnel.filter(
      (s) => s.quiz_completed_at && isSameLocalDay(s.quiz_completed_at, now),
    ).length,
    // GOLD reached today: bill uploaded and the row last moved today.
    goldToday: funnel.filter(
      (s) => stageRank(s.funnel_status) >= 5 && isSameLocalDay(s.updated_at, now),
    ).length,
    recoveryActive: active.length,
    expiringSoon: active.filter((l) => l.hoursLeft < 6).length,
  };
}
