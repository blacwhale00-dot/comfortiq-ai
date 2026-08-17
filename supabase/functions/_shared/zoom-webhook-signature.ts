// Zoom webhook authentication. Two separate mechanisms, both keyed on the same
// ZOOM_WEBHOOK_SECRET (Zoom calls it the "Secret Token"):
//
//   1. URL validation — once, when the subscription is first saved in the Zoom
//      marketplace. Zoom POSTs {event:"endpoint.url_validation", payload:{plainToken}}
//      and expects {plainToken, encryptedToken: hex(HMAC-SHA256(secret, plainToken))}
//      back within 3 seconds. Fail this and the events never get enabled.
//
//   2. Per-event signature — every real event carries
//        x-zm-request-timestamp: <unix seconds>
//        x-zm-signature:         v0=<hex HMAC-SHA256(secret, "v0:<ts>:<rawBody>")>
//      The body must be hashed EXACTLY as received — parse it only after the
//      check, never re-serialize before hashing.
//
// Deliberately free of Deno APIs (Web Crypto only) so the compliance-critical
// path is unit-tested in src/test/zoom-webhook-signature.test.ts, the same way
// _shared/opt-out.ts is.

const encoder = new TextEncoder();

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Length-independent, value-constant-time comparison (mirrors twilio-signature.ts).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export interface UrlValidationResponse {
  plainToken: string;
  encryptedToken: string;
}

/** Build the handshake reply for Zoom's `endpoint.url_validation` event. */
export async function buildUrlValidationResponse(
  secret: string,
  plainToken: string,
): Promise<UrlValidationResponse> {
  return { plainToken, encryptedToken: await hmacSha256Hex(secret, plainToken) };
}

/**
 * Verify a Zoom event signature.
 *
 * `rawBody` must be the untouched request text. `toleranceSeconds` bounds replay:
 * a captured-and-resent event outside the window is rejected even though its
 * signature is still valid. Zoom's own guidance is 5 minutes.
 */
export async function isValidZoomSignature(
  secret: string,
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  nowMs: number = Date.now(),
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!secret || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(nowMs / 1000 - ts) > toleranceSeconds) return false;

  const expected = `v0=${await hmacSha256Hex(secret, `v0:${timestamp}:${rawBody}`)}`;
  return safeEqual(expected, signature);
}
