import { describe, it, expect } from "vitest";
import {
  SHARE_LANDING_PATH,
  buildFacebookIntent,
  buildShareMessage,
  buildShareText,
  buildShareUrl,
  buildSmsIntent,
  buildXIntent,
  fitForX,
  type ShareableScore,
} from "@/lib/share-score";
import type { GuzzlerTier } from "@/components/quiz/guzzler-tiers";

const ORIGIN = "https://guzzlerscore.ai";
const TIERS: GuzzlerTier[] = ["Mild", "Moderate", "High", "Severe"];

const result: ShareableScore = { score: 78, grade: "D", tier: "High" };

// The homeowner data that must never reach a share destination. These are the
// real column names from quiz_sessions / property_intelligence.
const PII = [
  "1428 Magnolia Ridge Dr",
  "dana.whitfield@example.com",
  "+14045551234",
  "30062",
  "00000000-0000-4000-8000-000000000001",
];

describe("share copy", () => {
  it("states the score and grade without inventing a different number", () => {
    const text = buildShareText(result);
    expect(text).toContain("78/100");
    expect(text).toContain("Grade D");
  });

  it("has a line for every tier the engine can produce", () => {
    for (const tier of TIERS) {
      const text = buildShareText({ ...result, tier });
      expect(text.length).toBeGreaterThan(40);
      // Each tier must read as its own sentence, not a placeholder.
      expect(text).not.toContain("undefined");
    }
  });

  it("reads as a win at the low end and a warning at the high end", () => {
    expect(buildShareText({ score: 12, grade: "A", tier: "Mild" })).toContain("isn't the money pit");
    expect(buildShareText({ score: 92, grade: "F", tier: "Severe" })).toContain("bleeding money");
  });

  it("clamps a score the engine could never emit", () => {
    expect(buildShareText({ ...result, score: 143 })).toContain("100/100");
    expect(buildShareText({ ...result, score: -8 })).toContain("0/100");
  });
});

describe("share destinations", () => {
  it("points at the public funnel entry, with channel attribution only", () => {
    const url = new URL(buildShareUrl(ORIGIN, "x"));
    expect(url.pathname).toBe(SHARE_LANDING_PATH);
    expect([...url.searchParams.keys()].sort()).toEqual(["ref", "via"]);
    expect(url.searchParams.get("via")).toBe("x");
  });

  it("never doubles the slash when the origin has a trailing one", () => {
    expect(buildShareUrl("https://guzzlerscore.ai/", "copy")).toBe(
      `${ORIGIN}${SHARE_LANDING_PATH}?ref=share&via=copy`,
    );
  });

  it("builds an X intent carrying the text and the link separately", () => {
    const url = new URL(buildXIntent(result, ORIGIN));
    expect(url.origin + url.pathname).toBe("https://x.com/intent/post");
    expect(url.searchParams.get("text")).toBe(buildShareText(result));
    expect(url.searchParams.get("url")).toBe(buildShareUrl(ORIGIN, "x"));
  });

  it("builds a Facebook share with only the URL — its dialog ignores captions", () => {
    const url = new URL(buildFacebookIntent(ORIGIN));
    expect(url.hostname).toBe("www.facebook.com");
    expect([...url.searchParams.keys()]).toEqual(["u"]);
    expect(url.searchParams.get("u")).toBe(buildShareUrl(ORIGIN, "facebook"));
  });

  it("builds an SMS link in the spelling both iOS and Android accept", () => {
    const sms = buildSmsIntent(result, ORIGIN);
    expect(sms.startsWith("sms:?&body=")).toBe(true);
    expect(decodeURIComponent(sms.slice("sms:?&body=".length))).toBe(
      buildShareMessage(result, ORIGIN, "sms"),
    );
  });
});

describe("X length budget", () => {
  it("leaves room for a t.co-wrapped link", () => {
    // 280 total − 23 for the link − 1 space.
    expect(fitForX("x".repeat(300))).toHaveLength(256);
  });

  it("cuts on a word boundary rather than mid-word", () => {
    const trimmed = fitForX(`${"word ".repeat(60)}tail`);
    expect(trimmed.endsWith("…")).toBe(true);
    expect(trimmed).not.toMatch(/wo…$/);
  });

  it("leaves real share copy untouched for every tier", () => {
    for (const tier of TIERS) {
      const text = buildShareText({ score: 100, grade: "A+", tier });
      expect(fitForX(text)).toBe(text);
    }
  });
});

// The load-bearing test for this feature. `ShareableScore` is a narrow type, so
// a caller cannot even pass PII in — but a future refactor could widen it, and
// this asserts the observable contract regardless of how the input is shaped.
describe("safety", () => {
  it("leaks nothing identifying into any destination, even when handed extra fields", () => {
    const contaminated = {
      ...result,
      streetAddress: PII[0],
      email: PII[1],
      phone: PII[2],
      zipCode: PII[3],
      sessionId: PII[4],
      yearBuilt: 1974,
      lastPermitDate: "2003-08-11",
      monthlyWaste: 180,
    } as ShareableScore;

    const surfaces = [
      buildShareText(contaminated),
      buildShareMessage(contaminated, ORIGIN, "copy"),
      buildShareUrl(ORIGIN, "sms"),
      buildXIntent(contaminated, ORIGIN),
      buildFacebookIntent(ORIGIN),
      buildSmsIntent(contaminated, ORIGIN),
    ];

    for (const surface of surfaces) {
      const decoded = decodeURIComponent(surface);
      for (const secret of PII) {
        expect(decoded).not.toContain(secret);
      }
      expect(decoded).not.toContain("1974");
      expect(decoded).not.toContain("2003-08-11");
      // The waste estimate is an inference about their energy bills — keep it out.
      expect(decoded).not.toMatch(/\$\d/);
    }
  });

  it("puts no session identifier in the link, so a share can't be replayed", () => {
    const url = buildShareUrl(ORIGIN, "facebook");
    expect(url).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i);
  });
});
