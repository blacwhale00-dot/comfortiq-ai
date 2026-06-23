import { motion } from "framer-motion";
import type { CategoryScore } from "./GuzzlerResults";

// Higher score = more waste, so the bar/grade get hotter as it climbs.
const barTone = (score: number) =>
  score >= 70 ? "bg-destructive" : score >= 45 ? "bg-amber" : "bg-primary";
const gradeTone = (score: number) =>
  score >= 70 ? "text-destructive" : score >= 45 ? "text-amber" : "text-primary";

interface CategoryBreakdownProps {
  categories: CategoryScore[];
}

export default function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="bg-background rounded-2xl shadow-card border border-border p-6"
    >
      <h3 className="font-display font-bold text-foreground text-sm mb-4 tracking-wide uppercase">
        Category Breakdown
      </h3>

      <div className="space-y-4">
        {categories.map((c, i) => (
          <div key={c.key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-foreground">{c.label}</span>
              <span className={`text-sm font-display font-bold ${gradeTone(c.score)}`}>{c.grade}</span>
            </div>
            <div className="w-full bg-border rounded-full h-2 overflow-hidden">
              <motion.div
                className={`h-2 rounded-full ${barTone(c.score)}`}
                initial={{ width: 0 }}
                animate={{ width: `${c.score}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 + i * 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">
        Higher bars mean more energy and money lost in that category.
      </p>
    </motion.div>
  );
}
