import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Database, FileSearch, Radio, ShieldCheck } from "lucide-react";

interface AnalyzingTransitionProps {
  /** Called once the analysis animation completes. */
  onComplete: () => void;
  /** Total animation duration in ms. Default 4500. */
  durationMs?: number;
}

const STEPS = [
  { icon: Database, label: "Pulling County tax records..." },
  { icon: FileSearch, label: "Scanning permit history..." },
  { icon: Radio, label: "Cross-referencing system signals..." },
  { icon: ShieldCheck, label: "Building your evidence brief..." },
];

export default function AnalyzingTransition({
  onComplete,
  durationMs = 4500,
}: AnalyzingTransitionProps) {
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);
      const idx = Math.min(STEPS.length - 1, Math.floor((pct / 100) * STEPS.length));
      setStepIdx(idx);
      if (pct >= 100) {
        clearInterval(tick);
        onComplete();
      }
    }, 60);
    return () => clearInterval(tick);
  }, [durationMs, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="py-12 space-y-8"
    >
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          Intelligence Engine Active
        </div>
        <h2 className="font-display text-2xl md:text-3xl font-extrabold text-foreground leading-tight">
          Analyzing County Records<br />& Permit History...
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          We're cross-checking public property data with your answers to build an evidence-based brief — no guesswork.
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="w-full h-3 rounded-full bg-border overflow-hidden">
          <motion.div
            className="h-3 rounded-full gradient-teal"
            style={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
          <span>Cross-referencing sources</span>
          <span className="tabular-nums text-primary">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Step list */}
      <ul className="space-y-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const active = i === stepIdx;
          const done = i < stepIdx;
          return (
            <li
              key={step.label}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                active
                  ? "border-primary/40 bg-primary/5"
                  : done
                  ? "border-border bg-surface"
                  : "border-border bg-card opacity-60"
              }`}
            >
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  active
                    ? "bg-primary/15 text-primary"
                    : done
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={`text-sm ${
                  active
                    ? "font-semibold text-foreground"
                    : done
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
              {active && (
                <motion.div
                  className="ml-auto h-2 w-2 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
