// ============================================================
// ComfortQuizFlow — HVAC Quiz with Comfort AI responses
// Built by Tandem AI for ComfortIQ.AI
// Replaces Lovable's generic "great job" AI with Comfort's voice
// ============================================================

import { useState, useCallback } from "react";
import { analyzeHVACPhoto, analyzeBreakerPanel, analyzeWaterHeater, type QuizContext } from "./comfort-response-engine";

// ─── QUIZ STEPS ───────────────────────────────────────────────

export interface QuizAnswer {
  questionId: string;
  answer: string;
  label?: string;
}

export interface QuizState {
  currentStep: number;
  answers: Record<string, string>;
  photosUploaded: string[];
  score?: number;
  tier?: "hot" | "warm" | "cool" | "cold";
  powerTaxMonthly?: number;
  powerTaxAnnual?: number;
  readinessScore?: number;
}

interface QuizStep {
  id: string;
  question: string;
  subtext?: string;
  type: "single" | "multiple" | "text" | "photo";
  options?: { value: string; label: string }[];
  aiPrompt?: string; // What to tell Comfort after this answer
  skip?: boolean; // Steps that can be skipped
}

export const QUIZ_STEPS: QuizStep[] = [
  {
    id: "system_age",
    question: "How old is your HVAC system?",
    subtext: "Look for the serial number sticker on your outdoor unit",
    type: "single",
    options: [
      { value: "<8", label: "Under 8 years" },
      { value: "8-12", label: "8–12 years" },
      { value: "12-15", label: "12–15 years" },
      { value: ">15", label: "15+ years" },
      { value: "unknown", label: "Not sure" },
    ],
    aiPrompt: "System age: {answer}. Older systems (12+) typically have SEER ratings of 10 or lower, meaning they're losing 30-40% efficiency vs modern units.",
  },
  {
    id: "comfort_issues",
    question: "How would you rate your home's comfort?",
    subtext: "Think about hot spots, cold spots, and how often you adjust the thermostat",
    type: "single",
    options: [
      { value: "5", label: "Perfect — comfortable year-round" },
      { value: "4", label: "Good most of the time" },
      { value: "3", label: "Some hot or cold days" },
      { value: "2", label: "Often uncomfortable" },
      { value: "1", label: "Can't get comfortable at all" },
    ],
    aiPrompt: "Comfort score: {answer}/5. Lower scores mean the system is struggling to maintain temperature.",
  },
  {
    id: "monthly_bill",
    question: "What's your average monthly electric bill in summer?",
    subtext: "Look at your June–September bills from last year",
    type: "single",
    options: [
      { value: "<150", label: "Under $150" },
      { value: "150-250", label: "$150–$250" },
      { value: "250-350", label: "$250–$350" },
      { value: "350-500", label: "$350–$500" },
      { value: ">500", label: "Over $500" },
    ],
    aiPrompt: "Monthly bill: {answer}. Combined with system age, I can estimate their Power Tax — the amount they're overpaying due to an inefficient system.",
  },
  {
    id: "bill_trend",
    question: "How has your electric bill changed over the last year?",
    subtext: "Seasonal variation is normal — we're looking for consistent increases",
    type: "single",
    options: [
      { value: "stable", label: "About the same" },
      { value: "increasing", label: "Slowly going up" },
      { value: "spiking", label: "Spiking significantly" },
    ],
    aiPrompt: "Bill trend: {answer}. Spiking bills usually mean the compressor is working harder than it should.",
  },
  {
    id: "breakdowns",
    question: "How many times has your HVAC needed repair in the last 2 years?",
    subtext: "Not including routine maintenance like filter changes",
    type: "single",
    options: [
      { value: "0", label: "None — runs smoothly" },
      { value: "1", label: "Once" },
      { value: "2", label: "2–3 times" },
      { value: ">3", label: "More than 3 times" },
    ],
    aiPrompt: "Breakdown count: {answer}. Multiple breakdowns in 2 years signals a system that's on its way out.",
  },
  {
    id: "urgency",
    question: "What's motivating you to look into this today?",
    subtext: "Be honest — this helps us give you the right answer",
    type: "single",
    options: [
      { value: "curious", label: "Just curious, no rush" },
      { value: "planning", label: "Planning for the future" },
      { value: "concerned", label: "Something broke or acting weird" },
      { value: "emergency", label: "System is down right now" },
    ],
    aiPrompt: "Urgency level: {answer}. Emergency = hot lead. Curious = nurture sequence.",
  },
  {
    id: "budget",
    question: "How are you thinking about the budget for this?",
    type: "single",
    options: [
      { value: "prepared", label: "I've been saving for this" },
      { value: "managing", label: "I can manage the cost" },
      { value: "concerned", label: "Cost is a real concern" },
      { value: "crisis", label: "I need financing options" },
    ],
    aiPrompt: "Budget stress: {answer}. This determines which tier to recommend and whether to emphasize financing.",
  },
  {
    id: "outdoor_unit_photo",
    question: "Can you snap a photo of your outdoor AC unit?",
    subtext: "The serial number sticker is the most important part. It helps us date the unit exactly.",
    type: "photo",
    aiPrompt: "User uploaded outdoor unit photo. I'll decode the serial number to determine exact age and model.",
  },
  {
    id: "electric_bill_photo",
    question: "One more photo — your electric bill?",
    subtext: "A photo of the PDF or paper bill works great. The total and usage breakdown are what we need.",
    type: "photo",
    aiPrompt: "User uploaded electric bill. I'll run the Power Tax calculation to determine monthly overpayment.",
  },
  {
    id: "first_name",
    question: "What's your first name?",
    subtext: "So William knows who he's talking to",
    type: "text",
    aiPrompt: "First name: {answer}. I'll use this in all follow-up messages.",
    skip: true, // Can be skipped
  },
  {
    id: "zip_code",
    question: "And your zip code?",
    subtext: "So we can match you with the right contractor in your area",
    type: "text",
    aiPrompt: "Zip code: {answer}. This determines contractor availability and local pricing.",
    skip: true,
  },
];

// ─── USE COMFORT QUIZ HOOK ──────────────────────────────────

export function useComfortQuiz() {
  const [state, setState] = useState<QuizState>({
    currentStep: 0,
    answers: {},
    photosUploaded: [],
  });

  const [comfortContext, setComfortContext] = useState<Partial<QuizContext>>({});

  const currentStepData = QUIZ_STEPS[state.currentStep];
  const totalSteps = QUIZ_STEPS.filter((s) => !s.skip).length;
  const visibleStepIndex = QUIZ_STEPS.slice(0, state.currentStep).filter((s) => !s.skip).length;
  const progress = Math.round(((visibleStepIndex) / totalSteps) * 100);

  const setAnswer = useCallback((questionId: string, answer: string, label?: string) => {
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer },
    }));
  }, []);

  const addPhoto = useCallback((photoType: string) => {
    setState((prev) => ({
      ...prev,
      photosUploaded: [...prev.photosUploaded, photoType],
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, QUIZ_STEPS.length - 1),
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, Math.min(step, QUIZ_STEPS.length - 1)),
    }));
  }, []);

  // Generate AI response after an answer
  const getAICommentary = useCallback((questionId: string, answer: string): string => {
    const step = QUIZ_STEPS.find((s) => s.id === questionId);
    if (!step?.aiPrompt) return "";

    let response = step.aiPrompt.replace("{answer}", answer);

    // Add tier context for relevant questions
    if (questionId === "system_age") {
      const ageMessages: Record<string, string> = {
        "<8": "Solid. Under 8 years old — your system is still in its prime. You've got time.",
        "8-12": "Okay, 8-12 years. That's mid-life. Things start needing more attention here. Nothing urgent yet.",
        "12-15": "12-15 years old puts you in the window where systems start showing their age. I'd start planning for a replacement in the next 1-2 years.",
        ">15": "15+ years means your system is past its typical lifespan. You're in nursing-it-along territory. The math usually starts favoring replacement at this point.",
        "unknown": "No worries. If you can find the serial number sticker on the outdoor unit, I can usually date it exactly. Upload a photo if you've got one.",
      };
      return ageMessages[answer] ?? response;
    }

    if (questionId === "comfort_issues") {
      const scores: Record<string, string> = {
        "5": "Perfect comfort — that's what everyone's aiming for. Nothing to fix here.",
        "4": "Good enough for most days. Small improvements possible.",
        "3": "Some hot or cold days is pretty common in Atlanta attics. Worth looking into.",
        "2": "Often uncomfortable means your system is working too hard. Let's see what's driving that.",
        "1": "Can't get comfortable at all is a sign the system is struggling. Let's get you some answers.",
      };
      return scores[answer] ?? response;
    }

    if (questionId === "breakdowns") {
      if (answer === "0") return "No breakdowns — that's great. System is reliable. Still worth keeping an eye on efficiency though.";
      if (answer === "1") return "One repair is normal wear and tear. Nothing to worry about yet.";
      if (answer === "2" || answer === ">3") return "Multiple repairs in two years is a pattern. That usually means the system is declining faster than normal. Let's look at the full picture.";
      return response;
    }

    if (questionId === "monthly_bill") {
      const bills: Record<string, string> = {
        "<150": "Under $150 is pretty efficient for Atlanta summer. You're doing well.",
        "150-250": "$150-250 is normal for most Atlanta homes. We can usually find some savings here.",
        "250-350": "$250-350 is on the higher side. Your system is probably working overtime.",
        "350-500": "$350-500/month in summer means your system is likely losing significant efficiency. Let's find out why.",
        ">500": "Over $500 is a red flag. That usually means a system that's severely struggling or a home with efficiency problems.",
      };
      return bills[answer] ?? response;
    }

    return response;
  }, []);

  const isComplete = state.currentStep === QUIZ_STEPS.length - 1 &&
    Object.keys(state.answers).length >= 5;

  const canGoBack = state.currentStep > 0;
  const canSkip = currentStepData?.skip === true;

  return {
    state,
    currentStep: currentStepData,
    progress,
    totalSteps,
    visibleStepIndex,
    isComplete,
    canGoBack,
    canSkip,
    setAnswer,
    addPhoto,
    nextStep,
    prevStep,
    goToStep,
    getAICommentary,
    quizSteps: QUIZ_STEPS,
  };
}
