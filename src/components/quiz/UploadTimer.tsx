import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Hourglass } from "lucide-react";
import {
  computeGuzzlerTimer,
  formatCountdown,
  type GuzzlerTimer,
  type TimerPhase,
} from "@/lib/guzzler-timer";

// Phase → presentation only. The engine (guzzler-timer.ts) owns WHEN each phase
// applies; this map owns how each one LOOKS. "critical" pulses; "expired" greys
// out with the hourglass tipped over (sand run out).
const PHASE_STYLES: Record<
  TimerPhase,
  { container: string; icon: string; value: string; label: string; pulse: boolean }
> = {
  normal: {
    container: "border-primary/30 bg-primary/5",
    icon: "text-primary",
    value: "text-primary",
    label: "Your $900 window is open",
    pulse: false,
  },
  amber: {
    container: "border-accent/40 bg-accent/10",
    icon: "text-accent",
    value: "text-accent",
    label: "Less than 24 hours left",
    pulse: false,
  },
  red: {
    container: "border-destructive/40 bg-destructive/10",
    icon: "text-destructive",
    value: "text-destructive",
    label: "Closing soon — under 6 hours",
    pulse: false,
  },
  critical: {
    container: "border-destructive/60 bg-destructive/15",
    icon: "text-destructive",
    value: "text-destructive",
    label: "Final hour — don't lose your discount",
    pulse: true,
  },
  expired: {
    container: "border-border bg-muted",
    icon: "text-muted-foreground",
    value: "text-muted-foreground",
    label: "Window Closed",
    pulse: false,
  },
};

interface UploadTimerProps {
  /** When the 48h window opened (quiz completion). null → engine shows full window. */
  startedAt: string | null;
  /** Fired once when the window expires — used to route/lock into the Incomplete Funnel. */
  onExpire?: () => void;
  /** Fired whenever the phase changes — lets Cora react to the urgency. */
  onPhaseChange?: (phase: TimerPhase) => void;
}

/**
 * Persistent hourglass countdown for the photo-upload flow. Ticks every second,
 * mapping the engine-provided timer to visual urgency states; greys out and shows
 * "Window Closed" on expiry.
 */
export default function UploadTimer({ startedAt, onExpire, onPhaseChange }: UploadTimerProps) {
  const [timer, setTimer] = useState<GuzzlerTimer>(() => computeGuzzlerTimer(startedAt));
  const firedExpire = useRef(false);
  const lastPhase = useRef<TimerPhase | null>(null);

  // Recompute immediately when the anchor resolves, then tick every second.
  useEffect(() => {
    const update = () => setTimer(computeGuzzlerTimer(startedAt));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Notify the parent on phase changes (Cora urgency) and once on expiry (route/lock).
  useEffect(() => {
    if (lastPhase.current !== timer.phase) {
      lastPhase.current = timer.phase;
      onPhaseChange?.(timer.phase);
    }
    if (timer.is_expired && !firedExpire.current) {
      firedExpire.current = true;
      onExpire?.();
    }
  }, [timer.phase, timer.is_expired, onPhaseChange, onExpire]);

  const style = PHASE_STYLES[timer.phase];
  const expired = timer.is_expired;

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Upload window: ${expired ? "closed" : `${formatCountdown(timer.remaining_ms)} remaining`}`}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${style.container} ${
        style.pulse ? "animate-pulse" : ""
      }`}
    >
      <motion.div
        animate={expired ? { rotate: 180, opacity: 0.5 } : { rotate: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`shrink-0 ${style.icon}`}
      >
        <Hourglass className="w-6 h-6" />
      </motion.div>
      <div className="min-w-0">
        <p
          className={`font-display font-extrabold tabular-nums text-xl leading-none ${style.value} ${
            expired ? "line-through decoration-2" : ""
          }`}
        >
          {expired ? "00:00:00" : formatCountdown(timer.remaining_ms)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{style.label}</p>
      </div>
    </div>
  );
}
