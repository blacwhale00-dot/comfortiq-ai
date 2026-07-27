import { describe, expect, it } from "vitest";
import {
  buildDailyStats,
  buildFunnelSteps,
  buildRecoveryQueue,
  buildSourceBreakdown,
  stageRank,
  type SessionSummary,
} from "@/lib/command-center";
import { classifyLeadSource } from "@/lib/lead-source";

const NOW = new Date("2026-07-10T12:00:00Z");

function session(overrides: Partial<SessionSummary>): SessionSummary {
  return {
    id: crypto.randomUUID(),
    first_name: "Ann",
    last_name: "Lee",
    phone: "+14045550100",
    email: "ann@example.com",
    funnel_status: "started",
    guzzler_score: null,
    entry_intent: null,
    quiz_completed_at: null,
    created_at: "2026-07-09T12:00:00Z",
    updated_at: "2026-07-09T12:00:00Z",
    upload_outdoor: null,
    upload_breaker: null,
    upload_thermostat: null,
    upload_bill: null,
    lead_source: null,
    utm_source: null,
    ...overrides,
  };
}

describe("stageRank", () => {
  it("orders the funnel status machine", () => {
    expect(stageRank("started")).toBe(0);
    expect(stageRank("question_3")).toBe(0);
    expect(stageRank("question_6")).toBe(1);
    expect(stageRank("question_12")).toBe(1);
    expect(stageRank("quiz_complete")).toBe(2);
    expect(stageRank("audit_bronze")).toBe(3);
    expect(stageRank("audit_silver")).toBe(4);
    expect(stageRank("audit_gold")).toBe(5);
    expect(stageRank("booked")).toBe(6);
    expect(stageRank("audit_booked")).toBe(6);
    expect(stageRank("audit_complete")).toBe(6);
  });

  it("treats null/default as started and excludes newsletter signups", () => {
    expect(stageRank(null)).toBe(0);
    expect(stageRank("newsletter")).toBe(-1);
  });

  it("keeps unknown statuses visible as started", () => {
    expect(stageRank("something_new")).toBe(0);
  });
});

describe("buildFunnelSteps", () => {
  it("counts cumulative reach and per-step drop-off", () => {
    const sessions = [
      session({ funnel_status: "question_2" }), // dropped at started
      session({ funnel_status: "question_8" }), // dropped at midway
      session({ funnel_status: "quiz_complete" }),
      session({ funnel_status: "audit_gold" }),
      session({ funnel_status: "newsletter" }), // excluded
    ];
    const steps = buildFunnelSteps(sessions);

    expect(steps[0]).toMatchObject({ key: "started", count: 4, pctOfStart: 100 });
    expect(steps[1]).toMatchObject({ key: "midway", count: 3, conversionFromPrev: 75 });
    expect(steps[2]).toMatchObject({ key: "quiz_complete", count: 2, droppedHere: 1 });
    expect(steps[5]).toMatchObject({ key: "audit_gold", count: 1, pctOfStart: 25 });
    expect(steps[6]).toMatchObject({ key: "booked", count: 0, droppedHere: 0 });
  });

  it("handles an empty dataset without dividing by zero", () => {
    for (const step of buildFunnelSteps([])) {
      expect(step.count).toBe(0);
      expect(Number.isFinite(step.pctOfStart)).toBe(true);
      expect(Number.isFinite(step.conversionFromPrev)).toBe(true);
    }
  });
});

describe("buildRecoveryQueue", () => {
  it("includes stalled post-quiz leads with a phone, most urgent first", () => {
    const sessions = [
      // 40h into the window: 8h left — most urgent active
      session({
        id: "urgent",
        funnel_status: "quiz_complete",
        quiz_completed_at: "2026-07-08T20:00:00Z",
      }),
      // 24h in: 24h left
      session({
        id: "fresh",
        funnel_status: "audit_bronze",
        quiz_completed_at: "2026-07-09T12:00:00Z",
        upload_outdoor: "url",
      }),
      // window closed 12h ago — win-back, sorts after active
      session({
        id: "expired",
        funnel_status: "quiz_complete",
        quiz_completed_at: "2026-07-08T00:00:00Z",
      }),
      // GOLD — resolved, excluded
      session({ funnel_status: "audit_gold" }),
      // mid-quiz — no contact yet, excluded
      session({ funnel_status: "question_9" }),
      // finished but no phone — nothing to text, excluded
      session({ funnel_status: "quiz_complete", phone: null }),
    ];

    const queue = buildRecoveryQueue(sessions, NOW);
    expect(queue.map((l) => l.id)).toEqual(["urgent", "fresh", "expired"]);
    expect(queue[0].hoursLeft).toBeCloseTo(8, 0);
    expect(queue[1].photosUploaded).toBe(1);
    expect(queue[2].hoursLeft).toBeLessThan(0);
  });

  it("falls back to created_at when quiz_completed_at is missing and ages out old expiries", () => {
    const sessions = [
      session({
        id: "fallback",
        funnel_status: "quiz_complete",
        created_at: "2026-07-09T00:00:00Z",
      }),
      session({
        id: "ancient",
        funnel_status: "quiz_complete",
        quiz_completed_at: "2026-05-01T00:00:00Z",
      }),
    ];
    const queue = buildRecoveryQueue(sessions, NOW);
    expect(queue.map((l) => l.id)).toEqual(["fallback"]);
    expect(queue[0].hoursLeft).toBeCloseTo(12, 0);
  });
});

describe("classifyLeadSource", () => {
  it("classifies partner short-links and keeps the seller name", () => {
    const src = classifyLeadSource("?src=oncore", "");
    expect(src.category).toBe("partner");
    expect(src.utm_source).toBe("oncore");
    expect(src.utm_medium).toBe("partner");
  });

  it("classifies tagged paid traffic", () => {
    const src = classifyLeadSource("?utm_source=facebook&utm_medium=cpc&utm_campaign=summer", "");
    expect(src.category).toBe("paid");
    expect(src.utm_source).toBe("facebook");
    expect(src.utm_campaign).toBe("summer");
  });

  it("classifies utm_medium=partner as partner", () => {
    const src = classifyLeadSource("?utm_source=oncore&utm_medium=partner", "");
    expect(src.category).toBe("partner");
  });

  it("treats the landing-page marker as internal, not a partner", () => {
    // Bare marker (untagged visitor clicking the landing CTA) → direct.
    expect(classifyLeadSource("?ref=guzzlerscore_landing", "").category).toBe("direct");
    // Marker + passed-through partner tag → the real source wins.
    const src = classifyLeadSource("?ref=guzzlerscore_landing&src=oncore", "");
    expect(src.category).toBe("partner");
    expect(src.utm_source).toBe("oncore");
  });

  it("classifies search referrers as organic and everything else as direct", () => {
    expect(classifyLeadSource("", "https://www.google.com/search?q=hvac").category).toBe("organic");
    expect(classifyLeadSource("", "").category).toBe("direct");
  });
});

describe("buildSourceBreakdown", () => {
  it("groups by source with per-seller and per-campaign lines", () => {
    const sessions = [
      session({ lead_source: "partner", utm_source: "oncore", funnel_status: "quiz_complete" }),
      session({ lead_source: "partner", utm_source: "oncore", funnel_status: "question_3" }),
      session({ lead_source: "paid", utm_source: "facebook", funnel_status: "audit_gold" }),
      session({ lead_source: "direct", funnel_status: "started" }),
      session({ funnel_status: "quiz_complete" }), // pre-attribution row
      session({ lead_source: "partner", utm_source: "oncore", funnel_status: "newsletter" }), // excluded
    ];
    const rows = buildSourceBreakdown(sessions);

    expect(rows[0]).toMatchObject({
      key: "partner:oncore",
      label: "oncore · partner",
      count: 2,
      completed: 1,
      conversionPct: 50,
    });
    expect(rows).toContainEqual(
      expect.objectContaining({ key: "paid:facebook", count: 1, conversionPct: 100 }),
    );
    expect(rows).toContainEqual(expect.objectContaining({ key: "direct", label: "Direct" }));
    expect(rows).toContainEqual(expect.objectContaining({ key: "untracked", count: 1 }));
  });
});

describe("buildDailyStats", () => {
  it("computes today's KPIs", () => {
    const today = "2026-07-10T09:00:00Z";
    const sessions = [
      session({ created_at: today, updated_at: today }), // new today
      session({
        funnel_status: "quiz_complete",
        created_at: today,
        updated_at: today,
        quiz_completed_at: today, // completed today, active recovery, 45h left
      }),
      session({
        funnel_status: "audit_gold",
        updated_at: today, // gold today
      }),
      session({ funnel_status: "newsletter", created_at: today }), // excluded
    ];
    const stats = buildDailyStats(sessions, NOW);
    expect(stats.newToday).toBe(2);
    expect(stats.completedToday).toBe(1);
    expect(stats.goldToday).toBe(1);
    expect(stats.recoveryActive).toBe(1);
    expect(stats.expiringSoon).toBe(0);
  });
});
