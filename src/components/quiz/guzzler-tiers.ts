// Single source of truth for how each Guzzler severity tier is presented.
// The tier *thresholds* live in the engine (tierForScore, src/lib/guzzler-score.ts);
// this module owns the tier *vocabulary + styling* so the gauge, waste summary,
// and any future consumer can't drift into different colors or copy.

import type { GuzzlerResultsData } from "./GuzzlerResults";

export type GuzzlerTier = GuzzlerResultsData["tier"];

export interface TierPresentation {
  ring: string; // gauge progress stroke
  text: string; // headline / accent text color
  glow: string; // gauge halo
  bg: string; // gauge card background
  box: string; // bordered callout background (waste estimate)
  chip: string; // numbered chip / pill
  blurb: string; // one-line gauge description
}

export const TIER_PRESENTATION: Record<GuzzlerTier, TierPresentation> = {
  Mild: {
    ring: "stroke-primary",
    text: "text-primary",
    glow: "shadow-[0_0_40px_hsl(var(--primary)/0.25)]",
    bg: "bg-primary/5",
    box: "bg-primary/5 border-primary/20",
    chip: "bg-primary/10 text-primary",
    blurb: "Your home is running efficiently — let's keep it that way.",
  },
  Moderate: {
    ring: "stroke-amber",
    text: "text-amber",
    glow: "shadow-[0_0_40px_hsl(var(--amber)/0.3)]",
    bg: "bg-amber/5",
    box: "bg-amber/5 border-amber/20",
    chip: "bg-amber/10 text-amber",
    blurb: "Real savings on the table. Worth a closer look.",
  },
  High: {
    ring: "stroke-amber",
    text: "text-amber",
    glow: "shadow-[0_0_50px_hsl(var(--amber)/0.4)]",
    bg: "bg-amber/10",
    box: "bg-amber/5 border-amber/20",
    chip: "bg-amber/10 text-amber",
    blurb: "Significant waste detected. A modernization will pay you back fast.",
  },
  Severe: {
    ring: "stroke-destructive",
    text: "text-destructive",
    glow: "shadow-[0_0_60px_hsl(var(--destructive)/0.35)]",
    bg: "bg-destructive/5",
    box: "bg-destructive/5 border-destructive/20",
    chip: "bg-destructive/10 text-destructive",
    blurb: "Your home is bleeding energy. Replacement is the highest-ROI move you can make.",
  },
};
