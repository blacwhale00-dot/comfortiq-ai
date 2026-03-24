// ============================================================
// ComfortQuizUI — Beautiful HVAC quiz with Comfort AI
// Built by Tandem AI for ComfortIQ.AI
// Shows one question at a time, user controls the pace
// ============================================================

import { useState } from "react";
import { Check } from "lucide-react";
import { useComfortQuiz, QUIZ_STEPS } from "./ComfortQuizFlow";

// ─── TIER CALCULATOR ─────────────────────────────────────────

function calculateTier(answers: Record<string, string>): {
  tier: "hot" | "warm" | "cool" | "cold";
  score: number;
} {
  let score = 0;

  // System age
  if (answers.system_age === ">15") score += 30;
  else if (answers.system_age === "12-15") score += 22;
  else if (answers.system_age === "8-12") score += 12;
  else if (answers.system_age === "unknown") score += 15;

  // Comfort
  if (answers.comfort_issues === "1" || answers.comfort_issues === "2") score += 20;
  else if (answers.comfort_issues === "3") score += 12;

  // Bill
  if (answers.monthly_bill === ">500") score += 18;
  else if (answers.monthly_bill === "350-500") score += 14;
  else if (answers.monthly_bill === "250-350") score += 10;

  // Bill trend
  if (answers.bill_trend === "spiking") score += 15;
  else if (answers.bill_trend === "increasing") score += 8;

  // Breakdowns
  if (answers.breakdowns === ">3" || answers.breakdowns === "2") score += 18;
  else if (answers.breakdowns === "1") score += 8;

  // Urgency
  if (answers.urgency === "emergency") score += 20;
  else if (answers.urgency === "concerned") score += 12;
  else if (answers.urgency === "planning") score += 5;

  // Budget
  if (answers.budget === "crisis") score += 8;
  else if (answers.budget === "concerned") score += 4;

  score = Math.min(100, Math.max(0, score));

  let tier: "hot" | "warm" | "cool" | "cold";
  if (score >= 70) tier = "hot";
  else if (score >= 45) tier = "warm";
  else if (score >= 25) tier = "cool";
  else tier = "cold";

  return { tier, score };
}

const TIER_CONFIG = {
  hot: {
    color: "from-red-500 to-orange-500",
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
    label: "System Needs Attention",
    emoji: "🏠",
    headline: "Your home is telling us something urgent.",
    body: "Based on your answers, your HVAC system needs attention soon. The good news: we caught it before it became an emergency.",
    urgency: "Book your free assessment this week.",
  },
  warm: {
    color: "from-amber-500 to-yellow-500",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    label: "Room to Improve",
    emoji: "⚡",
    headline: "You're not in crisis — but you're paying for it.",
    body: "Your system is running harder than it should. You're spending more than necessary every month, and it's getting older.",
    urgency: "A free quote this month could save you thousands.",
  },
  cool: {
    color: "from-teal-500 to-cyan-500",
    bg: "bg-teal-50 border-teal-200",
    text: "text-teal-700",
    label: "Doing Fine — But Worth Watching",
    emoji: "✅",
    headline: "Your home is in decent shape.",
    body: "Nothing urgent, but there's a gap between where you are and where you could be. A small investment now prevents big problems later.",
    urgency: "A free inspection gives you a roadmap.",
  },
  cold: {
    color: "from-blue-500 to-teal-500",
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    label: "Home Sweet Home",
    emoji: "🌿",
    headline: "You're in good shape.",
    body: "No red flags. Your system is relatively young and running well. Just keep up with annual maintenance.",
    urgency: "No action needed. We'll check in later.",
  },
};

export default function ComfortQuizUI() {
  const {
    state,
    currentStep,
    progress,
    totalSteps,
    visibleStepIndex,
    isComplete,
    canGoBack,
    canSkip,
    setAnswer,
    nextStep,
    prevStep,
    getAICommentary,
  } = useComfortQuiz();

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [aiComment, setAiComment] = useState<string>("");
  const [showAiComment, setShowAiComment] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const handleSelect = (value: string, label: string) => {
    setSelectedAnswer(value);
    setAnswer(currentStep?.id ?? "", value, label);

    // Generate Comfort's AI commentary
    const comment = getAICommentary(currentStep?.id ?? "", value);
    setAiComment(comment);
    setShowAiComment(true);
  };

  const handleNext = () => {
    if (!selectedAnswer && !canSkip) return;
    setTransitioning(true);
    setShowAiComment(false);
    setSelectedAnswer(null);

    setTimeout(() => {
      nextStep();
      setTransitioning(false);
    }, 300);
  };

  const handleSkip = () => {
    setTransitioning(true);
    setShowAiComment(false);
    setSelectedAnswer(null);
    setTimeout(() => {
      nextStep();
      setTransitioning(false);
    }, 300);
  };

  const { tier, score } = calculateTier(state.answers);
  const tierConfig = TIER_CONFIG[tier];

  // ─── COMPLETE STATE ──────────────────────────────────────
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className={`rounded-3xl ${tierConfig.bg} border-2 p-6 mb-4`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{tier === "hot" ? "🔥" : tier === "warm" ? "⚡" : tier === "cool" ? "✅" : "🌿"}</span>
              <div>
                <p className={`text-sm font-semibold ${tierConfig.text}`}>{tierConfig.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">Readiness Score: {score}/100</p>
              </div>
            </div>
            <h2 className="text-xl font-display font-bold text-slate-900 mb-2">{tierConfig.headline}</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">{tierConfig.body}</p>
            <p className={`text-sm font-semibold ${tierConfig.text}`}>{tierConfig.urgency}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <p className="text-sm text-slate-500 mb-3">Your results are ready.</p>
            <p className="text-slate-700 font-medium mb-4">
              See your full HVAC readiness report with pricing tiers, financing options, and William's recommendations.
            </p>
            <button
              onClick={() => window.location.href = "/report"}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              View My Full Report
            </button>
            <p className="text-xs text-slate-400 mt-3">
              Powered by ComfortIQ.AI · William Macon, RS Andrews
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── QUESTION STATE ──────────────────────────────────────
  const step = currentStep;
  if (!step) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 z-10 px-4 py-3">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">
              {visibleStepIndex + 1} of {totalSteps}
            </span>
            <span className="text-xs text-teal-600 font-semibold">
              {progress}% complete
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* AI Commentary */}
      {showAiComment && aiComment && (
        <div className={`mx-4 mt-4 max-w-md mx-auto w-full transition-all duration-300 ${showAiComment ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                C
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{aiComment}</p>
            </div>
          </div>
        </div>
      )}

      {/* Question */}
      <div className={`flex-1 flex flex-col justify-center px-4 py-6 transition-all duration-300 ${transitioning ? "opacity-0 translate-x-4" : "opacity-100"}`}>
        <div className="max-w-md mx-auto w-full">
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-1">
            {step.question}
          </h2>
          {step.subtext && (
            <p className="text-sm text-slate-500 mb-6">{step.subtext}</p>
          )}

          {/* Options */}
          {step.type !== "photo" && step.options && (
            <div className="space-y-3">
              {step.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value, option.label)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
                    selectedAnswer === option.value
                      ? "border-teal-500 bg-teal-50 text-teal-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option.label}</span>
                    {selectedAnswer === option.value && (
                      <Check className="w-4 h-4 text-teal-600 shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Photo Upload */}
          {step.type === "photo" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-2xl bg-teal-50 border-2 border-dashed border-teal-300 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">PHOTO</span>
              </div>
              <p className="text-slate-600 text-sm mb-4">Tap to upload or take a photo</p>
              <button className="px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors">
                Upload Photo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-4">
        <div className="max-w-md mx-auto flex gap-3">
          {canGoBack && (
            <button
              onClick={prevStep}
              className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!selectedAnswer && !canSkip}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              selectedAnswer || canSkip
                ? "bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:opacity-90"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {visibleStepIndex === totalSteps - 1 ? "See My Results" : "Next"}
          </button>
        </div>
        {canSkip && !selectedAnswer && (
          <button
            onClick={handleSkip}
            className="block mx-auto mt-2 text-xs text-slate-400 hover:text-slate-600"
          >
            Skip this question
          </button>
        )}
      </div>
    </div>
  );
}
