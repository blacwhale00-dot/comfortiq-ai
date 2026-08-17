import { describe, expect, it } from "vitest";
// Pure Web Crypto, no Deno APIs, so it's testable here even though it lives in
// the edge-function shared dir — same arrangement as opt-out.test.ts. This is
// the ONLY thing standing between a forged HTTP request and mutating a lead's
// call state + firing an outbound message, so pin its behavior hard.
import {
  buildUrlValidationResponse,
  isValidZoomSignature,
} from "../../supabase/functions/_shared/zoom-webhook-signature";
import { buildContextCard } from "../../supabase/functions/_shared/telegram";

const SECRET = "zoom-webhook-secret-for-tests";

// Reproduces Zoom's algorithm independently of the implementation, so a bug in
// the helper can't hide behind a matching bug in the test.
async function sign(secret: string, timestamp: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`v0:${timestamp}:${body}`));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `v0=${hex}`;
}

describe("Zoom URL-validation handshake", () => {
  it("returns the plainToken alongside its HMAC-SHA256 hex", async () => {
    const res = await buildUrlValidationResponse(SECRET, "abc123");
    expect(res.plainToken).toBe("abc123");
    expect(res.encryptedToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for a given secret and token", async () => {
    const a = await buildUrlValidationResponse(SECRET, "abc123");
    const b = await buildUrlValidationResponse(SECRET, "abc123");
    expect(a.encryptedToken).toBe(b.encryptedToken);
  });

  it("changes with the secret — a wrong secret fails Zoom's handshake", async () => {
    const good = await buildUrlValidationResponse(SECRET, "abc123");
    const bad = await buildUrlValidationResponse("other-secret", "abc123");
    expect(good.encryptedToken).not.toBe(bad.encryptedToken);
  });
});

describe("Zoom event signature verification", () => {
  const body = JSON.stringify({ event: "meeting.ended", payload: { object: { id: 987 } } });
  const nowMs = 1_760_000_000_000;
  const ts = String(Math.floor(nowMs / 1000));

  it("accepts a correctly signed, in-window event", async () => {
    const sig = await sign(SECRET, ts, body);
    expect(await isValidZoomSignature(SECRET, body, ts, sig, nowMs)).toBe(true);
  });

  it("rejects a wrong secret", async () => {
    const sig = await sign("attacker-secret", ts, body);
    expect(await isValidZoomSignature(SECRET, body, ts, sig, nowMs)).toBe(false);
  });

  it("rejects a tampered body — even one byte", async () => {
    const sig = await sign(SECRET, ts, body);
    const tampered = body.replace("987", "988");
    expect(await isValidZoomSignature(SECRET, tampered, ts, sig, nowMs)).toBe(false);
  });

  it("rejects a replayed event outside the 5-minute window", async () => {
    const oldTs = String(Math.floor(nowMs / 1000) - 400);
    const sig = await sign(SECRET, oldTs, body);
    // The signature itself is still valid — only the timestamp check stops it.
    expect(await isValidZoomSignature(SECRET, body, oldTs, sig, nowMs)).toBe(false);
  });

  it("rejects a timestamp from the future beyond tolerance", async () => {
    const futureTs = String(Math.floor(nowMs / 1000) + 400);
    const sig = await sign(SECRET, futureTs, body);
    expect(await isValidZoomSignature(SECRET, body, futureTs, sig, nowMs)).toBe(false);
  });

  it("accepts a small clock skew inside tolerance", async () => {
    const skewed = String(Math.floor(nowMs / 1000) - 120);
    const sig = await sign(SECRET, skewed, body);
    expect(await isValidZoomSignature(SECRET, body, skewed, sig, nowMs)).toBe(true);
  });

  it("rejects missing headers rather than throwing", async () => {
    const sig = await sign(SECRET, ts, body);
    expect(await isValidZoomSignature(SECRET, body, null, sig, nowMs)).toBe(false);
    expect(await isValidZoomSignature(SECRET, body, ts, null, nowMs)).toBe(false);
    expect(await isValidZoomSignature("", body, ts, sig, nowMs)).toBe(false);
  });

  it("rejects a non-numeric timestamp", async () => {
    const sig = await sign(SECRET, ts, body);
    expect(await isValidZoomSignature(SECRET, body, "not-a-number", sig, nowMs)).toBe(false);
  });
});

describe("Will's Telegram context card stays lean", () => {
  const card = buildContextCard({
    firstName: "Dana",
    score: 82,
    band: "bleeding",
    verdict: "replace",
    repairSummary: "2 repairs in 3 years on a 16yr system",
    startUrl: "https://zoom.us/s/123",
  });

  it("carries the five approved fields and the one-tap join", () => {
    expect(card).toContain("Dana");
    expect(card).toContain("82");
    expect(card).toContain("bleeding");
    expect(card).toContain("replace");
    expect(card).toContain("2 repairs in 3 years");
    expect(card).toContain("https://zoom.us/s/123");
  });

  it("escapes HTML so a homeowner-supplied name can't inject markup", () => {
    const injected = buildContextCard({
      firstName: "<b>oops</b>",
      score: null,
      band: null,
      verdict: null,
      repairSummary: null,
      startUrl: "https://zoom.us/s/1",
    });
    expect(injected).toContain("&lt;b&gt;oops&lt;/b&gt;");
    expect(injected).not.toContain("<b>oops</b>");
  });

  it("degrades gracefully when the lead has no score or analysis yet", () => {
    const sparse = buildContextCard({
      firstName: null,
      score: null,
      band: null,
      verdict: null,
      repairSummary: null,
      startUrl: "https://zoom.us/s/1",
    });
    expect(sparse).toContain("Homeowner");
    expect(sparse).toContain("Score pending");
  });
});
