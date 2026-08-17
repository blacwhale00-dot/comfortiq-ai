import { CORA_MASCOT_PNG } from "./cora-mascot-asset";
import { BAND_ORDER, type GuzzlerBand } from "@/lib/guzzler-band";

// The non-animated Cora. Three jobs, in priority order:
//   1. Will's approved static PNG, once cora-mascot-asset.ts points at it —
//      this is the "ship the static swap FIRST" deliverable.
//   2. The load-failure fallback for the Rive canvas. Will's rule: "The mascot
//      must never be a blank box."
//   3. Until the PNG exists, a neutral inline-SVG gauge so the human avatar
//      could be removed immediately without leaving a hole.
//
// The SVG is deliberately plain — it is a placeholder for approved artwork, not
// an attempt at it. It uses theme tokens so it can never clash with the palette.

interface CoraMascotFallbackProps {
  /** Drives the needle angle + arc color. Omitted = neutral/idle needle. */
  band?: GuzzlerBand | null;
  className?: string;
  alt?: string;
}

// Needle sweep across a 180° dial: one slot per band, read at the slot's center
// so the neutral (bandless) needle sits straight up.
const NEEDLE_ANGLE: Record<GuzzlerBand, number> = {
  sipping: -67.5,
  steady: -22.5,
  drinking: 22.5,
  bleeding: 67.5,
};

// Mirrors TIER_PRESENTATION's severity ramp (primary → amber → destructive) so
// the placeholder can't drift from the gauge it sits next to.
const ARC_COLOR: Record<GuzzlerBand, string> = {
  sipping: "hsl(var(--primary))",
  steady: "hsl(var(--amber))",
  drinking: "hsl(var(--amber))",
  bleeding: "hsl(var(--destructive))",
};

export default function CoraMascotFallback({
  band,
  className,
  alt = "Cora",
}: CoraMascotFallbackProps) {
  if (CORA_MASCOT_PNG) {
    return <img src={CORA_MASCOT_PNG} alt={alt} className={className} />;
  }

  const angle = band ? NEEDLE_ANGLE[band] : 0;
  const accent = band ? ARC_COLOR[band] : "hsl(var(--primary))";

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={alt}
      data-testid="cora-mascot-fallback"
    >
      <circle cx="32" cy="32" r="30" fill="hsl(var(--primary) / 0.08)" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="hsl(var(--primary) / 0.25)" strokeWidth="2" />
      {/* Dial arc — 180°, colored by band on reveal. */}
      <path
        d="M 12 38 A 20 20 0 0 1 52 38"
        fill="none"
        stroke={accent}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Needle — Cora's "expression". */}
      <g transform={`rotate(${angle} 32 38)`}>
        <line x1="32" y1="38" x2="32" y2="21" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="32" cy="38" r="3.5" fill={accent} />
      {/* Eyes, so the gauge reads as a character rather than an instrument. */}
      <circle cx="24" cy="27" r="2" fill="hsl(var(--foreground) / 0.7)" />
      <circle cx="40" cy="27" r="2" fill="hsl(var(--foreground) / 0.7)" />
    </svg>
  );
}

// Re-exported for the tests that pin the placeholder's band coverage.
export const FALLBACK_BANDS = BAND_ORDER;
