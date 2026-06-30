import { describe, it, expect } from "vitest";
import {
  computeGuzzlerTimer,
  formatCountdown,
  UPLOAD_WINDOW_HOURS,
} from "@/lib/guzzler-timer";

const HOUR = 60 * 60 * 1000;
const start = Date.parse("2026-06-29T00:00:00Z");
// `now` for a given number of hours remaining in the 48h window.
const nowWithHoursLeft = (hoursLeft: number) =>
  start + (UPLOAD_WINDOW_HOURS - hoursLeft) * HOUR;

describe("computeGuzzlerTimer", () => {
  it("starts at the full 48h window the moment the quiz completes", () => {
    const t = computeGuzzlerTimer(start, start);
    expect(t.remaining_hours).toBe(48);
    expect(t.is_expired).toBe(false);
    expect(t.phase).toBe("normal");
  });

  it("treats a missing anchor as a fresh, full window", () => {
    const t = computeGuzzlerTimer(null);
    expect(t.remaining_hours).toBe(48);
    expect(t.is_expired).toBe(false);
    expect(t.phase).toBe("normal");
  });

  it("steps through phases at 24h, 6h and 1h remaining", () => {
    expect(computeGuzzlerTimer(start, nowWithHoursLeft(30)).phase).toBe("normal");
    expect(computeGuzzlerTimer(start, nowWithHoursLeft(24)).phase).toBe("amber");
    expect(computeGuzzlerTimer(start, nowWithHoursLeft(12)).phase).toBe("amber");
    expect(computeGuzzlerTimer(start, nowWithHoursLeft(6)).phase).toBe("red");
    expect(computeGuzzlerTimer(start, nowWithHoursLeft(3)).phase).toBe("red");
    expect(computeGuzzlerTimer(start, nowWithHoursLeft(1)).phase).toBe("critical");
    expect(computeGuzzlerTimer(start, nowWithHoursLeft(0.25)).phase).toBe("critical");
  });

  it("expires once the window elapses and clamps remaining to zero", () => {
    const t = computeGuzzlerTimer(start, start + 49 * HOUR);
    expect(t.is_expired).toBe(true);
    expect(t.phase).toBe("expired");
    expect(t.remaining_ms).toBe(0);
    expect(t.remaining_hours).toBe(0);
  });
});

describe("formatCountdown", () => {
  it("formats milliseconds as zero-padded HH:MM:SS", () => {
    expect(formatCountdown(48 * HOUR)).toBe("48:00:00");
    expect(formatCountdown(6 * HOUR + 9 * 60 * 1000 + 59 * 1000)).toBe("06:09:59");
    expect(formatCountdown(0)).toBe("00:00:00");
    expect(formatCountdown(-5000)).toBe("00:00:00");
  });
});
