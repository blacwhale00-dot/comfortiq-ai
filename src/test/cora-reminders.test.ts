import { describe, it, expect } from "vitest";
import {
  buildCoraReminders,
  type CoraMilestone,
} from "@/lib/cora-reminders";
import { UPLOAD_WINDOW_HOURS } from "@/lib/guzzler-timer";

const HOUR = 60 * 60 * 1000;
const start = "2026-06-29T00:00:00.000Z";
const startMs = Date.parse(start);

// Expected fire-time offset (hours after t0) for each milestone.
const EXPECTED: Array<{ milestone: CoraMilestone; elapsed: number; remaining: number }> = [
  { milestone: "immediate", elapsed: 0, remaining: 48 },
  { milestone: "halfway", elapsed: 24, remaining: 24 },
  { milestone: "urgent", elapsed: 42, remaining: 6 },
  { milestone: "final_hour", elapsed: 47, remaining: 1 },
  { milestone: "expired", elapsed: 48, remaining: 0 },
];

describe("buildCoraReminders", () => {
  it("emits exactly the 5 milestones in send order", () => {
    const reminders = buildCoraReminders(start);
    expect(reminders.map((r) => r.milestone)).toEqual(EXPECTED.map((e) => e.milestone));
  });

  it("anchors every send_at to the 48h window, with expired at the close", () => {
    const reminders = buildCoraReminders(start);
    for (const [i, r] of reminders.entries()) {
      expect(Date.parse(r.send_at)).toBe(startMs + EXPECTED[i].elapsed * HOUR);
      expect(r.hours_remaining).toBe(EXPECTED[i].remaining);
    }
    // The last reminder fires exactly when the timer expires.
    const expired = reminders[reminders.length - 1];
    expect(Date.parse(expired.send_at)).toBe(startMs + UPLOAD_WINDOW_HOURS * HOUR);
  });

  it("send_at values are strictly increasing", () => {
    const times = buildCoraReminders(start).map((r) => Date.parse(r.send_at));
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
  });

  it("every reminder carries non-empty copy", () => {
    for (const r of buildCoraReminders(start)) {
      expect(r.message.trim().length).toBeGreaterThan(0);
    }
  });

  it("personalizes the greeting with the first name", () => {
    const reminders = buildCoraReminders(start, { firstName: "Jane" });
    expect(reminders[0].message).toContain("Hey Jane!");
  });

  it("falls back to a generic greeting when no name is given", () => {
    for (const ctx of [{}, { firstName: null }, { firstName: "   " }]) {
      const reminders = buildCoraReminders(start, ctx);
      expect(reminders[0].message).toContain("Hey there!");
    }
  });

  it("returns an empty list for an invalid anchor (never throws)", () => {
    expect(buildCoraReminders("not-a-date")).toEqual([]);
    expect(buildCoraReminders(NaN)).toEqual([]);
  });
});
