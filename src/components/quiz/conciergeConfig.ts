export interface QuizQuestion {
  id: string;
  dbKey: string;
  question: string;
  subtext?: string;
  type: "slider" | "choice" | "boolean";
  options?: { value: string; label: string; emoji?: string }[];
  sliderLabels?: [string, string];
  sliderMin?: number;
  sliderMax?: number;
}

export const quizQuestions: QuizQuestion[] = [
  {
    id: "temperature",
    dbKey: "pain_temperature",
    question: "How often is your home too hot or too cold?",
    subtext: "Think about those rooms that never seem right.",
    type: "slider",
    sliderLabels: ["Never", "Constantly"],
    sliderMin: 1,
    sliderMax: 5,
  },
  {
    id: "bills",
    dbKey: "pain_bills",
    question: "Have your energy bills jumped recently?",
    subtext: "Compare your bills from last year to this year.",
    type: "choice",
    options: [
      { value: "low", label: "No real change", emoji: "✅" },
      { value: "med", label: "Noticeable increase", emoji: "📈" },
      { value: "high", label: "Major spike", emoji: "🔥" },
    ],
  },
  {
    id: "system_age",
    dbKey: "pain_system_age",
    question: "How old is your current HVAC system?",
    subtext: "Check the label on your unit if you're not sure.",
    type: "choice",
    options: [
      { value: "<8", label: "Under 8 years", emoji: "🆕" },
      { value: "8-12", label: "8–12 years", emoji: "⏳" },
      { value: "12-15", label: "12–15 years", emoji: "⚠️" },
      { value: ">15", label: "Over 15 years", emoji: "🔧" },
    ],
  },
  {
    id: "emergencies",
    dbKey: "pain_emergencies",
    question: "How many breakdowns have you had in the last 2 years?",
    subtext: "Include any emergency repair calls.",
    type: "boolean",
    options: [
      { value: "false", label: "None", emoji: "👍" },
      { value: "true", label: "At least one", emoji: "🚨" },
    ],
  },
  {
    id: "confusion",
    dbKey: "pain_confusion",
    question: "Is it clear to you whether to repair or replace?",
    subtext: "No judgment — most homeowners feel unsure here.",
    type: "slider",
    sliderLabels: ["Very clear", "Totally lost"],
    sliderMin: 1,
    sliderMax: 5,
  },
  {
    id: "health",
    dbKey: "pain_health",
    question: "Any allergies or breathing issues in your home?",
    subtext: "This includes dust, asthma, or stuffy air.",
    type: "boolean",
    options: [
      { value: "false", label: "No issues", emoji: "😊" },
      { value: "true", label: "Yes, we struggle with this", emoji: "🤧" },
    ],
  },
  {
    id: "trust",
    dbKey: "pain_trust",
    question: "How confusing has dealing with HVAC contractors been?",
    subtext: "Think about past quotes, upsells, or unclear explanations.",
    type: "slider",
    sliderLabels: ["Always clear", "Never trust them"],
    sliderMin: 1,
    sliderMax: 5,
  },
  {
    id: "moisture",
    dbKey: "pain_moisture",
    question: "Do you notice musty smells or moisture in your home?",
    subtext: "Basements, crawl spaces, or certain rooms.",
    type: "slider",
    sliderLabels: ["Never", "Always"],
    sliderMin: 1,
    sliderMax: 5,
  },
  {
    id: "financial",
    dbKey: "pain_financial",
    question: "How stressful is the expense of HVAC for your household?",
    subtext: "Be honest — this helps us find the right budget path.",
    type: "choice",
    options: [
      { value: "low", label: "We're prepared", emoji: "💪" },
      { value: "med", label: "It's a stretch", emoji: "😬" },
      { value: "high", label: "Crisis mode", emoji: "😰" },
    ],
  },
  {
    id: "confidence",
    dbKey: "pain_confidence",
    question: "How confident are you about choosing the right system?",
    subtext: "From 'I've done my research' to 'I have no idea where to start.'",
    type: "slider",
    sliderLabels: ["Very confident", "No idea"],
    sliderMin: 1,
    sliderMax: 5,
  },
];

// Mirror responses keyed by question id + answer value
export type MirrorKey = string;

export function getMirrorResponse(questionId: string, value: string | number): string {
  const v = String(value);

  const mirrors: Record<string, Record<string, string> | ((v: string) => string)> = {
    temperature: (val) => {
      const n = Number(val);
      if (n <= 2) return "Good — a consistent home is the baseline of comfort. Let's see how your bills are holding up.";
      if (n <= 3) return "Some inconsistency is normal, but it shouldn't be the norm. Let's dig deeper.";
      return "That's a red flag. Constant temperature swings usually point to a system that's struggling. Let's look at your energy costs next.";
    },
    bills: {
      low: "That's great news. Steady bills mean your system is at least running efficiently for now. Let's check on its age.",
      med: "A noticeable bump is worth watching. It could be rate increases — or your system working harder than it should.",
      high: "I suspected as much. That jump usually indicates a 'SEER Gap' where you're overpaying for wasted energy. Let's see how the age of your system factors in next.",
    },
    system_age: {
      "<8": "You're in great shape age-wise. Modern systems have a lot of life left. Let's see if anything else needs attention.",
      "8-12": "You're in the mid-life zone. Performance can start slipping here. Let's check for other warning signs.",
      "12-15": "Getting into the replacement conversation window. Many systems start showing their age around here.",
      ">15": "You're in the 'Nursing it along' zone. It's common in Atlanta, but we need to see if you're throwing good money after bad. Let's look at your reliability next.",
    },
    emergencies: {
      false: "No breakdowns is a good sign. Let's see if there's any confusion about your system's future.",
      true: "Emergency calls are stressful and expensive. That's a pattern worth addressing before the next one hits.",
    },
    confusion: (val) => {
      const n = Number(val);
      if (n <= 2) return "You've got a clear head about this — that's rare and valuable. Let's keep going.";
      if (n <= 3) return "Some uncertainty is completely normal. That's exactly why we're here.";
      return "You're not alone. Most homeowners feel lost here. That's what this assessment is designed to fix.";
    },
    health: {
      false: "That's one less thing to worry about. Let's move on to your contractor experience.",
      true: "Air quality impacts health more than most people realize. We'll factor this into your recommendation — it matters.",
    },
    trust: (val) => {
      const n = Number(val);
      if (n <= 2) return "You've found good people — that's half the battle. Let's check your home environment next.";
      if (n <= 3) return "Mixed experiences are the industry norm, unfortunately. We're here to change that.";
      return "I hear this a lot. The HVAC industry has a trust problem, and that's exactly why ComfortIQ exists — full transparency, no games.";
    },
    moisture: (val) => {
      const n = Number(val);
      if (n <= 2) return "Good — moisture control is key to a healthy home. Let's talk about budget next.";
      if (n <= 3) return "Occasional mustiness can signal humidity issues. Worth keeping an eye on.";
      return "Persistent moisture is a serious concern — it affects air quality, health, and even your home's structure. We'll address this.";
    },
    financial: {
      low: "Being prepared makes the whole process smoother. Let's wrap up with one final question.",
      med: "That's honest and helpful. There are financing options that can make this much more manageable.",
      high: "I understand. HVAC costs can feel overwhelming. The good news? The $900 credit and smart financing can change the math entirely.",
    },
    confidence: (val) => {
      const n = Number(val);
      if (n <= 2) return "You've done your homework. Let me put together your personalized readiness profile.";
      if (n <= 3) return "A healthy level of caution. Your results will give you the clarity you need.";
      return "That's exactly why you're here. In about 30 seconds, you'll have a clear picture of exactly where you stand.";
    },
  };

  const handler = mirrors[questionId];
  if (!handler) return "Got it. Let's keep going.";
  if (typeof handler === "function") return handler(v);
  return handler[v] ?? "Got it. Let's keep going.";
}

// Derived variables from quiz answers
export interface DerivedVariables {
  comfort_score: number; // 1-5
  bill_pain: "low" | "med" | "high";
  age_band: "<8" | "8-12" | "12-15" | ">15";
  emergency_history: boolean;
  iaq_issues: boolean;
  budget_stress: boolean;
}

export function deriveVariables(answers: Record<string, string | number>): DerivedVariables {
  return {
    comfort_score: Number(answers.temperature) || 3,
    bill_pain: (answers.bills as "low" | "med" | "high") || "low",
    age_band: (answers.system_age as DerivedVariables["age_band"]) || "<8",
    emergency_history: answers.emergencies === "true",
    iaq_issues: answers.health === "true",
    budget_stress: answers.financial === "high",
  };
}

export interface ReadinessProfile {
  title: string;
  subtitle: string;
  score: number;
  bullets: string[];
  color: "teal" | "amber" | "red";
}

export function calculateProfile(vars: DerivedVariables, answers: Record<string, string | number>): ReadinessProfile {
  // Score calculation (0-100)
  let score = 50;
  score += (Number(answers.temperature) || 3) * 4;
  score += vars.bill_pain === "high" ? 15 : vars.bill_pain === "med" ? 8 : 0;
  score += vars.age_band === ">15" ? 20 : vars.age_band === "12-15" ? 12 : vars.age_band === "8-12" ? 5 : 0;
  score += vars.emergency_history ? 10 : 0;
  score += vars.iaq_issues ? 5 : 0;
  score += vars.budget_stress ? 5 : 0;
  score += (Number(answers.confidence) || 3) * 2;
  score = Math.min(100, Math.max(15, score));

  // Profile assignment
  if (vars.comfort_score >= 4 || vars.age_band === ">15") {
    return {
      title: "System Survivor",
      subtitle: "Your system is showing serious signs of strain",
      score,
      bullets: [
        `Your comfort score of ${vars.comfort_score}/5 suggests daily discomfort that shouldn't be normal.`,
        vars.age_band === ">15"
          ? "At 15+ years, your system is well past its prime — repairs are likely costing more than they save."
          : `With a system in the ${vars.age_band} year range, performance degradation is accelerating.`,
        vars.emergency_history
          ? "Your breakdown history confirms the system is unreliable."
          : "You've avoided major breakdowns so far, but the risk increases exponentially from here.",
      ],
      color: "red",
    };
  }

  if (vars.bill_pain === "high" && (vars.age_band === "<8" || vars.age_band === "8-12")) {
    return {
      title: "Efficiency Hunter",
      subtitle: "Your system may be working — but it's working too hard",
      score,
      bullets: [
        "Your energy bills have spiked despite having a relatively newer system — that's a SEER efficiency gap.",
        vars.iaq_issues
          ? "Combined with air quality concerns, your system may need optimization, not replacement."
          : "The good news: targeted upgrades can dramatically cut your costs without a full replacement.",
        vars.budget_stress
          ? "We understand budget is tight. Our financing options are designed for exactly this scenario."
          : "Smart efficiency upgrades typically pay for themselves within 2-3 years.",
      ],
      color: "amber",
    };
  }

  return {
    title: "Comfort Optimizer",
    subtitle: "You're in decent shape — but there's room to level up",
    score,
    bullets: [
      `With a comfort score of ${vars.comfort_score}/5, you have some room for improvement.`,
      `Your ${vars.age_band} year-old system still has life, but proactive maintenance now prevents costly surprises later.`,
      vars.iaq_issues
        ? "Addressing your air quality concerns could transform how your home feels day-to-day."
        : "A tune-up or efficiency audit could unlock savings you didn't know were there.",
    ],
    color: "teal",
  };
}
