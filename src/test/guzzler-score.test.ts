import { describe, expect, it } from "vitest";
import { calculateGuzzlerScore, tierForScore } from "@/lib/guzzler-score";

// The scoring engine the product is named after. These tests pin the four
// factor curves, the tier thresholds, and the permit-silence severity floor —
// the pieces a copy-tweak or a "quick tuning change" could silently move.

// Minimal valid input; each test overrides only what it's exercising.
const base = {
  bills: "low",
  systemAgeBand: "<8",
  yearBuilt: new Date().getFullYear(), // brand new home → lowest home-age points
  silenceYears: 0,
  lastPermitDate: null,
  yearBuiltSource: "County" as const,
};

const scoreOf = (overrides: Partial<typeof base> = {}) =>
  calculateGuzzlerScore({ ...base, ...overrides }).score;

describe("tierForScore", () => {
  it("maps each band, inclusive at the lower bound", () => {
    expect(tierForScore(0)).toBe("Mild");
    expect(tierForScore(34)).toBe("Mild");
    expect(tierForScore(35)).toBe("Moderate");
    expect(tierForScore(59)).toBe("Moderate");
    expect(tierForScore(60)).toBe("High");
    expect(tierForScore(79)).toBe("High");
    expect(tierForScore(80)).toBe("Severe");
    expect(tierForScore(100)).toBe("Severe");
  });
});

describe("calculateGuzzlerScore — factor curves", () => {
  it("scores bills high > med > low, with an unknown fallback between", () => {
    expect(scoreOf({ bills: "high" })).toBeGreaterThan(scoreOf({ bills: "med" }));
    expect(scoreOf({ bills: "med" })).toBeGreaterThan(scoreOf({ bills: "low" }));
    // An unanswered question must not score as the best case.
    expect(scoreOf({ bills: undefined })).toBeGreaterThan(scoreOf({ bills: "low" }));
  });

  it("scores older homes higher, and treats unknown year as mid-range", () => {
    const year = new Date().getFullYear();
    expect(scoreOf({ yearBuilt: year - 45 })).toBeGreaterThan(scoreOf({ yearBuilt: year - 30 }));
    expect(scoreOf({ yearBuilt: year - 30 })).toBeGreaterThan(scoreOf({ yearBuilt: year - 20 }));
    expect(scoreOf({ yearBuilt: year - 20 })).toBeGreaterThan(scoreOf({ yearBuilt: year }));
    expect(scoreOf({ yearBuilt: null })).toBeGreaterThan(scoreOf({ yearBuilt: year }));
  });

  it("scores longer permit silence higher, below the severity floor", () => {
    // Only meaningful under 12 years: past that the floor pins the score to 80
    // and flattens the curve. That clamping is asserted separately below.
    expect(scoreOf({ silenceYears: 10 })).toBeGreaterThan(scoreOf({ silenceYears: 6 }));
    expect(scoreOf({ silenceYears: 6 })).toBeGreaterThan(scoreOf({ silenceYears: 1 }));
  });

  it("treats unknown permit silence as a probable gap, not as clean", () => {
    expect(scoreOf({ silenceYears: null })).toBeGreaterThan(scoreOf({ silenceYears: 0 }));
  });

  it("scores older systems higher, with an unknown band between the extremes", () => {
    expect(scoreOf({ systemAgeBand: ">15" })).toBeGreaterThan(scoreOf({ systemAgeBand: "12-15" }));
    expect(scoreOf({ systemAgeBand: "12-15" })).toBeGreaterThan(scoreOf({ systemAgeBand: "8-12" }));
    expect(scoreOf({ systemAgeBand: "8-12" })).toBeGreaterThan(scoreOf({ systemAgeBand: "<8" }));
    const unknown = scoreOf({ systemAgeBand: "nonsense" });
    expect(unknown).toBeGreaterThan(scoreOf({ systemAgeBand: "<8" }));
    expect(unknown).toBeLessThan(scoreOf({ systemAgeBand: ">15" }));
  });
});

describe("calculateGuzzlerScore — bounds and the severity floor", () => {
  it("stays within 0–100 at the worst case", () => {
    const worst = scoreOf({
      bills: "high",
      systemAgeBand: ">15",
      yearBuilt: 1900,
      silenceYears: 50,
    });
    expect(worst).toBe(100);
  });

  it("never drops below 0 and returns a whole number", () => {
    const best = scoreOf();
    expect(best).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(best)).toBe(true);
  });

  it("forces at least Severe once permit silence exceeds 12 years", () => {
    // Otherwise-clean inputs: without the floor this would score far lower.
    const floored = scoreOf({ silenceYears: 13 });
    expect(floored).toBeGreaterThanOrEqual(80);
    expect(tierForScore(floored)).toBe("Severe");
  });

  it("does not apply the floor at exactly 12 years", () => {
    expect(scoreOf({ silenceYears: 12 })).toBeLessThan(80);
  });

  it("does not apply the floor when silence is unknown", () => {
    expect(scoreOf({ silenceYears: null })).toBeLessThan(80);
  });
});

describe("calculateGuzzlerScore — result shape", () => {
  it("returns all four factors as 0–100 severities", () => {
    const result = calculateGuzzlerScore(base);
    expect(result.factorScores.map((f) => f.key).sort()).toEqual(
      ["bills", "homeAge", "silence", "systemAge"].sort(),
    );
    for (const f of result.factorScores) {
      expect(f.severity).toBeGreaterThanOrEqual(0);
      expect(f.severity).toBeLessThanOrEqual(100);
    }
  });

  it("passes the property-intelligence provenance through untouched", () => {
    const result = calculateGuzzlerScore({
      ...base,
      yearBuilt: 1975,
      silenceYears: 9,
      lastPermitDate: "2016-04-01",
      yearBuiltSource: "Homeowner",
    });
    expect(result.yearBuilt).toBe(1975);
    expect(result.silenceYears).toBe(9);
    expect(result.lastPermitDate).toBe("2016-04-01");
    expect(result.yearBuiltSource).toBe("Homeowner");
  });

  it("reports maximum severity for a factor at its ceiling", () => {
    const result = calculateGuzzlerScore({ ...base, bills: "high" });
    expect(result.factorScores.find((f) => f.key === "bills")?.severity).toBe(100);
  });

  it("agrees with tierForScore on its own score", () => {
    const result = calculateGuzzlerScore({ ...base, bills: "high", silenceYears: 25 });
    expect(result.tier).toBe(tierForScore(result.score));
  });
});
