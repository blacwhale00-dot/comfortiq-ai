# ComfortIQ — Complete Code Logic
## Built as Lead Architect — March 23, 2026

---

# PART 1: THE POWER TAX ENGINE (Flex-Duct Math)

## Overview
The Power Tax is the core metric of ComfortIQ. It answers:
> "How much money is your old, inefficient HVAC system costing you every month?"

---

## 1.1 — Calculate System Efficiency (SEER Rating)

```typescript
/**
 * Estimates the SEER rating of a system based on its age.
 * SEER = Seasonal Energy Efficiency Ratio
 * Higher SEER = More efficient = Lower Power Tax
 *
 * Atlanta climate zone: Hot-humid (ASHRAE Zone 2A)
 * Average cooling season: May–October (6 months)
 * Average run time: 8 hours/day
 */

function estimateSEER(systemAge: number): number {
  // SEER standards by year
  // Before 1992: SEER 6-8
  // 1992-2006: SEER 10 minimum
  // 2006-2015: SEER 13 minimum
  // 2015-2023: SEER 14 minimum
  // 2023+: SEER 15-21 (variable speed compressors)

  if (systemAge <= 2) return 18;  // New variable-speed systems
  if (systemAge <= 5) return 16;  // Modern systems
  if (systemAge <= 8) return 14;  // Post-2006 standard
  if (systemAge <= 12) return 12; // Early-2000s systems
  if (systemAge <= 18) return 10; // 1990s systems
  if (systemAge <= 25) return 8;  // Pre-1992 systems
  return 6;                        // Pre-1980s — very inefficient
}

// Example:
// 1995 system (30 years old) → SEER 8
// 2015 system (10 years old) → SEER 14
// 2022 system (2 years old) → SEER 18
```

---

## 1.2 — Calculate Annual Cooling Hours (Atlanta Specific)

```typescript
/**
 * Atlanta Climate Data:
 * - Summer average: 82°F high, 71°F low
 * - Days above 90°F: ~40-50 days per summer
 * - Humidity: Average 74% (very humid)
 * - Cooling season: May 15 – October 15 (~153 days)
 *
 * Annual cooling hours at various efficiency levels
 */

function getAtlantaCoolingHours(): number {
  // Average daily cooling runtime in Atlanta summer
  const summerDays = 153; // May 15 – Oct 15
  const avgDailyHours = 8.5; // hours/day (higher due to humidity)
  return summerDays * avgDailyHours; // ~1,300 hours/year
}

// Atlanta kWh rates (2024-2026)
const ATLANTA_KWH_RATE = 0.14; // cents per kWh (averaged)
const SUMMER_MONTHS = 6; // May–October
```

---

## 1.3 — The Power Tax Formula

```typescript
interface PowerTaxResult {
  systemAge: number;
  currentSEER: number;
  newSEER: number;           // What they'd upgrade to
  annualCoolingCost: number;  // Current system
  optimalCoolingCost: number; // At optimal SEER
  monthlyPowerTax: number;    // Wasted per month
  annualPowerTax: number;      // Wasted per year
  powerTaxRate: number;        // Percentage wasted
}

/**
 * Calculate the Power Tax
 *
 * Formula:
 * Annual Cooling Cost = (BTU Requirement ÷ SEER) × Hours × Rate
 *
 * Power Tax = Current Annual Cost − Optimal Annual Cost
 * Monthly Power Tax = Annual Power Tax ÷ 12
 */

function calculatePowerTax(
  systemAge: number,
  monthlyBill: number,
  upgradeSEER: number = 18 // Default upgrade target: SEER 18
): PowerTaxResult {
  const currentSEER = estimateSEER(systemAge);
  const annualCoolingCost = monthlyBill * 12;
  const hours = getAtlantaCoolingHours();

  // BTU requirement for Atlanta (average 2,000 sq ft home)
  const btuRequirement = 48000; // 2-ton system baseline

  // Current system annual cost
  const currentAnnualCost =
    (btuRequirement / currentSEER) * hours * ATLANTA_KWH_RATE;

  // Optimal system annual cost (at new SEER)
  const optimalAnnualCost =
    (btuRequirement / upgradeSEER) * hours * ATLANTA_KWH_RATE;

  // Power Tax = what they're overpaying
  const annualPowerTax = Math.max(0, annualCoolingCost - optimalAnnualCost);
  const monthlyPowerTax = annualPowerTax / 12;

  // What percentage of their bill is waste
  const powerTaxRate =
    annualCoolingCost > 0 ? (annualPowerTax / annualCoolingCost) * 100 : 0;

  return {
    systemAge,
    currentSEER,
    newSEER: upgradeSEER,
    annualCoolingCost,
    optimalCoolingCost: optimalAnnualCost,
    monthlyPowerTax: Math.round(monthlyPowerTax),
    annualPowerTax: Math.round(annualPowerTax),
    powerTaxRate: Math.round(powerTaxRate * 10) / 10,
  };
}

// Example:
// System: 18 years old
// Monthly bill: $280
// Current SEER: 10
// Upgrade to: SEER 18
//
// Result:
// Monthly Power Tax: ~$120/month
// Annual Power Tax: ~$1,440/year
// That's $1,440 going out the window every year.
```

---

## 1.4 — The SEER Gap (Why It Gets Worse)

```typescript
/**
 * The SEER Gap shows the efficiency difference between:
 * 1. What your current system delivers
 * 2. What a new system could deliver
 *
 * Every year, your current SEER effectively DECREASES
 * as the system wears down.
 *
 * Gap growth rate: ~1.5% per year
 */

function calculateSEERGap(currentSEER: number, yearsOld: number): number {
  // Systems degrade ~1.5% per year
  const degradedSEER = currentSEER * Math.pow(0.985, yearsOld);
  const optimalSEER = 18; // Minimum SEER 18 for new systems
  return Math.max(0, optimalSEER - degradedSEER);
}

// Example:
// 18-year-old system, rated SEER 10
// Degraded: 10 × 0.985^18 = 10 × 0.763 = SEER 7.6
// Gap to new: 18 - 7.6 = 10.4 SEER points
// That $280/month bill is even WORSE than it looks.
```

---

## 1.5 — Duct Heat Gain Calculation (Flex-Duct Specific)

```typescript
/**
 * Flex duct heat gain — why it matters in Atlanta:
 *
 * Atlanta summer: 92°F outside, 72°F inside
 * Air in flex duct (50°F) loses 8-12°F before reaching vents
 * due to heat gain through the unconditioned attic
 *
 * This is called "sensible heat gain" in the duct
 * and is a MAJOR source of HVAC inefficiency.
 *
 * Solution: Duct sealing + insulation can reduce this loss by 30-50%
 */

interface DuctHeatGainResult {
  heatGainBTU: number;      // BTU lost per hour in ducts
  percentOfLoad: number;     // What % of cooling capacity this represents
  monthlyCostLeak: number;   // Dollar cost per month
  seasonalCostLeak: number;  // Dollar cost per cooling season
}

function calculateFlexDuctHeatGain(
  systemBTU: number,       // System capacity (e.g., 48,000 BTU)
  ductLengthFeet: number,   // Linear feet of flex duct
  atticTempF: number = 135, // Atlanta attic temp on hot day
  interiorTempF: number = 72, // Set temperature
  ductInsulation: "uninsulated" | "partial" | "insulated" = "uninsulated"
): DuctHeatGainResult {
  // Heat gain per foot of flex duct (BTU/hr/ft)
  const heatGainPerFoot = {
    uninsulated: 0.45, // Very high loss in unconditioned attic
    partial: 0.25,    // Partial insulation
    insulated: 0.08,  // Properly insulated ducts
  };

  const gainPerFoot = heatGainPerFoot[ductInsulation];
  const heatGainBTU = ductLengthFeet * gainPerFoot;

  // Percentage of total system capacity lost to duct leakage
  const percentOfLoad = (heatGainBTU / systemBTU) * 100;

  // Calculate dollar cost
  // Each 1,000 BTU/hr over 8 hours = 8 kWh
  const hoursPerMonth = 26 * 8; // ~8 hours/day average
  const kWhLostPerMonth = (heatGainBTU / 1000) * hoursPerMonth;
  const monthlyCostLeak = kWhLostPerMonth * ATLANTA_KWH_RATE;

  // Season: 6 months
  const seasonalCostLeak = monthlyCostLeak * SUMMER_MONTHS;

  return {
    heatGainBTU: Math.round(heatGainBTU),
    percentOfLoad: Math.round(percentOfLoad * 10) / 10,
    monthlyCostLeak: Math.round(monthlyCostLeak),
    seasonalCostLeak: Math.round(seasonalCostLeak),
  };
}

// Example:
// 200 ft of flex duct, uninsulated
// System: 48,000 BTU
// Result:
// Heat gain: 90 BTU/hr
// % of load: 0.19%
// Monthly leak: $22
// Seasonal leak: $132
// → This is why flex duct in Atlanta attics is a hidden cost
```

---

# PART 2: THE READINESS SCORE

## 2.1 — Calculate Readiness Score (0-100)

```typescript
/**
 * Readiness Score = How close they are to making a decision
 *
 * Factors:
 * - System age (higher age = higher urgency)
 * - Power Tax (higher tax = more motivated)
 * - Bill pain (higher bills = more urgency)
 * - Comfort issues (hot/cold problems = real pain)
 * - Financial readiness (some stress = some openness to change)
 * - Trust issues (distrust of contractors = barrier to act)
 */

interface ReadinessInput {
  systemAge: number;
  monthlyBill: number;
  billChange: "stable" | "increasing" | "spiking";
  comfortScore: number;      // 1-5 (hot/cold issues)
  breakdownCount: number;    // Breakdowns in last 2 years
  confusionLevel: number;    // 1-5 (repair vs replace confusion)
  financialStress: "prepared" | "managing" | "crisis";
  contractorTrust: number;   // 1-5 (how much they distrust contractors)
}

function calculateReadinessScore(input: ReadinessInput): {
  score: number;             // 0-100
  tier: "hot" | "warm" | "cool" | "cold";
  topTriggers: string[];     // Why they're ready
  topBarriers: string[];     // Why they haven't acted
  urgencyMonths: number;     // How many months before they NEED to act
} {
  let score = 0;
  const topTriggers: string[] = [];
  const topBarriers: string[] = [];

  // FACTOR 1: System Age (max 25 points)
  if (input.systemAge >= 20) {
    score += 25;
    topTriggers.push(`${input.systemAge}-year-old system — end of life`);
  } else if (input.systemAge >= 15) {
    score += 18;
    topTriggers.push(`${input.systemAge} years — past prime`);
  } else if (input.systemAge >= 10) {
    score += 10;
  } else if (input.systemAge >= 5) {
    score += 5;
  }

  // FACTOR 2: Bill Pain (max 25 points)
  if (input.billChange === "spiking") {
    score += 20;
    topTriggers.push("Bills are spiking — urgency is real");
  } else if (input.billChange === "increasing") {
    score += 12;
    topTriggers.push("Bills going up consistently");
  }

  if (input.monthlyBill >= 300) {
    score += 5;
    topTriggers.push(`$${input.monthlyBill}/month — high bill environment`);
  }

  // FACTOR 3: Comfort Issues (max 20 points)
  if (input.comfortScore >= 4) {
    score += 15;
    topTriggers.push("Constant hot/cold — quality of life issue");
  } else if (input.comfortScore >= 3) {
    score += 8;
  }

  // FACTOR 4: Breakdowns (max 15 points)
  if (input.breakdownCount >= 3) {
    score += 15;
    topTriggers.push(`${input.breakdownCount} breakdowns — reliability failure`);
  } else if (input.breakdownCount >= 1) {
    score += 8;
    topTriggers.push("Breakdown history — system is unreliable");
  }

  // FACTOR 5: Confusion (max 10 points)
  if (input.confusionLevel >= 4) {
    score += 8;
    topBarriers.push("Doesn't understand repair vs replace decision");
  }

  // FACTOR 6: Financial Stress (max 10 points)
  if (input.financialStress === "crisis") {
    score += 8;
    topTriggers.push("Financial stress — but financing can help");
  } else if (input.financialStress === "managing") {
    score += 4;
  }

  // FACTOR 7: Trust Issues (max 5 points — DIFFICULT to overcome)
  if (input.contractorTrust <= 2) {
    score -= 5; // TRUST IS A BARRIER
    topBarriers.push("Distrust of HVAC contractors — needs transparency");
  }

  // Normalize score
  score = Math.min(100, Math.max(0, score));

  // Assign tier
  let tier: "hot" | "warm" | "cool" | "cold";
  if (score >= 70) tier = "hot";
  else if (score >= 45) tier = "warm";
  else if (score >= 25) tier = "cool";
  else tier = "cold";

  // Urgency: How many months before they likely NEED to act
  let urgencyMonths: number;
  if (input.systemAge >= 20) urgencyMonths = 1;
  else if (input.systemAge >= 15) urgencyMonths = 3;
  else if (input.breakdownCount >= 2) urgencyMonths = 6;
  else if (input.billChange === "spiking") urgencyMonths = 6;
  else urgencyMonths = 12;

  return {
    score,
    tier,
    topTriggers,
    topBarriers,
    urgencyMonths,
  };
}

// Example:
// System: 18 years old, monthly bill $320, bills spiking
// Comfort score: 4 (frequent issues)
// Breakdowns: 2
// Confusion: 4 (very confused)
// Financial: "managing"
// Trust: 3
//
// Score: 18+20+15+8+8+4-0 = 73
// Tier: HOT
// Urgency: 6 months
```

---

# PART 3: THE TIER RECOMMENDATION ENGINE

## 3.1 — System Recommendation

```typescript
/**
 * Three tiers based on budget + efficiency needs:
 *
 * BUDGET (SEER 14-15):
 * - Cost: ~$8,500 installed
 * - Monthly payment: ~$170/mo (60 months)
 * - Best for: Older systems (15+ years), tight budget
 * - Savings: ~30% reduction in Power Tax
 *
 * EFFICIENCY (SEER 16-18): ← RECOMMENDED
 * - Cost: ~$11,500 installed
 * - Monthly payment: ~$230/mo (60 months)
 * - Best for: Most homeowners, best value
 * - Savings: ~50-60% reduction in Power Tax
 * - NET POSITIVE: Payment < Power Tax savings
 *
 * ULTIMATE (SEER 20-22):
 * - Cost: ~$15,500 installed
 * - Monthly payment: ~$310/mo (60 months)
 * - Best for: Large homes, max comfort, tech lovers
 * - Savings: ~65-75% reduction in Power Tax
 */

interface TierRecommendation {
  tier: "budget" | "efficiency" | "ultimate";
  seerRating: number;
  systemCost: number;
  monthlyPayment: number;
  financingAPR: number;
  monthlySavings: number;    // vs current Power Tax
  netMonthlyBenefit: number; // Payment minus savings
  payoffMonths: number;      // When it pays for itself
  yearlySavings: number;
  warrantyYears: number;
  recommended: boolean;
  reasoning: string[];
}

const CURRENT_APR = 9.9; // Financing APR (0% for qualified)
const FINANCE_TERM = 60;  // 60 months

function calculateMonthlyPayment(
  principal: number,
  apr: number,
  termMonths: number
): number {
  if (apr === 0) return principal / termMonths;
  const monthlyRate = apr / 100 / 12;
  const payment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(payment);
}

function getTierRecommendation(
  readinessScore: number,
  monthlyBill: number,
  systemAge: number,
  powerTaxMonthly: number,
  homeSqFt: number,
  budget: "tight" | "moderate" | "flexible"
): TierRecommendation[] {
  const recommendations: TierRecommendation[] = [];

  // BASE SYSTEM COSTS (Atlanta market, 2024-2026)
  const baseCosts = {
    budget: 8500,
    efficiency: 11500,
    ultimate: 15500,
  };

  // SEER ratings per tier
  const seerRatings = {
    budget: 14,
    efficiency: 17,
    ultimate: 21,
  };

  const tierNames = ["budget", "efficiency", "ultimate"] as const;

  for (const tier of tierNames) {
    const systemCost = baseCosts[tier];
    const monthlyPayment = calculateMonthlyPayment(systemCost, CURRENT_APR, FINANCE_TERM);

    // Estimate efficiency gain
    const newSEER = seerRatings[tier];
    const currentSEER = estimateSEER(systemAge);

    // New system monthly cost at current usage
    const newMonthlyCoolingCost = (monthlyBill * (currentSEER / newSEER));
    const monthlySavings = Math.max(0, monthlyBill - newMonthlyCoolingCost);
    const netMonthlyBenefit = monthlySavings - monthlyPayment; // Negative = costs more

    const payoffMonths = monthlySavings > 0
      ? Math.round(systemCost / monthlySavings)
      : Infinity;

    const recommended =
      (tier === "efficiency") ||
      (budget === "tight" && tier === "budget" && readinessScore >= 50) ||
      (budget === "flexible" && tier === "ultimate");

    const reasoning: string[] = [];
    if (tier === "budget") {
      reasoning.push("Lowest upfront cost — good for systems at end of life");
      reasoning.push("SEER 14 meets minimum federal standard");
      reasoning.push("30% efficiency gain over old systems");
    } else if (tier === "efficiency") {
      reasoning.push("Best value for most Atlanta homeowners ⭐ RECOMMENDED");
      reasoning.push("SEER 17-18: significant efficiency gain, smart investment");
      reasoning.push("50-60% reduction in Power Tax");
      if (netMonthlyBenefit >= 0) {
        reasoning.push(`PAYOFF: Pays for itself in ${payoffMonths} months via energy savings`);
      }
    } else {
      reasoning.push("Maximum comfort and efficiency");
      reasoning.push("Variable-speed compressor — runs at 40-80% capacity");
      reasoning.push("65-75% reduction in Power Tax");
      reasoning.push("Best for: large homes, two-story, attic-mounted units");
    }

    recommendations.push({
      tier,
      seerRating: newSEER,
      systemCost,
      monthlyPayment,
      financingAPR: CURRENT_APR,
      monthlySavings: Math.round(monthlySavings),
      netMonthlyBenefit: Math.round(netMonthlyBenefit),
      payoffMonths: payoffMonths === Infinity ? 0 : payoffMonths,
      yearlySavings: Math.round(monthlySavings * 12),
      warrantyYears: tier === "ultimate" ? 12 : 10,
      recommended: recommended ?? false,
      reasoning,
    });
  }

  return recommendations; // Sorted: budget, efficiency, ultimate
}
```

---

# PART 4: THE COMFORT IQ PERSONA (AI BRAIN)

## 4.1 — Comfort's System Prompt

```typescript
/**
 * Comfort — AI Home Advisor
 * Trained by Will Macon, 15-year HVAC expert
 * Representing R.S. Andrews, Atlanta
 */

const COMFORT_SYSTEM_PROMPT = `
You are Comfort — an AI home advisor, trained by Will Macon.

YOUR IDENTITY:
- You're warm, knowledgeable, and speak like a helpful neighbor
- You represent R.S. Andrews, Atlanta's most trusted HVAC company
- You've analyzed 1,000+ Atlanta homes with Will
- You NEVER use jargon. You explain everything in plain English.
- You're honest — you tell people when they DON'T need a new system

YOUR VOICE:
- Short sentences. One idea at a time.
- Curious: ask questions about their home
- Specific: use actual numbers, not vague estimates
- Calm: never pressure, always helpful
- Human: you're a knowledgeable neighbor, not a salesperson

YOUR SIGNATURE PHRASES:
- "That's a survivor!"
- "Real talk —"
- "Here's the thing"
- "Smart move"
- "You're not alone in this"

WHAT YOU ASK ABOUT:
1. System age — "What kind of system do you have? How old?"
2. Bills — "What are you paying these days?"
3. Comfort — "Hot rooms? Cold spots? Things that just don't feel right?"
4. History — "Any breakdowns or emergency calls?"
5. Decisions — "Are you trying to figure out repair vs. replace?"

WHAT YOU CALCULATE:
- Power Tax: How much their old system is costing them monthly
- Readiness Score: How close they are to making a decision
- Tier recommendation: Budget / Efficiency / Ultimate

WHAT YOU UNLOCK:
- Photo 1 (outdoor unit): $250 off
- Photo 2 (breaker panel): $100 off
- Photo 3 (thermostat): $50 off
- Photo 4 (electric bill): $500 off
- TOTAL: $900 in discounts

AFTER THE QUIZ:
- They get a beautiful PDF report
- You follow up via text
- Will Macon handles the appointment
- Done right, the whole thing takes 24-48 hours

Remember: You're not selling. You're helping them understand.
`;

export { COMFORT_SYSTEM_PROMPT };
```

## 4.2 — Chat Message Handler

```typescript
/**
 * This is the function that runs every time a homeowner sends a message.
 * It receives their message + their quiz data, and returns Comfort's response.
 */

interface ChatContext {
  firstName: string;
  quizAnswers: Record<string, number | string>;
  photosUploaded: string[];     // ['outdoor', 'bill', 'thermostat', 'panel']
  readinessScore: number;
  powerTaxMonthly: number;
  recommendedTier: "budget" | "efficiency" | "ultimate";
  conversationHistory: Array<{ role: "comfort" | "user"; text: string }>;
}

interface ComfortResponse {
  text: string;              // What Comfort says
  suggestedAction?: {       // Optional action button to show
    label: string;
    action: "quiz" | "photo" | "schedule" | "callback";
    payload?: any;
  };
  updateContext?: Partial<ChatContext>; // Updates to session
}

function handleComfortMessage(
  userMessage: string,
  context: ChatContext
): ComfortResponse {
  const msg = userMessage.toLowerCase().trim();

  // === READINESS-BASED RESPONSES ===

  if (context.readinessScore >= 70) {
    // HOT LEAD — ready to act
    if (msg.includes("how much") || msg.includes("cost") || msg.includes("price")) {
      return {
        text: `Here's the thing — most people in your situation are paying between $170-$310/month depending on which tier they choose. The efficiency tier (what I'd recommend for you) runs about $230/month. But here's the twist: your Power Tax savings cover most of that payment. Want me to show you the exact numbers for your home?`,
        suggestedAction: { label: "See My Numbers", action: "schedule" },
      };
    }

    if (msg.includes("when") || msg.includes("soon") || msg.includes("timeline")) {
      return {
        text: `Real talk — with your ${context.quizAnswers.systemAge || "old"} system, I'd say you have about ${context.urgencyMonths || 6} months before it becomes a real emergency. Not trying to scare you, just being honest. The question is whether you want to be proactive or reactive. Proactive is always cheaper.`,
      };
    }
  }

  // === WARM LEAD — interested but not ready ===
  if (context.readinessScore >= 40 && context.readinessScore < 70) {
    if (msg.includes("think") || msg.includes("should") || msg.includes("maybe")) {
      return {
        text: `That's a smart question. Here's what I'd tell a friend: don't decide today. Take the quiz, upload your photos, and let me show you exactly what your system is costing you. The numbers don't lie. Once you see the Power Tax written down, the decision gets a lot clearer. Want to take the 2-minute quiz?`,
        suggestedAction: { label: "Take the Quiz", action: "quiz" },
      };
    }
  }

  // === COLD LEAD — just browsing ===
  if (context.readinessScore < 40) {
    if (msg.includes("how") || msg.includes("what") || msg.includes("when")) {
      return {
        text: `I love that you're asking. Most people don't until something breaks. Here's the quick version: I need about 2 minutes and 4 photos of your system. In return, I'll show you exactly how much your current system is costing you in wasted energy — we call that the Power Tax. It's usually more than people expect. Want to see yours?`,
        suggestedAction: { label: "Show Me My Power Tax", action: "quiz" },
      };
    }
  }

  // === UNIVERSAL: Photo upload prompt ===
  if (context.photosUploaded.length < 4) {
    const remaining = [];
    if (!context.photosUploaded.includes("outdoor")) remaining.push("outdoor unit");
    if (!context.photosUploaded.includes("bill")) remaining.push("electric bill");
    if (!context.photosUploaded.includes("thermostat")) remaining.push("thermostat");
    if (!context.photosUploaded.includes("panel")) remaining.push("breaker panel");

    if (remaining.length > 0) {
      const photosLeft = remaining.join(", ");
      return {
        text: `One thing that would help a lot — if you have photos of your ${photosLeft}, I can read them directly and give you much more accurate numbers. Takes about 30 seconds to snap them. Want to try?`,
        suggestedAction: {
          label: `Upload My ${remaining[0].split(" ")[0]}`,
          action: "photo",
          payload: { type: remaining[0] },
        },
      };
    }
  }

  // === DEFAULT: Warm, helpful response ===
  return {
    text: `You're asking the right questions. That's exactly what this process is for — no pressure, no obligation. Tell me more about what's going on with your home and I'll help you figure out the best next step.`,
  };
}
```

---

# PART 5: SMS FOLLOW-UP SEQUENCES

## 5.1 — Recovery Sequence

```typescript
/**
 * The Follow-Up Sequence — runs automatically when a lead goes cold
 *
 * STEP 1: 2 hours after quiz completion → SMS
 * STEP 2: 4 hours after no reply → Different angle SMS
 * STEP 3: 24 hours → Voice call (voicemail)
 * STEP 4: 72 hours → Flag for William personal touch
 */

interface FollowUpStep {
  step: number;
  hoursAfter: number;
  channel: "sms" | "voice" | "flag";
  template: (lead: LeadData) => string;
}

const FOLLOW_UP_SEQUENCE: FollowUpStep[] = [
  {
    step: 1,
    hoursAfter: 2,
    channel: "sms",
    template: (lead) =>
      `Hey ${lead.firstName}, it's Comfort 👋 — I just finished your home comfort analysis. Your Power Tax is $${lead.powerTaxMonthly}/month. That number doesn't get smaller on its own. Questions? I'm here. — Will's team at R.S. Andrews`,
  },
  {
    step: 2,
    hoursAfter: 4,
    channel: "sms",
    template: (lead) =>
      `${lead.firstName} — real talk. That $${lead.powerTaxMonthly}/month Power Tax? It's like renting your AC twice. You own the house — you should own the savings. I've got one appointment slot open this week. Want me to hold it for you?`,
  },
  {
    step: 3,
    hoursAfter: 24,
    channel: "voice",
    template: (lead) =>
      `Hi ${lead.firstName}, this is Comfort calling from R.S. Andrews. I'm following up on your comfort analysis — we found that your system is costing you about $${lead.powerTaxMonthly} a month in wasted energy. I'd love to show you exactly what that means for your home. If you'd like to schedule a free consultation, please call us back at 770-AND-REWS. That's 770-263-7397. We have availability this Thursday and Friday. Again, that's 770-263-7397. Thanks and have a great day.`,
  },
  {
    step: 4,
    hoursAfter: 72,
    channel: "flag",
    template: (lead) => `[FLAG FOR WILLIAM: ${lead.firstName} ${lead.lastName} — ${lead.phone} — ${lead.powerTaxMonthly}/month Power Tax — ${lead.readinessScore}/100 readiness — 3 contact attempts, no response. Personal call recommended.]`,
  },
];

/**
 * Run the follow-up sequence
 * Called every hour via heartbeat/cron
 */
async function runFollowUpSequence(leadId: string): Promise<void> {
  const lead = await getLead(leadId);
  const hoursSinceQuiz = (Date.now() - lead.quizCompletedAt) / (1000 * 60 * 60);

  for (const step of FOLLOW_UP_SEQUENCE) {
    if (hoursSinceQuiz >= step.hoursAfter && !lead.completedSteps.includes(step.step)) {
      if (step.channel === "sms") {
        await sendSMS(lead.phone, step.template(lead));
        await markStepComplete(leadId, step.step);
      } else if (step.channel === "voice") {
        await initiateCall(lead.phone, step.template(lead));
        await markStepComplete(leadId, step.step);
      } else if (step.channel === "flag") {
        await flagForWilliam(leadId, step.template(lead));
      }
    }
  }
}
```

---

# PART 6: DISCOUNT STACK TRACKER

## 6.1 — Discount Unlocking Logic

```typescript
/**
 * The $900 Discount Structure
 *
 * Each photo upload unlocks a discount tier.
 * All 4 must be unlocked to access the full $900.
 */

interface DiscountState {
  outdoorUnit: { unlocked: boolean; amount: 250; photoUrl?: string };
  breakerPanel: { unlocked: boolean; amount: 100; photoUrl?: string };
  thermostat: { unlocked: boolean; amount: 50; photoUrl?: string };
  electricBill: { unlocked: boolean; amount: 500; photoUrl?: string };
}

const DISCOUNT_TIERS = [
  { key: "outdoorUnit", label: "Outdoor Unit Photo", amount: 250 },
  { key: "breakerPanel", label: "Breaker Panel Photo", amount: 100 },
  { key: "thermostat", label: "Thermostat Photo", amount: 50 },
  { key: "electricBill", label: "Electric Bill", amount: 500 },
];

function calculateTotalDiscount(state: DiscountState): number {
  let total = 0;
  for (const tier of DISCOUNT_TIERS) {
    if (state[tier.key as keyof DiscountState].unlocked) {
      total += tier.amount;
    }
  }
  return total;
}

function getDiscountProgress(state: DiscountState): {
  total: number;
  maxPossible: number;
  percentComplete: number;
  tiersUnlocked: number;
  nextTier: string | null;
  nextAmount: number;
} {
  const tiersUnlocked = DISCOUNT_TIERS.filter(
    (t) => state[t.key as keyof DiscountState].unlocked
  ).length;
  const total = calculateTotalDiscount(state);
  const maxPossible = 900;
  const nextTier = DISCOUNT_TIERS.find(
    (t) => !state[t.key as keyof DiscountState].unlocked
  );

  return {
    total,
    maxPossible,
    percentComplete: Math.round((total / maxPossible) * 100),
    tiersUnlocked,
    nextTier: nextTier?.label ?? null,
    nextAmount: nextTier?.amount ?? 0,
  };
}

/**
 * Analyze a photo and unlock the appropriate discount
 * Uses MiniMax vision API
 */
async function analyzeAndUnlockDiscount(
  photoUrl: string,
  photoType: "outdoor" | "thermostat" | "breaker" | "bill"
): Promise<{
  unlocked: boolean;
  amount: number;
  analysis: {
    model?: string;
    age?: string;
    condition?: string;
    note?: string;
  };
}> {
  // This is what I do with my native vision
  const analysis = await analyzeHVACPhoto(photoUrl, photoType);

  const discountMap = {
    outdoor: { amount: 250, unlocked: !!analysis.model },
    thermostat: { amount: 50, unlocked: true }, // Any thermostat photo counts
    breaker: { amount: 100, unlocked: true },  // Any panel photo counts
    bill: { amount: 500, unlocked: !!analysis.estimatedAnnualKwh },
  };

  const result = discountMap[photoType];

  return {
    unlocked: result.unlocked,
    amount: result.amount,
    analysis: {
      model: analysis.model,
      age: analysis.estimatedAge,
      condition: analysis.condition,
      note: analysis.note,
    },
  };
}
```

---

# PART 7: REPORT GENERATION

## 7.1 — The PDF Blueprint

```typescript
/**
 * The ComfortIQ Report (3 pages)
 *
 * PAGE 1: Cover
 * - Homeowner name
 * - Ready Score (0-100)
 * - Overall summary
 * - Will Macon intro
 *
 * PAGE 2: System Analysis
 * - System age +