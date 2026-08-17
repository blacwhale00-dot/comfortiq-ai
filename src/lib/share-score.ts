// "Share Your Score" — the copy and destination URLs behind the post-reveal
// share card. Pure functions, no React, no DOM: mirrors guzzler-score.ts /
// guzzler-timer.ts so the share behaviour is unit-testable and lives in one
// place.
//
// SAFETY IS THE POINT OF THIS MODULE. The scope of work is explicit that
// "homeowner data never shared publicly" (docs/scope-of-work.md §Privacy), so:
//
//   · `ShareableScore` is a narrow type — score, grade, tier and nothing else.
//     It is deliberately NOT `GuzzlerRevealData`, which also carries yearBuilt,
//     lastPermitDate and permit-silence years: property-identifying data that
//     must never leave the session. Narrowing the input is the structural guard;
//     a caller physically cannot hand this module a street address.
//   · The share URL is the public funnel entry. There is no per-homeowner share
//     page and no session token in the link, so a shared URL can never be
//     replayed to read someone's results.
//   · The dollar waste estimate is left out too — it's an inference about the
//     homeowner's energy bills, and the score alone is the braggable number.

import type { GuzzlerTier } from "@/components/quiz/guzzler-tiers";

export type ShareChannel = "x" | "facebook" | "sms" | "copy" | "native";

/** Everything the share layer is allowed to know about a homeowner's result. */
export interface ShareableScore {
  score: number; // 0–100
  grade: string; // A+ … F
  tier: GuzzlerTier;
}

// Where a share recipient lands. The assessment itself rather than `/`: someone
// arriving from "what's your home's score?" has already made the decision the
// entry gate on `/` exists to resolve. Change this one constant to send shared
// traffic through the intent doors instead.
export const SHARE_LANDING_PATH = "/quiz";

// X counts every link as this many characters no matter its real length
// (t.co wrapping), so budget for it rather than for the URL we actually send.
const X_LINK_BUDGET = 23;
const X_MAX_CHARS = 280;

// One line per tier. A low score is a brag, a high score is a warning — the copy
// has to work at both ends without sounding like a loss either way.
const TIER_LINE: Record<GuzzlerTier, string> = {
  Mild: "Turns out my HVAC isn't the money pit I feared.",
  Moderate: "Turns out there's real money leaking out of my HVAC.",
  High: "Turns out my HVAC has been quietly draining my wallet.",
  Severe: "Turns out my HVAC is bleeding money every single month.",
};

/**
 * The brag line, without a URL. Every channel builds on this so the message a
 * homeowner sees in the preview is the message that actually goes out.
 */
export function buildShareText(result: ShareableScore): string {
  const score = clampScore(result.score);
  return (
    `I scored ${score}/100 on the Guzzler Score (Grade ${result.grade}) — ` +
    `${TIER_LINE[result.tier]} Took 60 seconds. What's your home's score?`
  );
}

/**
 * The public link recipients follow. `via` is share-channel attribution only —
 * it identifies the button, never the homeowner.
 */
export function buildShareUrl(origin: string, channel: ShareChannel): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}${SHARE_LANDING_PATH}?ref=share&via=${channel}`;
}

/** Brag line plus link, for the channels that carry their own text. */
export function buildShareMessage(result: ShareableScore, origin: string, channel: ShareChannel): string {
  return `${buildShareText(result)} ${buildShareUrl(origin, channel)}`;
}

/**
 * Trim the brag line so text + t.co-wrapped link fits a post. Cuts on a word
 * boundary and appends an ellipsis rather than slicing mid-word.
 */
export function fitForX(text: string): string {
  const budget = X_MAX_CHARS - X_LINK_BUDGET - 1; // -1 for the space before the link
  if (text.length <= budget) return text;
  const cut = text.slice(0, budget - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Intent URL for a post on X. */
export function buildXIntent(result: ShareableScore, origin: string): string {
  const params = new URLSearchParams({
    text: fitForX(buildShareText(result)),
    url: buildShareUrl(origin, "x"),
  });
  return `https://x.com/intent/post?${params.toString()}`;
}

/**
 * Facebook's share dialog takes a URL and nothing else — the `quote` parameter
 * has been ignored since 2017, and the preview is built from the destination's
 * Open Graph tags. The UI copies the brag line to the clipboard alongside this
 * so the homeowner can paste it into the post.
 */
export function buildFacebookIntent(origin: string): string {
  const params = new URLSearchParams({ u: buildShareUrl(origin, "facebook") });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

/**
 * Pre-filled SMS. `sms:?&body=` is the one spelling both iOS and Android accept
 * — iOS wants `&body`, Android wants `?body`, and this form satisfies both.
 */
export function buildSmsIntent(result: ShareableScore, origin: string): string {
  return `sms:?&body=${encodeURIComponent(buildShareMessage(result, origin, "sms"))}`;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
