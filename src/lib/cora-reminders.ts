// Cora's 5 reminder SMS messages — the engine for the SMS pipeline.
//
// ALL reminder business rules live here: which milestones fire, where each
// send_at lands inside the 48-hour upload window, and the canonical message
// copy. The Build-Order doc only shows truncated copy, so THIS module is the
// single source of truth for the 5 messages — everything downstream (the DB
// row, the worker, Twilio) sends them verbatim and never recomputes send_at.
//
// Anchored to the same 48h window as guzzler-timer.ts (UPLOAD_WINDOW_HOURS), so
// the reminders and the on-screen countdown can never drift apart. Pure
// functions, no React — mirrors guzzler-timer.ts / guzzler-score.ts.

import { UPLOAD_WINDOW_HOURS } from "./guzzler-timer";

const MS_PER_HOUR = 60 * 60 * 1000;

// The five reminder milestones, in send order. Each is anchored to the upload
// window: `immediate` at t0, `expired` when the window closes at t0 + 48h.
export type CoraMilestone =
  | "immediate"
  | "halfway"
  | "urgent"
  | "final_hour"
  | "expired";

export interface CoraReminder {
  milestone: CoraMilestone;
  hours_remaining: number; // hours left in the window when this fires
  send_at: string; // ISO timestamp, frozen at build time
  message: string; // canonical Cora copy, sent verbatim
}

export interface CoraReminderContext {
  // Personalizes the greeting; falls back to "there" when absent (the gate
  // always captures a name, but copy must still render cleanly without one).
  firstName?: string | null;
}

interface MilestoneDef {
  milestone: CoraMilestone;
  hours_elapsed: number; // hours after t0 the reminder fires
  hours_remaining: number; // hours left in the window at that point
  message: (greeting: string) => string;
}

// The canonical copy. Each builder receives a ready-made greeting ("Hey Jane!"
// or "Hey there!") so personalization is uniform and lives in one place.
const MILESTONES: MilestoneDef[] = [
  {
    milestone: "immediate",
    hours_elapsed: 0,
    hours_remaining: UPLOAD_WINDOW_HOURS, // 48
    message: (greeting) =>
      `${greeting} 👋 Cora here. Your Guzzler Score is locked in and your $200 Home Efficiency Discount is reserved. Add a few photos of your equipment in the next 48 hours to unlock the full $900 — it only takes about 2 minutes. 📸`,
  },
  {
    milestone: "halfway",
    hours_elapsed: 24,
    hours_remaining: 24,
    message: (greeting) =>
      `${greeting} Cora checking in 💚 You're halfway through your 48-hour window. Adding your equipment photos now keeps your discount climbing toward the full $900 — no rush, but I'd hate for you to miss it.`,
  },
  {
    milestone: "urgent",
    hours_elapsed: 42,
    hours_remaining: 6,
    message: (greeting) =>
      `${greeting} ⏳ Just 6 hours left on your Home Efficiency Discount window. A couple of equipment photos is all it takes to lock in your savings before it closes.`,
  },
  {
    milestone: "final_hour",
    hours_elapsed: 47,
    hours_remaining: 1,
    message: (greeting) =>
      `${greeting} 🚨 Last call — your discount window closes in about an hour. Upload your equipment photos now to secure your full $900 before it's gone.`,
  },
  {
    milestone: "expired",
    hours_elapsed: UPLOAD_WINDOW_HOURS, // 48
    hours_remaining: 0,
    message: (greeting) =>
      `${greeting} 💚 Your discount window has closed, but don't worry — a real HVAC expert will still review your results and reach out. You'll hear from us soon.`,
  },
];

/**
 * Build Cora's 5 reminders from the quiz-completion anchor.
 *
 * The returned `send_at` / `message` are meant to be frozen into the DB at
 * creation; the worker reads them back and never recomputes anything.
 *
 * @param startedAt When the 48h window opened (quiz completion).
 * @param ctx       Personalization context (first name).
 * @returns The 5 reminders in send order, or [] if `startedAt` is invalid (so a
 *          fire-and-forget caller never breaks the quiz).
 */
export function buildCoraReminders(
  startedAt: string | number | Date,
  ctx: CoraReminderContext = {},
): CoraReminder[] {
  const startMs = new Date(startedAt).getTime();
  if (Number.isNaN(startMs)) return [];

  const firstName = (ctx.firstName ?? "").trim();
  const greeting = firstName ? `Hey ${firstName}!` : "Hey there!";

  return MILESTONES.map((def) => ({
    milestone: def.milestone,
    hours_remaining: def.hours_remaining,
    send_at: new Date(startMs + def.hours_elapsed * MS_PER_HOUR).toISOString(),
    message: def.message(greeting),
  }));
}
