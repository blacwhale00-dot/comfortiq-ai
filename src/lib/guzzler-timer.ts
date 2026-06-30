// The 48-hour photo-upload window — the engine for the upload countdown.
//
// ALL timer business rules live here: the window length, the phase thresholds,
// and the expiry test. The UI consumes the computed GuzzlerTimer and never
// re-derives remaining time, expiry, or thresholds (Phase 2 ticket). This mirrors
// how guzzler-score.ts owns the scoring rules — pure functions, no React.

export const UPLOAD_WINDOW_HOURS = 48;

const MS_PER_HOUR = 60 * 60 * 1000;

// Phase thresholds, in hours remaining. Crossing each lowers the visual urgency.
// Kept here (not in the UI) so the rules have one source of truth.
const AMBER_AT_HOURS = 24;
const RED_AT_HOURS = 6;
const CRITICAL_AT_HOURS = 1;

export type TimerPhase = "normal" | "amber" | "red" | "critical" | "expired";

export interface GuzzlerTimer {
  total_hours: number; // the full window (48)
  remaining_ms: number; // milliseconds left, clamped to >= 0
  remaining_hours: number; // hours left, clamped to >= 0
  is_expired: boolean;
  phase: TimerPhase;
}

function phaseFor(remainingHours: number, isExpired: boolean): TimerPhase {
  if (isExpired) return "expired";
  if (remainingHours <= CRITICAL_AT_HOURS) return "critical";
  if (remainingHours <= RED_AT_HOURS) return "red";
  if (remainingHours <= AMBER_AT_HOURS) return "amber";
  return "normal";
}

/**
 * Compute the upload-window timer from the quiz-completion anchor.
 *
 * @param startedAt When the 48h window opened (quiz completion). null/invalid is
 *                  treated as a fresh, full window so the UI shows 48:00:00.
 * @param now       Current epoch ms (injectable for tests; defaults to Date.now()).
 */
export function computeGuzzlerTimer(
  startedAt: string | number | Date | null | undefined,
  now: number = Date.now(),
): GuzzlerTimer {
  const total_hours = UPLOAD_WINDOW_HOURS;
  const startMs = startedAt == null ? NaN : new Date(startedAt).getTime();

  // No / invalid anchor yet → assume the window just opened (full time left).
  if (Number.isNaN(startMs)) {
    return {
      total_hours,
      remaining_ms: total_hours * MS_PER_HOUR,
      remaining_hours: total_hours,
      is_expired: false,
      phase: "normal",
    };
  }

  const deadlineMs = startMs + total_hours * MS_PER_HOUR;
  const remaining_ms = Math.max(0, deadlineMs - now);
  const remaining_hours = remaining_ms / MS_PER_HOUR;
  const is_expired = remaining_ms <= 0;

  return {
    total_hours,
    remaining_ms,
    remaining_hours,
    is_expired,
    phase: phaseFor(remaining_hours, is_expired),
  };
}

// Format remaining time as HH:MM:SS (e.g. "48:00:00", "06:09:59").
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
