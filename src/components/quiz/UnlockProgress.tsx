import { motion } from "framer-motion";
import { Lock } from "lucide-react";

interface UnlockProgressProps {
  unlocked: number;
  max: number;
  label?: string;
}

export default function UnlockProgress({
  unlocked,
  max,
  label = "Home Efficiency Discount",
}: UnlockProgressProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (unlocked / max) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="bg-background rounded-2xl shadow-card border border-border p-6"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-display font-bold text-foreground tabular-nums">
          <span className="text-primary">${unlocked}</span> / ${max}
        </p>
      </div>

      <div className="w-full bg-border rounded-full h-3 overflow-hidden">
        <motion.div
          className="h-3 rounded-full gradient-teal"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.4 }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5 text-primary" />
        Quiz complete — unlock the rest with quick equipment photos.
      </p>
    </motion.div>
  );
}
