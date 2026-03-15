import { motion } from "framer-motion";

interface PainPointSliderProps {
  question: string;
  labels: [string, string];
  value: number;
  onChange: (val: number) => void;
  index: number;
}

const levelColors = [
  "bg-primary/20 text-primary",
  "bg-primary/30 text-primary",
  "bg-amber/30 text-amber-foreground",
  "bg-destructive/20 text-destructive",
  "bg-destructive/30 text-destructive",
];

export default function PainPointSlider({ question, labels, value, onChange, index }: PainPointSliderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="p-4 rounded-xl bg-surface border border-border"
    >
      <p className="text-sm font-medium text-foreground mb-3">{question}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
              value === level
                ? `${levelColors[level - 1]} border-current shadow-sm scale-105`
                : "border-border bg-background text-muted-foreground hover:border-primary/30"
            }`}
          >
            {level}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[11px] text-muted-foreground">{labels[0]}</span>
        <span className="text-[11px] text-muted-foreground">{labels[1]}</span>
      </div>
    </motion.div>
  );
}
