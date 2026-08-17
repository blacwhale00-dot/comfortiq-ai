import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import CoraMascotFallback from "./CoraMascotFallback";
import RiveErrorBoundary from "./RiveErrorBoundary";
import { CORA_MASCOT_RIV } from "./cora-mascot-asset";
import type { CoraState } from "./cora-states";
import type { GuzzlerBand } from "@/lib/guzzler-band";

// Cora's avatar, everywhere. The one component every surface renders.
//
// Resolution order:
//   1. No .riv configured  → static mascot, Rive runtime never imported
//   2. .riv configured     → lazy-loaded animated canvas
//   3. .riv fails anything → static mascot (Suspense fallback, error boundary,
//                            and the runtime's own onLoadError all land here)
//
// Will's rule: "The mascot must never be a blank box." There is no code path
// through this component that renders nothing.

const CoraRiveCanvas = lazy(() => import("./CoraRiveCanvas"));

export interface CoraMascotProps {
  /** Which animation Cora is in. Defaults to idle. */
  state?: CoraState;
  /**
   * Drives the needle + arc glow on reveal. Pass this ONLY on the score-reveal
   * surface, and derive it with bandForTier() so it agrees with the gauge —
   * see the threshold conflict documented in src/lib/guzzler-band.ts.
   */
  band?: GuzzlerBand | null;
  /** Sizing/shape classes for the mascot box, e.g. "w-10 h-10". */
  className?: string;
  alt?: string;
}

export default function CoraMascot({
  state = "idle",
  band = null,
  className,
  alt = "Cora",
}: CoraMascotProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [offScreen, setOffScreen] = useState(false);
  const [riveFailed, setRiveFailed] = useState(false);

  const handleLoadError = useCallback(() => setRiveFailed(true), []);

  // Pause off-screen instances. Skipped entirely when there's no animation to
  // pause, and guarded for environments without IntersectionObserver (jsdom).
  const animated = Boolean(CORA_MASCOT_RIV) && !riveFailed;

  useEffect(() => {
    if (!animated) return;
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setOffScreen(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animated]);

  const fallback = <CoraMascotFallback band={band} alt={alt} className="h-full w-full" />;

  return (
    <span ref={hostRef} className={className} data-testid="cora-mascot">
      {animated && CORA_MASCOT_RIV ? (
        <RiveErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <CoraRiveCanvas
              src={CORA_MASCOT_RIV}
              state={state}
              band={band}
              paused={offScreen}
              className="h-full w-full"
              onLoadError={handleLoadError}
            />
          </Suspense>
        </RiveErrorBoundary>
      ) : (
        fallback
      )}
    </span>
  );
}
