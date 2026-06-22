import { motion } from "framer-motion";
import { QuizQuestion } from "./conciergeConfig";

interface ConciergeQuestionProps {
  question: QuizQuestion;
  value: string | number;
  onSelect: (val: string | number) => void;
  /** Once Cora's response is showing, lock the options so taps don't reset the flow. */
  locked?: boolean;
}

const slideVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

export default function ConciergeQuestion({ question, value, onSelect, locked }: ConciergeQuestionProps) {
  const handleChoice = (val: string) => {
    if (locked) return;
    // Record the selection. The parent waits ~1.5-2s, then fades in Cora's
    // answer-specific response with a Next button — no auto-advance here.
    onSelect(val);
  };

  return (
    <motion.div
      key={question.id}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold text-foreground leading-tight">
          {question.question}
        </h2>
        {question.subtext && (
          <p className="text-sm text-muted-foreground mt-2">{question.subtext}</p>
        )}
      </div>

      <div className="space-y-3">
        {question.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleChoice(opt.value)}
            disabled={locked && String(value) !== opt.value}
            className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl border-2 text-left transition-all duration-200 ${String(value) === opt.value
                ? "border-primary bg-primary/5 shadow-card"
                : "border-border bg-background hover:border-primary/30 hover:bg-surface"
              } ${locked ? "cursor-default" : ""}`}
          >
            {opt.emoji && <span className="text-xl">{opt.emoji}</span>}
            <span className="text-sm font-medium text-foreground">{opt.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
