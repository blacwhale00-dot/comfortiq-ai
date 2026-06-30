// Entry-intent "doors": the three-way "where are you in your journey" chooser
// shown on entry to GuzzlerScore (Week-2 architecture doc). Door 1 (researching)
// and Door 2 (ready now) route into the assessment; Door 3 (curious) routes to
// the newsletter. The chosen intent is stashed locally so the assessment can
// later tier the lead on the ComfortIQ side (ready-now = hotter).

export type EntryIntent = "researching" | "ready_now" | "newsletter";

// Internal storage keys keep the existing `comfortiq_` prefix (see
// comfortiq_session / comfortiq_incomplete_seen). These are never shown to a
// homeowner, so the GuzzlerScore rebrand intentionally leaves them untouched.
export const ENTRY_INTENT_KEY = "comfortiq_intent";
// Per-browser-session flag so the gate is the entry moment once, then lets the
// visitor browse freely — mirrors the comfortiq_incomplete_seen pattern.
export const ENTRY_GATE_SEEN_KEY = "comfortiq_intent_seen";

function isEntryIntent(value: string | null): value is EntryIntent {
  return value === "researching" || value === "ready_now" || value === "newsletter";
}

export function storeEntryIntent(intent: EntryIntent): void {
  try {
    localStorage.setItem(ENTRY_INTENT_KEY, intent);
  } catch {
    // Storage unavailable (e.g. private mode) — intent tracking is best-effort.
  }
}

export function getStoredEntryIntent(): EntryIntent | null {
  try {
    const value = localStorage.getItem(ENTRY_INTENT_KEY);
    return isEntryIntent(value) ? value : null;
  } catch {
    return null;
  }
}

export function markEntryGateSeen(): void {
  try {
    sessionStorage.setItem(ENTRY_GATE_SEEN_KEY, "1");
  } catch {
    // ignore
  }
}

export function hasSeenEntryGate(): boolean {
  try {
    return sessionStorage.getItem(ENTRY_GATE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
