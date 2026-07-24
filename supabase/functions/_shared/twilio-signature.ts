// Validate Twilio's X-Twilio-Signature so nobody can forge inbound webhooks.
// This matters because the webhook mutates opt-out state: a forged opt-in would
// re-subscribe someone who legally opted out. Algorithm per Twilio docs:
//   base     = full request URL + each POST param appended as key+value, key-sorted
//   expected = base64( HMAC-SHA1(authToken, base) )
// then compared in constant time against the header value.

async function hmacSha1Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  let binary = "";
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Length-independent, value-constant-time comparison.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function isValidTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | null,
): Promise<boolean> {
  if (!signature) return false;
  let base = url;
  for (const key of Object.keys(params).sort()) base += key + params[key];
  const expected = await hmacSha1Base64(authToken, base);
  return safeEqual(expected, signature);
}
