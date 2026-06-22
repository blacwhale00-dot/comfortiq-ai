// 12-question Homeowner HVAC Assessment.
// Each answer carries a normalized `value` (0.00–1.00) that future scoring
// can consume. For now, the existing Guzzler math is unchanged — see
// QuizPage.tsx which bridges these answers into the legacy shape.

export interface QuizOption {
  value: string;       // stable code stored against the question
  label: string;       // shown to the user
  emoji?: string;
  weight?: number;     // 0.00–1.00 — answer "badness" used by future scoring
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
  // ───────────────────────── Q1: System age
  {
    id: "system_age",
    dbKey: "pain_system_age",
    question: "How old is your HVAC system?",
    subtext: "Look for the install date on the outdoor unit, or your best guess.",
    type: "choice",
    options: [
      { value: "<5",     label: "Under 5 years",   emoji: "🆕", weight: 0.05 },
      { value: "5-9",    label: "5–9 years",       emoji: "✅", weight: 0.25 },
      { value: "10-14",  label: "10–14 years",     emoji: "⏳", weight: 0.55 },
      { value: "15-19",  label: "15–19 years",     emoji: "⚠️", weight: 0.85 },
      { value: "20+",    label: "20+ years",       emoji: "🔧", weight: 1.00 },
      { value: "unknown",label: "Not sure",        emoji: "🤔", weight: 0.60 },
    ],
  },
  // ───────────────────────── Q2: Monthly bill
  {
    id: "bills",
    dbKey: "pain_bills",
    question: "What's your average summer electric bill?",
    subtext: "June–September is the most honest window.",
    type: "choice",
    options: [
      { value: "<150",     label: "Under $150",   emoji: "💚", weight: 0.10 },
      { value: "150-250",  label: "$150–$250",    emoji: "🟢", weight: 0.30 },
      { value: "250-400",  label: "$250–$400",    emoji: "🟡", weight: 0.65 },
      { value: "400+",     label: "Over $400",    emoji: "🔴", weight: 1.00 },
      { value: "untracked",label: "I don't track it", emoji: "🤷", weight: 0.50 },
    ],
  },
  // ───────────────────────── Q3: Repair frequency
  {
    id: "repairs",
    dbKey: "pain_emergencies",
    question: "How many HVAC repairs in the last 2 years?",
    subtext: "Not counting filter changes or tune-ups.",
    type: "choice",
    options: [
      { value: "0",   label: "None",          emoji: "👍", weight: 0.00 },
      { value: "1",   label: "Just one",      emoji: "🔧", weight: 0.25 },
      { value: "2-3", label: "2–3 repairs",   emoji: "⚠️", weight: 0.60 },
      { value: "4-5", label: "4–5 repairs",   emoji: "🚨", weight: 0.85 },
      { value: "6+",  label: "6 or more",     emoji: "🆘", weight: 1.00 },
    ],
  },
  // ───────────────────────── Q4: Repair spend
  {
    id: "repair_cost",
    dbKey: "repair_cost",
    question: "What have those repairs cost you in total?",
    subtext: "Combined invoices over the last 2 years.",
    type: "choice",
    options: [
      { value: "<200",      label: "Under $200",      emoji: "💵", weight: 0.05 },
      { value: "200-500",   label: "$200–$500",       emoji: "💰", weight: 0.30 },
      { value: "500-1000",  label: "$500–$1,000",     emoji: "⚠️", weight: 0.55 },
      { value: "1000-2500", label: "$1,000–$2,500",   emoji: "🚨", weight: 0.80 },
      { value: "2500+",     label: "Over $2,500",     emoji: "🔥", weight: 1.00 },
    ],
  },
  // ───────────────────────── Q5: Comfort fail (rooms)
  {
    id: "comfort_rooms",
    dbKey: "pain_temperature",
    question: "How many rooms feel too hot or too cold?",
    subtext: "Rooms that just never feel right.",
    type: "choice",
    options: [
      { value: "0",  label: "None — it's even",     emoji: "✅", weight: 0.00 },
      { value: "1",  label: "1 room",               emoji: "🙂", weight: 0.25 },
      { value: "2",  label: "2 rooms",              emoji: "😐", weight: 0.50 },
      { value: "3",  label: "3 rooms",              emoji: "😣", weight: 0.75 },
      { value: "4+", label: "4 or more rooms",      emoji: "🥵", weight: 1.00 },
    ],
  },
  // ───────────────────────── Q6: Humidity
  {
    id: "humidity",
    dbKey: "pain_moisture",
    question: "How does the air feel inside your home?",
    subtext: "Especially in summer.",
    type: "choice",
    options: [
      { value: "dry",        label: "Dry / static-y",       emoji: "🌵", weight: 0.55 },
      { value: "comfortable",label: "Comfortable",          emoji: "😌", weight: 0.10 },
      { value: "muggy",      label: "Muggy or sticky",      emoji: "💧", weight: 0.70 },
      { value: "very_humid", label: "Very humid / musty",   emoji: "🌫️", weight: 1.00 },
      { value: "unknown",    label: "Haven't noticed",      emoji: "🤔", weight: 0.40 },
    ],
  },
  // ───────────────────────── Q7: Noises / smells
  {
    id: "noises",
    dbKey: "pain_health",
    question: "Any unusual noises or smells from your system?",
    subtext: "Banging, hissing, burning, musty — anything off.",
    type: "choice",
    options: [
      { value: "none",         label: "None — it runs quiet",     emoji: "🤫", weight: 0.00 },
      { value: "minor",        label: "Minor / occasional",       emoji: "🙂", weight: 0.30 },
      { value: "frequent",     label: "Frequent noises",          emoji: "🔊", weight: 0.65 },
      { value: "loud_burning", label: "Loud or burning smell",    emoji: "🔥", weight: 0.90 },
      { value: "constant",     label: "Constant — it's bad",      emoji: "🚨", weight: 1.00 },
    ],
  },
  // ───────────────────────── Q8: Short cycling
  {
    id: "short_cycling",
    dbKey: "short_cycling",
    question: "Does your system click on and off frequently?",
    subtext: "More than a few times an hour is a red flag.",
    type: "choice",
    options: [
      { value: "no",        label: "No — runs in long cycles", emoji: "✅", weight: 0.05 },
      { value: "sometimes", label: "Sometimes",                emoji: "🤷", weight: 0.50 },
      { value: "yes",       label: "Yes — constantly",         emoji: "🚨", weight: 1.00 },
      { value: "unknown",   label: "Haven't paid attention",   emoji: "🤔", weight: 0.40 },
    ],
  },
  // ───────────────────────── Q9: Filter cadence
  {
    id: "filter_freq",
    dbKey: "filter_freq",
    question: "How often do you change your air filter?",
    subtext: "Be honest — most homeowners forget.",
    type: "choice",
    options: [
      { value: "monthly",   label: "Every month",         emoji: "🥇", weight: 0.00 },
      { value: "quarterly", label: "Every few months",    emoji: "👍", weight: 0.25 },
      { value: "yearly",    label: "Maybe once a year",   emoji: "😬", weight: 0.65 },
      { value: "rarely",    label: "Rarely",              emoji: "⚠️", weight: 0.85 },
      { value: "never",     label: "Never have",          emoji: "🆘", weight: 1.00 },
    ],
  },
  // ───────────────────────── Q10: Last tune-up
  {
    id: "tune_up",
    dbKey: "tune_up",
    question: "When was your last professional tune-up?",
    subtext: "A real one — not just an emergency repair visit.",
    type: "choice",
    options: [
      { value: "this_year", label: "Within the last year",  emoji: "✅", weight: 0.05 },
      { value: "1-2_years", label: "1–2 years ago",         emoji: "🙂", weight: 0.40 },
      { value: "3+_years",  label: "3+ years ago",          emoji: "⚠️", weight: 0.80 },
      { value: "never",     label: "Never had one",         emoji: "🚨", weight: 1.00 },
      { value: "unknown",   label: "Not sure",              emoji: "🤔", weight: 0.55 },
    ],
  },
  // ───────────────────────── Q11: SEER rating
  {
    id: "seer_rating",
    dbKey: "seer_rating",
    question: "Do you know your system's SEER rating?",
    subtext: "Modern systems are 14+. Older systems are often 10 or below.",
    type: "choice",
    options: [
      { value: "16+",     label: "16 or higher",        emoji: "🌿", weight: 0.05 },
      { value: "13-15",   label: "13–15",               emoji: "🟢", weight: 0.30 },
      { value: "10-12",   label: "10–12",               emoji: "🟡", weight: 0.70 },
      { value: "<10",     label: "Under 10",            emoji: "🔴", weight: 1.00 },
      { value: "unknown", label: "No idea",             emoji: "🤔", weight: 0.60 },
    ],
  },
  // ───────────────────────── Q12: Replacement intent
  {
    id: "intent",
    dbKey: "intent",
    question: "Are you considering replacing it in the next 12 months?",
    subtext: "Even a 'maybe' is useful here.",
    type: "choice",
    options: [
      { value: "yes",    label: "Yes — actively planning",  emoji: "🎯", weight: 1.00 },
      { value: "maybe",  label: "Maybe — exploring",        emoji: "🤔", weight: 0.65 },
      { value: "no",     label: "Not right now",            emoji: "🛑", weight: 0.20 },
      { value: "unsure", label: "Honestly unsure",          emoji: "🤷", weight: 0.50 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// In-flow "mirror" response (the big concierge message after each answer)
// ─────────────────────────────────────────────────────────────────
export function getMirrorResponse(questionId: string, value: string | number): string {
  const v = String(value);
  const map: Record<string, Record<string, string>> = {
    system_age: {
      "<5":     "A young system. That's a strong starting point — let's see how the rest of the picture lines up.",
      "5-9":    "Mid-life territory. Performance can quietly slip here without you noticing.",
      "10-14":  "You're entering the replacement-conversation window. Many Atlanta systems start failing around this age.",
      "15-19":  "15+ years is the danger zone. I'll cross-check public permit records to see how hard it's been working.",
      "20+":    "20+ years is rare — and usually means you're throwing good money at a system at the end of its life.",
      "unknown":"No worries. The County permit record will tell us a lot of what we need to know.",
    },
    bills: {
      "<150":     "That's an efficient bill for an Atlanta summer. Good baseline.",
      "150-250":  "Within the normal Atlanta range — there's usually still room to find savings.",
      "250-400":  "On the high side. Your system is likely working harder than it should.",
      "400+":     "That sounds a bit high for a house of your size — let's see if we can find out why.",
      "untracked":"Totally fair. We'll estimate it from your home's profile.",
    },
    repairs: {
      "0":   "No repairs is a good sign of reliability. Let's keep digging.",
      "1":   "One repair in two years is normal wear and tear.",
      "2-3": "2–3 repairs is the pattern where the math starts favoring replacement.",
      "4-5": "That's a clear pattern — the system is telling you something.",
      "6+":  "6+ repairs means you're past the point of nursing it along.",
    },
    repair_cost: {
      "<200":      "Minor money so far. The system is holding up.",
      "200-500":   "Manageable, but worth watching.",
      "500-1000":  "That money would be a meaningful down payment on a real fix.",
      "1000-2500": "You've spent serious money keeping it alive — let's see if that's still the right move.",
      "2500+":     "$2,500+ in repairs is usually past the break-even point for replacement.",
    },
    comfort_rooms: {
      "0":  "Even comfort is a great baseline — most homes don't have that.",
      "1":  "One off room is often a balancing issue, not the whole system.",
      "2":  "Two uncomfortable rooms usually means ductwork or sizing.",
      "3":  "Three rooms suggests the system isn't keeping up with the home.",
      "4+": "When most of the house is off, the system itself is the bottleneck.",
    },
    humidity: {
      "dry":        "Dry air is a comfort and a health drag — fixable with the right setup.",
      "comfortable":"Good — humidity is one of the biggest hidden comfort factors.",
      "muggy":      "Muggy air means the system is cooling but not dehumidifying. That's a sizing or age signal.",
      "very_humid": "Persistent humidity is serious — it impacts air, health, and your home's structure.",
      "unknown":    "Most people don't notice until it's bad. We'll factor it in.",
    },
    noises: {
      "none":        "Quiet operation is one of the strongest signs of a healthy system.",
      "minor":       "Minor noises are common and usually not urgent.",
      "frequent":    "Frequent noises are early warnings — worth taking seriously.",
      "loud_burning":"Loud or burning smells need attention now, not later.",
      "constant":    "That's the system asking for help. Let's get ahead of it.",
    },
    short_cycling: {
      "no":        "Long cycles are exactly what you want.",
      "sometimes": "Occasional cycling is okay — constant is the issue.",
      "yes":       "Short cycling is a top efficiency killer. It also burns out components fast.",
      "unknown":   "We'll listen for it when we do the visual audit.",
    },
    filter_freq: {
      "monthly":   "You're doing the single most important thing right.",
      "quarterly": "Every few months is solid in most homes.",
      "yearly":    "Yearly is too long — a clogged filter chokes the whole system.",
      "rarely":    "Rare filter changes are one of the biggest preventable causes of system death.",
      "never":     "Never is the #1 reason systems die early. The good news: it's the easiest fix.",
    },
    tune_up: {
      "this_year": "Recent tune-up — you're ahead of most homeowners.",
      "1-2_years": "Due for one, but not critical.",
      "3+_years":  "3+ years without service usually means hidden wear is adding up.",
      "never":     "No tune-ups is a major efficiency drain over time.",
      "unknown":   "We'll check what the permit history says.",
    },
    seer_rating: {
      "16+":     "16+ SEER is excellent — your system is already energy-aware.",
      "13-15":   "13–15 is decent. There's still meaningful room to upgrade.",
      "10-12":   "10–12 SEER means you're paying 20–30% more than you need to every month.",
      "<10":     "Under 10 SEER is the classic 'Power Tax' situation — modern systems are 60%+ more efficient.",
      "unknown": "We'll estimate your SEER from the system's age and serial number.",
    },
    intent: {
      "yes":    "Got it — we'll fast-track your full plan and credit eligibility.",
      "maybe":  "Smart to explore now. Knowing your number gives you leverage.",
      "no":     "Totally fine. Even a future-planning brief is useful to have on file.",
      "unsure": "That's exactly what this is for. Let's get you the clarity to decide.",
    },
  };
  return map[questionId]?.[v] ?? "Got it. Let's keep going.";
}

// ─────────────────────────────────────────────────────────────────
// Bridges to the legacy answer shape consumed by guzzler-score.ts
// (kept here so future scoring upgrades have one place to change.)
// ─────────────────────────────────────────────────────────────────
export function bridgedAnswersForScoring(
  answers: Record<string, string | number>,
): Record<string, string | number> {
  // bills: spec values → legacy "low" | "med" | "high"
  const billsMap: Record<string, "low" | "med" | "high"> = {
    "<150": "low",
    "150-250": "low",
    "250-400": "med",
    "400+": "high",
    "untracked": "low",
  };
  // system_age: spec → legacy band
  const ageMap: Record<string, "<8" | "8-12" | "12-15" | ">15"> = {
    "<5":      "<8",
    "5-9":     "8-12",
    "10-14":   "12-15",
    "15-19":   ">15",
    "20+":     ">15",
    "unknown": "8-12",
  };
  // comfort_rooms (0..4+) → 1..5 temperature pain
  const tempMap: Record<string, number> = { "0": 1, "1": 2, "2": 3, "3": 4, "4+": 5 };
  // repairs → emergencies boolean
  const hadEmergency = answers.repairs && answers.repairs !== "0";

  return {
    ...answers,
    bills: billsMap[String(answers.bills)] ?? "low",
    system_age: ageMap[String(answers.system_age)] ?? "8-12",
    temperature: tempMap[String(answers.comfort_rooms)] ?? 3,
    emergencies: hadEmergency ? "true" : "false",
  };
}
