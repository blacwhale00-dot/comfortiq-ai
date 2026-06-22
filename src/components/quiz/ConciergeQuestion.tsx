import { motion } from "framer-motion";
import { QuizQuestion } from "./conciergeConfig";

interface ConciergeQuestionProps {
  question: QuizQuestion;
  value: string | number;
  onChange: (val: string | number) => void;
  onNext: () => void;
}

const slideVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

export default function ConciergeQuestion({ question, value, onChange, onNext }: ConciergeQuestionProps) {
  const handleChoice = (val: string) => {
    onChange(val);
    // Auto-advance after a brief pause so the user can see their selection register.
    setTimeout(onNext, 400);
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
            className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl border-2 text-left transition-all duration-200 ${
              String(value) === opt.value
                ? "border-primary bg-primary/5 shadow-card"
                : "border-border bg-background hover:border-primary/30 hover:bg-surface"
            }`}
          >
            {opt.emoji && <span className="text-xl">{opt.emoji}</span>}
            <span className="text-sm font-medium text-foreground">{opt.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
