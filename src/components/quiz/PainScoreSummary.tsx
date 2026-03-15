import { motion } from "framer-motion";
import { painPoints } from "./painPointConfig";

interface PainScoreSummaryProps {
  scores: Record<string, number>;
}

const shortLabels: Record<string, string> = {
  pain_temperature: "Temperature",
  pain_bills: "Bills",
  pain_system_age: "System Age",
  pain_emergencies: "Breakdowns",
  pain_confusion: "Confusion",
  pain_health: "Health",
  pain_trust: "Trust",
  pain_moisture: "Moisture",
  pain_financial: "Financial",
  pain_confidence: "Confidence",
};

const barColor = (val: number) => {
  if (val <= 2) return "bg-primary";
  if (val <= 3) return "bg-amber-400";
  return "bg-destructive";
};

export default function PainScoreSummary({ scores }: PainScoreSummaryProps) {
  const sorted = [...painPoints].sort((a, b) => (scores[b.key] ?? 0) - (scores[a.key] ?? 0));
  const topPains = sorted.filter((p) => (scores[p.key] ?? 0) >= 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 p-5 md:p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📊</span>
        <h3 className="font-display font-bold text-foreground text-sm">Your Pain Point Summary</h3>
      </div>

      {/* Bar chart */}
      <div className="space-y-2.5 mb-5">
        {sorted.map((pp, i) => {
          const val = scores[pp.key] ?? 3;
          return (
            <motion.div
              key={pp.key}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <span className="text-xs text-muted-foreground w-24 shrink-0 text-right font-medium">
                {shortLabels[pp.key]}
              </span>
              <div className="flex-1 h-5 bg-border/50 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(val / 5) * 100}%` }}
                  transition={{ delay: i * 0.04 + 0.1, duration: 0.5, ease: "easeOut" }}
                  className={`h-full rounded-full ${barColor(val)}`}
                />
              </div>
              <span className="text-xs font-bold text-foreground w-5 text-center">{val}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Insight */}
      {topPains.length > 0 && (
        <div className="rounded-xl bg-background border border-border p-3.5">
          <p className="text-xs font-semibold text-primary mb-1">🔍 Key Insights</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your biggest concerns are{" "}
            <span className="font-semibold text-foreground">
              {topPains.map((p) => shortLabels[p.key].toLowerCase()).join(", ")}
            </span>
            . We'll factor these into your personalized recommendation.
          </p>
        </div>
      )}
    </motion.div>
  );
}
