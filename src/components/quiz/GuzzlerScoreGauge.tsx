import { motion } from "framer-motion";
import { Gauge } from "lucide-react";

interface GuzzlerScoreGaugeProps {
  score: number;
  tier: "Mild" | "Moderate" | "High" | "Severe";
}

const TIER_STYLES: Record<GuzzlerScoreGaugeProps["tier"], { ring: string; text: string; glow: string; bg: string }> = {
  Mild: {
    ring: "stroke-primary",
    text: "text-primary",
    glow: "shadow-[0_0_40px_hsl(var(--primary)/0.25)]",
    bg: "bg-primary/5",
  },
  Moderate: {
    ring: "stroke-amber",
    text: "text-amber",
    glow: "shadow-[0_0_40px_hsl(var(--amber)/0.3)]",
    bg: "bg-amber/5",
  },
  High: {
    ring: "stroke-amber",
    text: "text-amber",
    glow: "shadow-[0_0_50px_hsl(var(--amber)/0.4)]",
    bg: "bg-amber/10",
  },
  Severe: {
    ring: "stroke-destructive",
    text: "text-destructive",
    glow: "shadow-[0_0_60px_hsl(var(--destructive)/0.35)]",
    bg: "bg-destructive/5",
  },
};

export default function GuzzlerScoreGauge({ score, tier }: GuzzlerScoreGaugeProps) {
  const style = TIER_STYLES[tier];
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`rounded-2xl ${style.bg} border border-border p-6 md:p-8 text-center ${style.glow}`}
    >
      <div className="inline-flex items-center gap-1.5 bg-foreground/5 text-foreground/70 px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase mb-5">
        <Gauge className="w-3.5 h-3.5" />
        Home Guzzler Score
      </div>

      <div className="relative inline-flex items-center justify-center mb-4">
        <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90">
          <circle
            cx="110"
            cy="110"
            r={radius}
            strokeWidth="14"
            className="stroke-border fill-none"
          />
          <motion.circle
            cx="110"
            cy="110"
            r={radius}
            strokeWidth="14"
            strokeLinecap="round"
            className={`${style.ring} fill-none`}
            initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className={`text-6xl font-display font-extrabold ${style.text} tabular-nums`}
          >
            {clamped}
          </motion.span>
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mt-1">
            / 100
          </span>
        </div>
      </div>

      <h2 className={`text-2xl md:text-3xl font-display font-extrabold ${style.text} mb-1`}>
        {tier} Guzzler
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        {tier === "Severe"
          ? "Your home is bleeding energy. Replacement is the highest-ROI move you can make."
          : tier === "High"
          ? "Significant waste detected. A modernization will pay you back fast."
          : tier === "Moderate"
          ? "Real savings on the table. Worth a closer look."
          : "Your home is running efficiently — let's keep it that way."}
      </p>
    </motion.div>
  );
}
