// Shared phone normalization for every SMS path. Twilio's `To`/`From` must be
// E.164 (+<country><number>), but numbers arrive as free text — "(404) 555-1234",
// "404-555-1234", "4045551234". Both the outbound worker and the inbound webhook
// normalize through this one function so they can never disagree on a number.
// Returns null when the input can't be confidently coerced (caller should skip
// rather than hand Twilio garbage it would reject with 21211 anyway).
export function toE164(raw: string): string | null {
  const trimmed = (raw ?? "").trim();
  const digits = trimmed.replace(/\D/g, "");

  // Already international ("+44…", "+1…"): trust the country code as written.
  if (trimmed.startsWith("+")) return digits.length >= 8 ? `+${digits}` : null;
  // Bare US/Canada 10-digit local number → prepend +1.
  if (digits.length === 10) return `+1${digits}`;
  // 11 digits already carrying the US country code.
  if (digits.length === 11 && digits[0] === "1") return `+${digits}`;
  // Anything else is ambiguous (wrong length, unknown country) → skip.
  return null;
}
