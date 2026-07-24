// Deterministic, server-side opt-out / opt-in classifier for inbound SMS.
// Will §5: "any reasonable opt-out phrasing → instant suppression", and the
// compliance filter must be deterministic and server-side. This is the single
// source of truth so every inbound path classifies identically.

export type SmsIntent = "opt_out" | "opt_in" | "other";

// Exact-match keywords (after normalization), mirroring the carrier-standard
// STOP/START set. NOTE: "no" is intentionally absent — a homeowner answering
// "no" to one of Cora's questions must never be silently unsubscribed.
const OPT_OUT_EXACT = new Set([
  "stop", "stopall", "stop all", "unsubscribe", "cancel", "end", "quit",
  "optout", "opt out", "opt-out", "revoke", "remove", "remove me",
]);
const OPT_IN_EXACT = new Set([
  "start", "yes", "unstop", "resume", "optin", "opt in", "opt-in",
]);

// Lowercase, strip punctuation to spaces, collapse whitespace.
function normalize(body: string): string {
  return (body ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyInbound(body: string): SmsIntent {
  const norm = normalize(body);
  if (!norm) return "other";
  if (OPT_OUT_EXACT.has(norm)) return "opt_out";
  if (OPT_IN_EXACT.has(norm)) return "opt_in";
  // Unambiguous opt-out words anywhere in the message ("please stop", "stop texting me").
  if (/\b(stop|unsubscribe)\b/.test(norm)) return "opt_out";
  // Reasonable natural phrasing.
  if (/(remove me|leave me alone|do not text|dont text|do not contact|dont contact)/.test(norm)) {
    return "opt_out";
  }
  return "other";
}

export const OPT_OUT_CONFIRMATION =
  "You're unsubscribed from ComfortIQ texts and won't receive any more. Reply START to resume.";
export const OPT_IN_CONFIRMATION =
  "You're resubscribed to ComfortIQ texts. Reply STOP to opt out at any time.";
