import { describe, it, expect, afterEach, vi } from "vitest";
import { CARD_FILENAME, CARD_HEIGHT, CARD_WIDTH, renderScoreCard } from "@/lib/share-card";
import type { ShareableScore } from "@/lib/share-score";

// The score card is a bonus on top of the text share, so the contract that
// matters is its failure behaviour: it must degrade to "no card" without ever
// throwing at the caller, whatever the environment does.

const result: ShareableScore = { score: 78, grade: "D", tier: "High" };

afterEach(() => vi.restoreAllMocks());

describe("renderScoreCard", () => {
  it("returns null when the browser has no 2D context", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    await expect(renderScoreCard(result)).resolves.toBeNull();
  });

  it("returns null — rather than rejecting — when getContext throws", async () => {
    // jsdom does exactly this, and so does a browser with canvas locked down.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("canvas unavailable");
    });
    await expect(renderScoreCard(result)).resolves.toBeNull();
  });

  it("targets the Open Graph / summary_large_image ratio", () => {
    // 1.91:1 is what Facebook, X and LinkedIn all crop to, so the same PNG works
    // as a download, a native-share attachment and an og:image.
    expect(CARD_WIDTH).toBe(1200);
    expect(CARD_HEIGHT).toBe(630);
    expect(CARD_FILENAME.endsWith(".png")).toBe(true);
  });
});
