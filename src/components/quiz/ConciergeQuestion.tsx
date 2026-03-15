import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    // Auto-advance after a brief pause for choice/boolean
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
      {/* Question */}
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold text-foreground leading-tight">
          {question.question}
        </h2>
        {question.subtext && (
          <p className="text-sm text-muted-foreground mt-2">{question.subtext}</p>
        )}
      </div>

      {/* Answer UI */}
      {question.type === "slider" && (
        <div className="space-y-4 pt-2">
          <input
            type="range"
            min={question.sliderMin ?? 1}
            max={question.sliderMax ?? 5}
            step={1}
            value={Number(value)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2.5 rounded-full bg-border appearance-none cursor-pointer"
            style={{ accentColor: "hsl(181, 82%, 25%)" }}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-muted-foreground">{question.sliderLabels?.[0]}</span>
            <span className="text-2xl font-display font-bold text-primary">{value}</span>
            <span className="text-xs font-medium text-muted-foreground">{question.sliderLabels?.[1]}</span>
          </div>
          <button
            onClick={onNext}
            className="w-full mt-2 py-3.5 rounded-xl gradient-teal text-primary-foreground font-display font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </div>
      )}

      {(question.type === "choice" || question.type === "boolean") && question.options && (
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
      )}
    </motion.div>
  );
}
