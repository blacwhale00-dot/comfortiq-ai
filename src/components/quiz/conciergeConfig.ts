// 12-question Homeowner HVAC Assessment — verbatim per spec
// (12 questions doc — Will → Tanzeel, 2026-06-16).
// Each answer carries the normalized `value` (0.00–1.00) from the spec for
// future Guzzler subscore math. The existing scoring engine is unchanged;
// `bridgedAnswersForScoring()` maps these new codes back into the legacy
// shape consumed by guzzler-score.ts.

export interface QuizOption {
  value: string;       // stable code stored against the question
  label: string;       // shown to the user
  emoji?: string;
  weight: number;      // 0.00–1.00 — spec "Value" used by future scoring
}

export interface QuizQuestion {
  id: string;
  dbKey: string;
  question: string;
  subtext?: string;
  type: "choice";
  options: QuizOption[];
}

export const quizQuestions: QuizQuestion[] = [
  // ───────────────────────── Q1: System age (Age Factor)
  {
    id: "system_age",
    dbKey: "pain_system_age",
    question: "Let's start simple — how old is your air conditioner or heat pump?",
    type: "choice",
    options: [
      { value: "0-5",     label: "0–5 years",     emoji: "🆕", weight: 0.00 },
      { value: "6-9",     label: "6–9 years",     emoji: "✅", weight: 0.25 },
      { value: "10-14",   label: "10–14 years",   emoji: "⏳", weight: 0.60 },
      { value: "15-19",   label: "15–19 years",   emoji: "⚠️", weight: 0.85 },
      { value: "20+",     label: "20+ years",     emoji: "🔧", weight: 1.00 },
      { value: "unknown", label: "I don't know",  emoji: "🤔", weight: 0.50 },
    ],
  },
  // ───────────────────────── Q2: Energy bills (Energy Drain, w/ Q11)
  {
    id: "bills",
    dbKey: "pain_bills",
    question: "Have your energy bills gone up noticeably during cooling season?",
    type: "choice",
    options: [
      { value: "consistent", label: "No, bills are consistent", emoji: "💚", weight: 0.00 },
      { value: "slight",     label: "Slight increase",          emoji: "🟢", weight: 0.30 },
      { value: "noticeable", label: "Noticeable increase",      emoji: "🟡", weight: 0.65 },
      { value: "dramatic",   label: "Dramatic spike",           emoji: "🔴", weight: 1.00 },
      { value: "untracked",  label: "I don't track",            emoji: "🤷", weight: 0.40 },
    ],
  },
  // ───────────────────────── Q3: Repair count (Repair Bloodloss, w/ Q4)
  {
    id: "repairs",
    dbKey: "pain_emergencies",
    question: "How many repairs have you had in the last 2 years?",
    type: "choice",
    options: [
      { value: "0",   label: "None",     emoji: "👍", weight: 0.00 },
      { value: "1",   label: "1",        emoji: "🔧", weight: 0.25 },
      { value: "2-3", label: "2–3",      emoji: "⚠️", weight: 0.60 },
      { value: "4-5", label: "4–5",      emoji: "🚨", weight: 0.85 },
      { value: "6+",  label: "6+",       emoji: "🆘", weight: 1.00 },
    ],
  },
  // ───────────────────────── Q4: Repair spend (Repair Bloodloss)
  {
    id: "repair_cost",
    dbKey: "repair_cost",
    question: "Roughly how much have you spent on those repairs?",
    type: "choice",
    options: [
      { value: "0",         label: "$0",              emoji: "💵", weight: 0.00 },
      { value: "<500",      label: "Under $500",      emoji: "💰", weight: 0.20 },
      { value: "500-1500",  label: "$500–$1,500",     emoji: "⚠️", weight: 0.50 },
      { value: "1500-3000", label: "$1,500–$3,000",   emoji: "🚨", weight: 0.75 },
      { value: "3000+",     label: "Over $3,000",     emoji: "🔥", weight: 1.00 },
    ],
  },
  // ───────────────────────── Q5: Temperature comfort (Comfort Fail, w/ Q6)
  {
    id: "comfort_rooms",
    dbKey: "pain_temperature",
    question: "Do you have rooms that are consistently too hot or too cold?",
    type: "choice",
    options: [
      { value: "even",  label: "No, even temperature throughout", emoji: "✅", weight: 0.00 },
      { value: "1",     label: "1 room with issues",              emoji: "🙂", weight: 0.25 },
      { value: "2-3",   label: "2–3 rooms with issues",           emoji: "😐", weight: 0.60 },
      { value: "most",  label: "Most of the house",               emoji: "😣", weight: 0.85 },
      { value: "whole", label: "Whole house struggles",           emoji: "🥵", weight: 1.00 },
    ],
  },
  // ───────────────────────── Q6: Humidity (Comfort Fail)
  {
    id: "humidity",
    dbKey: "pain_moisture",
    question: "How's the humidity in your home — sticky, clammy, or just right?",
    type: "choice",
    options: [
      { value: "none",   label: "No humidity issues",                 emoji: "😌", weight: 0.00 },
      { value: "slight", label: "Slightly uncomfortable sometimes",   emoji: "💧", weight: 0.30 },
      { value: "sticky", label: "Noticeable — sticky in summer",      emoji: "🌫️", weight: 0.65 },
      { value: "major",  label: "Major humidity problems year-round", emoji: "🥵", weight: 1.00 },
    ],
  },
  // ───────────────────────── Q7: Noises/smells/ice (Noise & Behavior, w/ Q8)
  {
    id: "noises",
    dbKey: "pain_health",
    question: "Any strange noises, smells, or ice on the outdoor unit?",
    type: "choice",
    options: [
      { value: "none",       label: "None, runs smooth",               emoji: "🤫", weight: 0.00 },
      { value: "occasional", label: "Occasional noise",                emoji: "🙂", weight: 0.25 },
      { value: "regular",    label: "Regular noises or smells",        emoji: "🔊", weight: 0.55 },
      { value: "severe",     label: "Ice on coils, burning, grinding", emoji: "🔥", weight: 1.00 },
    ],
  },
  // ───────────────────────── Q8: Short cycling (Noise & Behavior)
  {
    id: "short_cycling",
    dbKey: "short_cycling",
    question: "Does your system turn on and off rapidly — what we call short cycling?",
    type: "choice",
    options: [
      { value: "no",        label: "No, runs normal cycles",            emoji: "✅", weight: 0.00 },
      { value: "sometimes", label: "Sometimes seems fast",              emoji: "🤷", weight: 0.35 },
      { value: "frequent",  label: "Yes, frequently turns on/off",      emoji: "⚠️", weight: 0.70 },
      { value: "constant",  label: "Constantly cycling, never settles", emoji: "🚨", weight: 1.00 },
      { value: "unknown",   label: "I haven't noticed",                 emoji: "🤔", weight: 0.30 },
    ],
  },
  // ───────────────────────── Q9: Filter cadence (Maintenance Neglect, w/ Q10)
  {
    id: "filter_freq",
    dbKey: "filter_freq",
    question: "How often do you change your air filter?",
    type: "choice",
    options: [
      { value: "1-3mo",   label: "Every 1–3 months",       emoji: "🥇", weight: 0.00 },
      { value: "4-6mo",   label: "Every 4–6 months",       emoji: "👍", weight: 0.25 },
      { value: "yearly",  label: "Once a year",            emoji: "😬", weight: 0.55 },
      { value: "rarely",  label: "Rarely / when I remember", emoji: "⚠️", weight: 0.80 },
      { value: "unknown", label: "There's a filter?",       emoji: "🤔", weight: 1.00 },
    ],
  },
  // ───────────────────────── Q10: Last tune-up (Maintenance Neglect)
  {
    id: "tune_up",
    dbKey: "tune_up",
    question: "When was your last professional HVAC tune-up?",
    type: "choice",
    options: [
      { value: "this_year", label: "Within the last year",          emoji: "✅", weight: 0.00 },
      { value: "1-2_years", label: "1–2 years ago",                 emoji: "🙂", weight: 0.30 },
      { value: "3+_years",  label: "3+ years ago",                  emoji: "⚠️", weight: 0.60 },
      { value: "never",     label: "Never / bought the house with it", emoji: "🚨", weight: 0.85 },
      { value: "unknown",   label: "I don't remember",              emoji: "🤔", weight: 0.50 },
    ],
  },
  // ───────────────────────── Q11: SEER (Energy Drain)
  {
    id: "seer_rating",
    dbKey: "seer_rating",
    question: "Do you know your system's SEER efficiency rating?",
    type: "choice",
    options: [
      { value: "18+",     label: "Yes, SEER 18+",       emoji: "🌿", weight: 0.00 },
      { value: "14-17",   label: "Yes, SEER 14–17",     emoji: "🟢", weight: 0.30 },
      { value: "10-13",   label: "Yes, SEER 10–13",     emoji: "🟡", weight: 0.60 },
      { value: "<10",     label: "Yes, below SEER 10",  emoji: "🔴", weight: 1.00 },
      { value: "unknown", label: "I don't know",        emoji: "🤔", weight: 0.50 },
    ],
  },
  // ───────────────────────── Q12: Replacement intent (Homeowner Readiness)
  {
    id: "intent",
    dbKey: "intent",
    question: "Are you considering replacing your HVAC system in the next 12 months?",
    type: "choice",
    options: [
      { value: "yes",            label: "Yes, actively planning",     emoji: "🎯", weight: 1.00 },
      { value: "maybe",          label: "Maybe, if the price is right", emoji: "🤔", weight: 0.60 },
      { value: "only_if_breaks", label: "Only if it breaks",          emoji: "🛠️", weight: 0.30 },
      { value: "no",             label: "No, just curious",           emoji: "👀", weight: 0.00 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// In-flow "mirror" response shown by Cora after each answer.
// Copy is VERBATIM from the spec.
// ─────────────────────────────────────────────────────────────────
export function getMirrorResponse(questionId: string, value: string | number): string {
  const v = String(value);
  const map: Record<string, Record<string, string>> = {
    system_age: {
      "0-5":    "Still in its prime! That's great news. Let's see how the rest is holding up.",
      "6-9":    "Middle age for an HVAC system. You're in the sweet spot where maintenance really matters.",
      "10-14":  "Starting to get into the zone where systems typically show their age. Keep going — this gets interesting.",
      "15-19":  "Past typical life expectancy. You're on borrowed time — but that's exactly why you're here.",
      "20+":    "Wow — that system has served you well, but it's running on fumes. Every extra year is a gift at this point.",
      "unknown":"No worries — your data plate knows. We'll get the real number when you upload your photos.",
    },
    bills: {
      "consistent":"Steady bills — always a good sign. Your system's holding its efficiency.",
      "slight":    "Even small increases add up over a Georgia summer. A few degrees of efficiency loss can mean real dollars.",
      "noticeable":"That spike isn't just inflation — it's your system working harder to deliver less cooling. Classic sign of declining efficiency.",
      "dramatic":  "That's not a bill — that's a cry for help. Your system is burning cash every time it cycles on.",
      "untracked": "Most people don't! Your electric bill photo will give us the real numbers later.",
    },
    repairs: {
      "0":   "Knock on wood — no repairs is what we love to hear.",
      "1":   "One repair happens. Sometimes it's just bad luck. Let's see if there's a pattern.",
      "2-3": "Two to three repairs in two years — that's the beginning of a pattern. Repair costs tend to cluster as systems age.",
      "4-5": "Four or five repairs means you're nursing this system along. At some point, repairs stop being the cheaper option.",
      "6+":  "Six-plus repairs — you've been through it. At this point you're not maintaining a system, you're funding its retirement.",
    },
    repair_cost: {
      "0":         "Zero dollars in repairs — your wallet thanks you.",
      "<500":      "Minor stuff. Routine maintenance-level costs.",
      "500-1500":  "That's starting to be real money — the kind that makes you wonder if it's worth it.",
      "1500-3000": "Now we're talking serious investment in a dying asset. Every dollar you spend on repairs is a dollar you could've put toward a system that doesn't break.",
      "3000+":     "Over three thousand dollars — that's a down payment on a new system you already made... just without getting the new system.",
    },
    comfort_rooms: {
      "even":  "Perfect — your ductwork and system are balanced. That's rarer than you'd think.",
      "1":     "One problem room — could be ductwork, could be sizing. Worth looking at.",
      "2-3":   "Multiple rooms struggling means something systemic is going on. Duct leaks, wrong-sized unit, poor design — could be any of them.",
      "most":  "If most rooms are uncomfortable, your system is fundamentally mismatched to your home. That's not a repair problem — that's a redesign.",
      "whole": "Your system can't keep up anywhere. That's the definition of the wrong equipment for the job.",
    },
    humidity: {
      "none":   "Comfortable humidity levels — your system's doing its job on the latent cooling side too.",
      "slight": "Intermittent humidity usually means your system is cooling the air but not removing enough moisture. Oversized equipment does exactly that.",
      "sticky": "Sticky air in summer is a classic oversized-system symptom. It cools too fast and never runs long enough to pull moisture out.",
      "major":  "That level of humidity means your system has basically stopped dehumidifying. You're cool-but-clammy — the worst of both worlds.",
    },
    noises: {
      "none":       "Smooth and quiet — that's what we want.",
      "occasional": "The occasional rattle or hum — could be minor, but noises don't fix themselves.",
      "regular":    "Regular noises or smells mean something is wearing down. Bearings, belts, compressor — something's complaining.",
      "severe":     "Ice on coils or burning smells — those are STOP signs. Grinding = metal on metal = catastrophic failure coming.",
    },
    short_cycling: {
      "no":        "Normal cycles — your system is breathing right.",
      "sometimes": "Occasional short cycles could be a thermostat issue, or the beginning of a sizing problem.",
      "frequent":  "Frequent short cycling murders equipment. It's like starting and stopping your car engine every 30 seconds — premature wear, higher bills, shorter life.",
      "constant":  "Constant cycling means your system is fighting itself. Probably oversized — cooling the house too fast, then kicking back on minutes later. This is one of the most expensive problems to ignore.",
      "unknown":   "Fair enough — listen for it. If your system kicks on and off within 10 minutes, that's short cycling.",
    },
    filter_freq: {
      "1-3mo":   "Perfect filter discipline. That alone extends equipment life by years.",
      "4-6mo":   "Not bad — slightly stretching it in peak season, but not hurting anything.",
      "yearly":  "Once a year means your system is breathing through a dirty filter for months. Restricted airflow = higher bills + harder-working equipment.",
      "rarely":  "'When I remember' is usually 'when I notice.' By that point the filter's been choking your system for a while.",
      "unknown": "No judgment — a shocking number of people don't know. But now you do, and that's an easy fix that changes everything.",
    },
    tune_up: {
      "this_year": "Yearly tune-ups — that's the standard. Your system's been looked after.",
      "1-2_years": "A little behind schedule. Systems that go two years without a professional eye tend to have surprises.",
      "3+_years":  "Three-plus years without a tune-up means small problems have had time to become big ones. Things degrade silently.",
      "never":     "Never tuned up — you don't know what you don't know about that system. Could be fine. Could be a time bomb. The data plate will tell us.",
      "unknown":   "If you can't remember, it's been too long. That's usually 2+ years in 'homeowner time.'",
    },
    seer_rating: {
      "18+":     "SEER 18+ is high efficiency. Your system isn't wasting energy — even if other things are going wrong.",
      "14-17":   "Mid-range efficiency. Decent, but you're leaving some savings on the table compared to modern 20+ SEER systems.",
      "10-13":   "SEER 10–13 is the old standard. Minimum legal today is 14–15 SEER depending on region. You're running at yesterday's efficiency with today's electricity rates.",
      "<10":     "Below SEER 10 — that system was inefficient the day it was installed. You're paying double or triple what a modern system costs to run.",
      "unknown": "Most homeowners don't. Your data plate photo will give us the exact SEER — we'll update your score when we verify it.",
    },
    intent: {
      "yes":            "You're already thinking ahead — that's the right mindset. The Guzzler Score is about to give you the data to make the smartest decision possible.",
      "maybe":          "Open to it if the numbers make sense — that's exactly what we're about to show you. The Guzzler Score makes the financial case clear.",
      "only_if_breaks": "The 'run it till it dies' strategy. Problem is, it always dies on the hottest day of the year — when everyone else's just died too, and contractors can name their price. Let's see if waiting actually saves you money.",
      "no":             "Curiosity is a great reason to be here. Let's see what your system is actually telling us — no pressure, just data.",
    },
  };
  return map[questionId]?.[v] ?? "Got it. Let's keep going.";
}

// ─────────────────────────────────────────────────────────────────
// Bridges the new spec answer codes back to the legacy shape consumed
// by guzzler-score.ts. Scoring math is unchanged.
// ─────────────────────────────────────────────────────────────────
export function bridgedAnswersForScoring(
  answers: Record<string, string | number>,
): Record<string, string | number> {
  const billsMap: Record<string, "low" | "med" | "high"> = {
    consistent: "low",
    slight:     "low",
    noticeable: "med",
    dramatic:   "high",
    untracked:  "low",
  };
  const ageMap: Record<string, "<8" | "8-12" | "12-15" | ">15"> = {
    "0-5":     "<8",
    "6-9":     "8-12",
    "10-14":   "12-15",
    "15-19":   ">15",
    "20+":     ">15",
    "unknown": "8-12",
  };
  const tempMap: Record<string, number> = {
    even:  1,
    "1":   2,
    "2-3": 3,
    most:  4,
    whole: 5,
  };
  const hadEmergency = answers.repairs && answers.repairs !== "0";

  return {
    ...answers,
    bills: billsMap[String(answers.bills)] ?? "low",
    system_age: ageMap[String(answers.system_age)] ?? "8-12",
    temperature: tempMap[String(answers.comfort_rooms)] ?? 3,
    emergencies: hadEmergency ? "true" : "false",
  };
}

// Legacy type kept so older components (ReadinessProfile.tsx) still compile.
// The current quiz flow uses GuzzlerResults instead of this profile shape.
export interface ReadinessProfile {
  title: string;
  subtitle: string;
  score: number;
  bullets: string[];
  color: "teal" | "amber" | "red";
}
