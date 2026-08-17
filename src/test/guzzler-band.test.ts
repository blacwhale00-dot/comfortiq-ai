import { describe, expect, it } from "vitest";
import {
  BAND_ORDER,
  bandForScore,
  bandForTier,
  riveBandIndex,
} from "@/lib/guzzler-band";
import { tierForScore } from "@/lib/guzzler-score";
import { CORA_STATES, riveStateIndex } from "@/components/cora/cora-states";

describe("band ↔ Rive encoding", () => {
  it("encodes the four bands as 0–3 in the order the .riv expects", () => {
    expect(BAND_ORDER).toEqual(["sipping", "steady", "drinking", "bleeding"]);
    expect(riveBandIndex("sipping")).toBe(0);
    expect(riveBandIndex("steady")).toBe(1);
    expect(riveBandIndex("drinking")).toBe(2);
    expect(riveBandIndex("bleeding")).toBe(3);
  });

  it("falls back to idle-band 0 rather than NaN for a missing band", () => {
    expect(riveBandIndex(null)).toBe(0);
    expect(riveBandIndex(undefined)).toBe(0);
  });

  it("encodes the four states as 0–3 in the order the .riv expects", () => {
    expect(CORA_STATES).toEqual(["idle", "listening", "scanning", "score_reveal"]);
    expect(riveStateIndex("idle")).toBe(0);
    expect(riveStateIndex("listening")).toBe(1);
    expect(riveStateIndex("scanning")).toBe(2);
    expect(riveStateIndex("score_reveal")).toBe(3);
  });
});

describe("bandForScore — unchanged from its original home in RepairHistoryChat", () => {
  it("cuts at 25 / 50 / 75", () => {
    expect(bandForScore(0)).toBe("sipping");
    expect(bandForScore(25)).toBe("sipping");
    expect(bandForScore(26)).toBe("steady");
    expect(bandForScore(50)).toBe("steady");
    expect(bandForScore(51)).toBe("drinking");
    expect(bandForScore(75)).toBe("drinking");
    expect(bandForScore(76)).toBe("bleeding");
    expect(bandForScore(100)).toBe("bleeding");
  });

  it("returns null for an unscored session", () => {
    expect(bandForScore(null)).toBeNull();
  });
});

describe("bandForTier — a pure rename, no thresholds of its own", () => {
  it("maps each tier to its band", () => {
    expect(bandForTier("Mild")).toBe("sipping");
    expect(bandForTier("Moderate")).toBe("steady");
    expect(bandForTier("High")).toBe("drinking");
    expect(bandForTier("Severe")).toBe("bleeding");
  });

  it("covers every tier the engine can produce", () => {
    const produced = new Set(
      Array.from({ length: 101 }, (_, score) => tierForScore(score)),
    );
    for (const tier of produced) {
      expect(BAND_ORDER).toContain(bandForTier(tier));
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// The open question for Will, pinned as an executable spec.
//
// These are NOT assertions that the current behavior is correct — they record
// exactly which scores the two systems disagree on, so that whichever way Will
// rules, the diff in this file shows the blast radius. See src/lib/guzzler-band.ts.
// ───────────────────────────────────────────────────────────────────────────
describe("⚠️ tier/band threshold conflict (awaiting Will's ruling)", () => {
  const divergent = Array.from({ length: 101 }, (_, score) => score).filter(
    (score) => bandForTier(tierForScore(score)) !== bandForScore(score),
  );

  it("currently disagrees on scores 26–34, 51–59 and 76–79", () => {
    expect(divergent).toEqual([
      26, 27, 28, 29, 30, 31, 32, 33, 34,
      51, 52, 53, 54, 55, 56, 57, 58, 59,
      76, 77, 78, 79,
    ]);
  });

  it("agrees on the other 79 of the 101 possible scores", () => {
    expect(divergent).toHaveLength(22); // 9 + 9 + 4
    expect(101 - divergent.length).toBe(79);
  });
});
