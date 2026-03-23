// ============================================================
// Comfort AI — Response Engine
// Built by Tandem AI for ComfortIQ.AI
// Handles dynamic quiz-based + conversational AI responses
// ============================================================

import COMFORT_SYSTEM_PROMPT from "./comfort-persona";

export interface QuizContext {
  firstName?: string;
  systemAge?: string;
  monthlyBill?: number;
  billStatus?: "low" | "med" | "high";
  comfortScore?: number; // 1-5
  emergencyCount?: number;
  budgetStress?: "low" | "med" | "high";
  readinessTier?: "hot" | "warm" | "cool" | "cold";
  readinessScore?: number;
  powerTaxMonthly?: number;
  powerTaxAnnual?: number;
  discountUnlocked?: number;
  photoUploaded?: boolean;
  reportViewed?: boolean;
  appointmentBooked?: boolean;
  city?: string;
}

export interface ConversationTurn {
  role: "comfort" | "user";
  text: string;
  timestamp: number;
}

// ──────────────────────────────────────────────────────────────
// POWER TAX ENGINE
// ──────────────────────────────────────────────────────────────

const ATLANTA_KWH_RATE = 0.14;
const SUMMER_MONTHS = 6;

function estimateSEER(systemAge: number): number {
  if (systemAge <= 2) return 18;
  if (systemAge <= 5) return 16;
  if (systemAge <= 8) return 14;
  if (systemAge <= 12) return 12;
  if (systemAge <= 18) return 10;
  if (systemAge <= 25) return 8;
  return 6;
}

function deriveSystemAge(ageBand?: string): number {
  const map: Record<string, number> = {
    "<8": 5,
    "8-12": 10,
    "12-15": 13,
    ">15": 18,
  };
  return ageBand ? map[ageBand] ?? 12 : 12;
}

export function calculatePowerTax(systemAge: number, monthlyBill: number): {
  monthlyPowerTax: number;
  annualPowerTax: number;
  currentSEER: number;
  newSEER: number;
  savingsPerMonth: number;
} {
  const currentSEER = estimateSEER(systemAge);
  const newSEER = 18; // SEER 18 upgrade baseline

  const annualCoolingCost = monthlyBill * 12;
  const summerDailyHours = 8.5;
  const summerDays = 153;
  const totalHours = summerDays * summerDailyHours;
  const btuBaseline = 48000;

  const currentCost = (btuBaseline / currentSEER) * totalHours * ATLANTA_KWH_RATE;
  const newCost = (btuBaseline / newSEER) * totalHours * ATLANTA_KWH_RATE;
  const annualSavings = Math.max(0, currentCost - newCost);
  const monthlySavings = annualSavings / 12;

  return {
    monthlyPowerTax: Math.round(annualSavings / 12),
    annualPowerTax: Math.round(annualSavings),
    currentSEER,
    newSEER,
    savingsPerMonth: Math.round(monthlySavings),
  };
}

// ──────────────────────────────────────────────────────────────
// READINESS SCORE ENGINE
// ──────────────────────────────────────────────────────────────

export function calculateReadinessScore(
  comfortScore: number,
  billStatus: "low" | "med" | "high",
  systemAge: string,
  emergencyCount: number,
  budgetStress: "low" | "med" | "high"
): { score: number; tier: "hot" | "warm" | "cool" | "cold" } {
  let score = 0;

  score += comfortScore * 4; // up to 20 pts
  if (billStatus === "high") score += 20;
  else if (billStatus === "med") score += 10;

  if (systemAge === ">15") score += 25;
  else if (systemAge === "12-15") score += 18;
  else if (systemAge === "8-12") score += 8;

  if (emergencyCount >= 2) score += 15;
  else if (emergencyCount >= 1) score += 8;

  if (budgetStress === "high") score += 8;
  else if (budgetStress === "med") score += 4;

  score = Math.min(100, Math.max(0, score));

  let tier: "hot" | "warm" | "cool" | "cold";
  if (score >= 70) tier = "hot";
  else if (score >= 45) tier = "warm";
  else if (score >= 25) tier = "cool";
  else tier = "cold";

  return { score, tier };
}

// ──────────────────────────────────────────────────────────────
// TIER MESSAGES
// ──────────────────────────────────────────────────────────────

const TIER_MESSAGES = {
  hot: {
    opening: (name: string) =>
      `${name ? `Hey ${name},` : "Hey there,"} I'm going to be straight with you — your home is telling us something urgent. Based on everything in your assessment, your HVAC system needs attention soon. Like, within the next few months. The good news? We caught it before it became an emergency.`,
    urgency:
      "Here's what I tell every homeowner in this situation: waiting usually costs more. Emergency calls, after-hours rates, being forced into a replacement on someone else's timeline. The smarter play is to make this decision on your terms — before it becomes urgent.",
    nextStep:
      "I want to get you a free in-home assessment so we can see exactly what we're dealing with. No obligation — just William coming out to take a look and giving you a straight answer on whether to repair or replace. Want to book that?",
  },
  warm: {
    opening: (name: string) =>
      `${name ? `Hey ${name},` : "Hey,"} here's where we are: your home isn't in crisis mode, but it's definitely not where it should be. You're paying more than you need to every month, and your system is getting older. You've got some time — but not forever.`,
    urgency:
      "I've seen this situation hundreds of times. The homeowners who act now — within the next 3-6 months — almost always come out ahead. The ones who wait until August when the AC is running 24/7 and something breaks? They end up paying double.",
    nextStep:
      "I'd love to get you a free quote. We'll show you exactly what a new system would cost, what your financing looks like, and what kind of energy savings you'd get. Takes about 20 minutes. Want to book a time?",
  },
  cool: {
    opening: (name: string) =>
      `${name ? `Hey ${name},` : "Hey,"} here's the honest picture: your home is in decent shape. Your system is still holding — you're not in crisis. But there's definitely room to improve, and you might be spending more than you need to on electric bills.`,
    urgency:
      "Nothing urgent right now, which means you have the luxury of time. Use it. A new system now — while you can plan for it, pick your contractor, explore financing — is always better than a rushed decision later. That's the smart play here.",
    nextStep:
      "Want me to put together a no-obligation quote? We can also run your electric bill through our Power Tax calculator and show you exactly what you're losing every month. Takes two minutes.",
  },
  cold: {
    opening: (name: string) =>
      `${name ? `Hey ${name},` : "Hey,"} I'll keep this short and honest: your home is in pretty good shape right now. Your system is relatively young, and you're not seeing major red flags. That's a good place to be.`,
    urgency:
      "You're not someone who needs to act urgently. I'd rather you save your money and not spend it unnecessarily. The only thing I'd suggest is keeping an eye on your system as it ages — maybe an annual tune-up — so we catch anything early.",
    nextStep:
      "I'm not going to try to sell you something you don't need. If you want to book a free annual inspection for peace of mind, we're happy to do that. Otherwise, keep an eye on things and check back in if anything changes.",
  },
};

// ──────────────────────────────────────────────────────────────
// PHOTO ANALYSIS RESPONSES
// ──────────────────────────────────────────────────────────────

export function analyzeHVACPhoto(imageDescription: string): string {
  // Keywords that indicate age, condition, urgency
  const hasRust = imageDescription.toLowerCase().includes("rust");
  const hasDents = imageDescription.toLowerCase().includes("dent");
  const hasAgeStickers = imageDescription.toLowerCase().match(/\b(19|20)\d{2}\b/);
  const hasCarrierLogo = imageDescription.toLowerCase().includes("carrier");
  const hasTraneLogo = imageDescription.toLowerCase().includes("trane");
  const hasLennoxLogo = imageDescription.toLowerCase().includes("lennox");
  const hasRheemLogo = imageDescription.toLowerCase().includes("rheem");
  const hasGoodmanLogo = imageDescription.toLowerCase().includes("goodman");
  const hasCompressorDamage = imageDescription.toLowerCase().includes("compressor") && imageDescription.toLowerCase().includes("damage");
  const hasCorrosion = imageDescription.toLowerCase().includes("corrosion") || imageDescription.toLowerCase().includes("corroded");

  if (hasCompressorDamage) {
    return "I can see clear signs of compressor stress — this is usually the most expensive repair and often signals the end of the unit's life. I'd strongly recommend getting a professional assessment before putting any more money into this system.";
  }
  if (hasCorrosion || (hasRust && imageDescription.toLowerCase().includes("coil"))) {
    return "There's visible corrosion on the coils — that means the refrigerant is leaking and the system is working twice as hard to cool your home. This is why your bills are probably higher than they should be. An experienced technician can confirm, but I can already tell you this needs attention.";
  }
  if (hasAgeStickers) {
    const yearMatch = imageDescription.match(/\b(19|20)\d{2}\b/);
    const yearStr = yearMatch ? yearMatch[0] : "";
    if (yearStr) {
      const year = parseInt(yearStr);
      const age = 2026 - year;
      if (age >= 18) {
        return `The serial number tells me this unit was installed in ${year}. That makes it ${age} years old — well past the typical 12-15 year lifespan. At this point, you're in "nursing it along" territory. I tell every homeowner the same thing: this is when replacement starts becoming cheaper than continued repairs.`;
      } else if (age >= 12) {
        return `Unit from ${year} — that's about ${age} years old. Right in that window where systems start showing their age. Nothing critical yet, but you're entering the zone where I'd start planning for a replacement within the next 1-2 years.`;
      }
    }
  }
  if (hasCarrierLogo || hasTraneLogo || hasLennoxLogo) {
    return "That's a solid brand — Carrier, Trane, Lennox make quality equipment. The age matters more than the brand at this point. What does the serial number sticker say? That'll tell us exactly how old this unit is and what we're working with.";
  }
  if (hasDents || hasRust) {
    return "I can see some cosmetic damage — the question is whether it's just skin-deep or if it's affecting the function. Dents in the coil fins can restrict airflow and make the system work harder. Worth having a tech take a close look.";
  }
  return "I can see the unit from your photo. Can you tell me — is there a serial number sticker on it? Usually a white or silver label with numbers on it. That'll tell me exactly how old it is, which is the most important thing to know right now.";
}

export function analyzeBreakerPanel(imageDescription: string): string {
  const isFederalPacific = imageDescription.toLowerCase().includes("federal pacific") || imageDescription.toLowerCase().includes("fpe");
  const isZinsco = imageDescription.toLowerCase().includes("zinsco") || imageDescription.toLowerCase().includes("zinsco");
  const isSquareD = imageDescription.toLowerCase().includes("square d") || imageDescription.toLowerCase().includes("square d");
  const isEaton = imageDescription.toLowerCase().includes("eaton") || imageDescription.toLowerCase().includes("ch">
  const isMurray = imageDescription.toLowerCase().includes("murray") || imageDescription.toLowerCase().includes("murray");
  const hasDoubleTaps = imageDescription.toLowerCase().includes("double tap") || imageDescription.toLowerCase().includes("double-tap");
  const hasRust = imageDescription.toLowerCase().includes("rust") || imageDescription.toLowerCase().includes("corrosion");

  if (isFederalPacific) {
    return "This is a Federal Pacific panel — and I need to be direct with you. These panels have a known fire hazard risk. The breakers don't always trip when they should, which creates a safety concern. I'd recommend getting this inspected by an electrician specifically trained to evaluate FPE panels. This is worth addressing before any HVAC work.";
  }
  if (isZinsco) {
    return "I see a Zinsco panel — similar concern to Federal Pacific. These had documented issues with breakers not tripping properly. Not an immediate emergency, but something you want to have evaluated before installing a new high-efficiency AC unit. Worth an electrician look first.";
  }
  if (hasDoubleTaps) {
    return "I can see double-tapped breakers — that's when two wires are connected to one breaker. It's a code violation and can create a fire risk. This should be corrected by an electrician before any new equipment is installed. Most HVAC contractors will require this to be fixed anyway.";
  }
  if (hasRust || imageDescription.toLowerCase().includes("burn marks")) {
    return "I'm seeing some red flags here — rust or burn marks on a panel means there's been heat or moisture getting in. That's worth having an electrician investigate before we do any HVAC work. Safety first.";
  }
  if (isSquareD || isMurray || isEaton) {
    return "That's a quality panel — Square D, Murray, and Eaton are all reliable brands. The age and overall condition matter more than the brand at this point. What's the amp rating shown on the main breaker?";
  }
  return "I can see your panel from the photo. Can you tell me if there are any labels with a brand name on them — usually on the front or inside the door? And do you know what the main breaker amp rating is?";
}

export function analyzeWaterHeater(imageDescription: string): string {
  const hasTank = imageDescription.toLowerCase().includes("tank");
  const hasTankless = imageDescription.toLowerCase().includes("tankless") || imageDescription.toLowerCase().includes("tank-less");
  const hasRust = imageDescription.toLowerCase().includes("rust");
  const hasLeakSigns = imageDescription.toLowerCase().includes("leak") || imageDescription.toLowerCase().includes("water damage");
  const hasSediment = imageDescription.toLowerCase().includes("sediment") || imageDescription.toLowerCase().includes("debris");
  const hasYear = imageDescription.toLowerCase().match(/\b(19|20)\d{2}\b/);

  if (hasLeakSigns) {
    return "I can see signs of active leaking — water heaters that are actively leaking need to be addressed immediately. Water damage spreads fast, and this can affect your floors and walls. I'd recommend getting someone out this week, not next month.";
  }
  if (hasYear) {
    const yearMatch = imageDescription.match(/\b(19|20)\d{2}\b/);
    const yearStr = yearMatch ? yearMatch[0] : "";
    if (yearStr) {
      const year = parseInt(yearStr);
      const age = 2026 - year;
      if (age >= 15) {
        return `This unit is from ${year} — ${age} years old. That's at or past the typical lifespan for a water heater. You're not in crisis, but the clock is ticking. Budget $1,200-$1,800 for a replacement in the next 6-12 months. If you're already seeing rust or sediment, the writing's on the wall.`;
      } else if (age >= 10) {
        return `About ${age} years old — right in that window where things can start going. Keep an eye on your water bill, and watch for any rust-colored hot water — that's usually the first sign the tank is going. A proactive replacement before it fails is always cheaper than an emergency.";
      }
    }
  }
  if (hasTankless) {
    return "That's a tankless water heater — those are great. They typically last 20+ years if maintained properly. The age question is different for tankless vs. tank. Do you know roughly when it was installed?";
  }
  if (hasSediment || hasRust) {
    return "I'm seeing sediment buildup or early rust — that's the number one sign a tank is approaching end of life. Sediment at the bottom causes the tank to work harder, which raises your gas bill and accelerates wear. Flushing it can buy you some time, but if it's over 10 years old, you're on borrowed time.";
  }
  return "I can see your water heater in the photo. Can you check the label on the unit — usually near the top — and tell me the year on it? That tells us how much life it has left.";
}

// ──────────────────────────────────────────────────────────────
// DYNAMIC RESPONSE GENERATOR
// ──────────────────────────────────────────────────────────────

export function generateComfortResponse(
  userMessage: string,
  context: QuizContext,
  conversationHistory: ConversationTurn[]
): string {
  const lower = userMessage.toLowerCase();
  const { tier, readinessScore } = calculateReadinessScore(
    context.comfortScore ?? 3,
    context.billStatus ?? "low",
    context.systemAge ?? "<8",
    context.emergencyCount ?? 0,
    context.budgetStress ?? "low"
  );

  // ─── PHOTO ANALYSIS TRIGGERS ───
  if (
    lower.includes("photo") ||
    lower.includes("picture") ||
    lower.includes("upload") ||
    lower.includes("image")
  ) {
    if (
      lower.includes("ac") ||
      lower.includes("hvac") ||
      lower.includes("outdoor") ||
      lower.includes("compressor") ||
      lower.includes("unit")
    ) {
      return "Perfect — upload a clear photo of your outdoor AC unit and I'll take a look. The serial number sticker is the most important part to get in the frame. That'll tell me the age, model, and condition. You can upload right here.";
    }
    if (lower.includes("breaker") || lower.includes("panel") || lower.includes("electrical")) {
      return "Go ahead and upload a photo of your breaker panel — the main electrical panel in your home. I'm looking for the brand name and any warning signs like rust, double-tapped breakers, or burn marks. Upload what you've got.";
    }
    if (
      lower.includes("water") ||
      lower.includes("heater") ||
      lower.includes("tank") ||
      lower.includes("plumb")
    ) {
      return "Upload a photo of your water heater — the label on the unit is what I need most. That has the serial number and year made. A photo of the unit itself helps too.";
    }
  }

  // ─── QUOTE / COST TRIGGERS ───
  if (
    lower.includes("cost") ||
    lower.includes("price") ||
    lower.includes("quote") ||
    lower.includes("estimate") ||
    lower.includes("expensive") ||
    lower.includes("how much")
  ) {
    if (tier === "hot") {
      return "Here's the honest truth — replacing an HVAC system is a significant investment. But here's the thing: it's also one of the best investments you can make in your home. I'm going to show you exactly what a new system costs, what your financing looks like, and what you'll save every month. Most homeowners are surprised how manageable it actually is.";
    }
    return "Let me put together a no-obligation quote for you. It takes me about two minutes — I'll need to know your home size and what tier you're interested in. I'll show you exactly what it costs, what your monthly payment would be, and what kind of energy savings you'd get. Fair?";
  }

  // ─── REPAIR VS REPLACE TRIGGERS ───
  if (
    lower.includes("repair") ||
    lower.includes("replace") ||
    lower.includes("fix") ||
    lower.includes("should i")
  ) {
    if (context.systemAge === ">15" || (context.systemAge === "12-15" && (context.billStatus === "high" || (context.emergencyCount ?? 0) >= 1))) {
      return "Here's my rule of thumb: if the repair is more than half the cost of a new system, and your unit is over 12 years old, you're usually better off replacing. At this point, you're paying for something that's on borrowed time. The question isn't whether to replace — it's when. And I'd say in your case, the math is pointing toward now, not later.";
    }
    return "The answer depends on three things: how old the unit is, how much the repair costs, and how many times you've already repaired it. What's the repair quote looking like, and how old is the unit?";
  }

  // ─── FINANCING TRIGGERS ───
  if (
    lower.includes("financing") ||
    lower.includes("payment") ||
    lower.includes("monthly") ||
    lower.includes("loan") ||
    lower.includes("credit")
  ) {
    return "Here's how financing works for most homeowners: you can get 0% APR financing for qualified buyers on a new HVAC system, with monthly payments often lower than what you're currently losing in excess electric bills. That means the new system can sometimes pay for itself from month one. Want me to show you what that looks like for your specific situation?";
  }

  // ─── DISCOUNT / $900 TRIGGERS ───
  if (
    lower.includes("discount") ||
    lower.includes("$900") ||
    lower.includes("nine hundred") ||
    lower.includes("credit") ||
    lower.includes("savings")
  ) {
    return "The $900 discount is real — it comes from uploading photos of your home that help us understand exactly what you need. Outdoor unit photo gets you $250 off, breaker panel photo adds $100, thermostat photo adds $50, and your electric bill adds the final $500. The bill photo is the most important one — it lets us calculate your Power Tax and see exactly what you're overpaying. Have you uploaded your electric bill yet?";
  }

  // ─── POWER TAX TRIGGERS ───
  if (
    lower.includes("power tax") ||
    lower.includes("electric bill") ||
    lower.includes("energy bill") ||
    lower.includes("utility")
  ) {
    if (context.powerTaxMonthly && context.powerTaxMonthly > 0) {
      return `We ran your electric bill through the Power Tax calculator — your system is likely costing you about $${context.powerTaxMonthly} a month more than it should. That's $${(context.powerTaxMonthly * 12).toLocaleString()} a year. A new SEER 18 system would bring most of that back. That's the number that changes the math on replacement. Want me to show you exactly how that works?`;
    }
    return "The Power Tax is something I calculate from your electric bill — it tells us exactly how much your HVAC system is costing you in wasted energy every month. If you upload a photo of your electric bill, I can show you your exact Power Tax number. Takes about 30 seconds.";
  }

  // ─── SCHEDULE / APPOINTMENT TRIGGERS ───
  if (
    lower.includes("book") ||
    lower.includes("schedule") ||
    lower.includes("appointment") ||
    lower.includes("schedule") ||
    lower.includes("call") ||
    lower.includes("visit")
  ) {
    return "Let's get you on the calendar. I just need a time that works and a phone number. William comes out to your home, takes a look at everything, and gives you a straight honest answer on what you need — repair or replace, what it should cost, and how to think about financing. No obligation. What day works best?";
  }

  // ─── SYSTEM AGE / HOW OLD ───
  if (
    lower.includes("how old") ||
    lower.includes("age") ||
    lower.includes("year") ||
    lower.includes("when did") ||
    lower.includes("lifespan")
  ) {
    if (context.systemAge) {
      const ageDescriptions: Record<string, string> = {
        "<8": "Your current unit is under 8 years old — that's young for an HVAC system. You probably have 8-10 more years if it's been maintained.",
        "8-12": "Your unit is in that 8-12 year range — mid-life. This is when things start needing more attention. Nothing urgent yet, but worth watching.",
        "12-15": "At 12-15 years old, you're in the window where systems start showing their age. I'd start planning for a replacement within the next 1-2 years.",
        ">15": "15+ years means your system is past its typical lifespan. At this point, you're in 'nursing it along' territory — repairs are expensive and reliability drops.",
      };
      return ageDescriptions[context.systemAge] ?? "";
    }
    return "The easiest way to tell is to look at the serial number sticker on your outdoor unit. It usually has a date code — sometimes it's the year, sometimes a letter-number code. Can you take a quick look and tell me what you see?";
  }

  // ─── TRUST / CONTRACTOR CONCERN ───
  if (
    lower.includes("trust") ||
    lower.includes("contractor") ||
    lower.includes("salesperson") ||
    lower.includes("quote") ||
    lower.includes("salesman")
  ) {
    return "I completely understand being cautious. Here's what I'll tell you: we're not here to pressure you into anything. William comes out, takes a look, and gives you a straight answer. If you don't need a new system, we'll tell you that. If you do, we'll show you exactly what it costs and why. No games. The only thing we ask is that you get the information — then you decide.";
  }

  // ─── HVAC NOT COOLING / WORKING ───
  if (
    lower.includes("not cooling") ||
    lower.includes("not working") ||
    lower.includes("broken") ||
    lower.includes("won't turn") ||
    lower.includes("emergency") ||
    lower.includes("urgent")
  ) {
    return "That sounds stressful — I'm sorry you're dealing with this. If your AC is completely out, I want to get William to your home as fast as possible. Can you tell me your address and what you're seeing — is the outdoor unit running at all, or is it completely dead? Let me get someone on this right now.";
  }

  // ─── FINALLY / THANK YOU ───
  if (
    lower.includes("thank") ||
    lower.includes("thanks") ||
    lower.includes("appreciate") ||
    lower.includes("perfect") ||
    lower.includes("great")
  ) {
    return context.firstName
      ? `You're welcome, ${context.firstName}. That's what I'm here for. Reach out anytime — I don't sleep, so I'm always available. Happy to help whenever you need anything.`
      : `You're welcome. That's what I'm here for. Reach out anytime you have questions — I don't sleep, so I'm always available.`;
  }

  // ─── DEFAULT — NO MATCH ───
  return `That's a good question. Let me make sure I understand — what specifically are you trying to figure out? Whether to repair or replace? What it should cost? How to finance it? Tell me more and I'll give you a straight answer.`;
}

// ──────────────────────────────────────────────────────────────
// TIER PROFILE BUILDER
// ──────────────────────────────────────────────────────────────

export function buildTierProfile(context: QuizContext): {
  title: string;
  subtitle: string;
  color: "teal" | "amber" | "red";
  headline: string;
  body: string;
  powerTaxText?: string;
} {
  const { tier } = calculateReadinessScore(
    context.comfortScore ?? 3,
    context.billStatus ?? "low",
    context.systemAge ?? "<8",
    context.emergencyCount ?? 0,
    context.budgetStress ?? "low"
  );

  const tierData = TIER_MESSAGES[tier];

  if (tier === "hot") {
    return {
      title: "System Needs Attention",
      subtitle: "Time to make a decision — on your terms",
      color: "red",
      headline: "Your home is telling us something urgent.",
      body: tierData.opening(context.firstName),
      powerTaxText:
        context.powerTaxAnnual && context.powerTaxAnnual > 0
          ? `Your Power Tax is $${context.powerTaxAnnual}/year. That money is leaving your home every year.`
          : undefined,
    };
  }
  if (tier === "warm") {
    return {
      title: "Room to Improve",
      subtitle: "The smart play is planning now, not later",
      color: "amber",
      headline: "You're not in crisis — but you're paying for it.",
      body: tierData.opening(context.firstName),
      powerTaxText:
        context.powerTaxAnnual && context.powerTaxAnnual > 0
          ? `Your Power Tax is $${context.powerTaxAnnual}/year in lost energy. A new system would bring most of that back.`
          : undefined,
    };
  }
  if (tier === "cool") {
    return {
      title: "Doing Fine — But Here's How to Do Better",
      subtitle: "You've got time. Use it wisely.",
      color: "teal",
      headline: "Your home is in decent shape — but there's a gap.",
      body: tierData.opening(context.firstName),
      powerTaxText:
        context.powerTaxAnnual && context.powerTaxAnnual > 0
          ? `Your Power Tax is $${context.powerTaxAnnual}/year. Even small improvements can move that number.`
          : undefined,
    };
  }
  return {
    title: "Home Sweet Home",
    subtitle: "You're in good shape — keep it that way",
    color: "teal",
    headline: "No red flags. That's a good place to be.",
    body: tierData.opening(context.firstName),
  };
}
