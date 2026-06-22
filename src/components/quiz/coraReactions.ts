// Short, conversational nudges shown in the floating Cora bubble
// as the user answers each of the 12 questions. Value codes match
// conciergeConfig.ts.

export function getCoraReaction(
  questionId: string,
  value: string | number,
): string {
  const v = String(value);

  switch (questionId) {
    case "system_age":
      if (v === "20+") return "20+ years is rare — that alone explains a lot.";
      if (v === "15-19") return "15+ years is the danger zone. I'll pull your permit history.";
      if (v === "10-14") return "You're in the replacement-conversation window.";
      if (v === "6-9") return "Mid-life — performance can quietly slip here.";
      if (v === "0-5") return "Young system. Strong starting point.";
      return "We'll cross-check the County record to nail the age down.";

    case "bills":
      if (v === "dramatic") return "Dramatic spikes almost always trace back to declining efficiency.";
      if (v === "noticeable") return "Noticeable creep usually means the system is working harder for less.";
      if (v === "slight") return "Small bumps add up over a Georgia summer.";
      if (v === "consistent") return "Steady bills are a great efficiency signal.";
      return "No problem — we'll estimate it from your home's profile.";

    case "repairs":
      if (v === "6+") return "6+ repairs in 2 years is past the nursing-it-along line.";
      if (v === "4-5") return "That's a clear pattern, not bad luck.";
      if (v === "2-3") return "This is where the math usually shifts toward replacement.";
      if (v === "1") return "Normal wear and tear.";
      return "Reliability is a great sign.";

    case "repair_cost":
      if (v === "3000+") return "$3,000+ is past break-even for most replacements.";
      if (v === "1500-3000") return "Serious money sunk into a dying asset.";
      if (v === "500-1500") return "That'd be a real down payment on a real fix.";
      if (v === "<500") return "Manageable — but worth tracking.";
      return "Zero repair spend is a strong reliability signal.";

    case "comfort_rooms":
      if (v === "whole") return "Whole-house struggle means the equipment is mismatched to the home.";
      if (v === "most") return "When most rooms are off, it's a system-level problem.";
      if (v === "2-3") return "Two or three rooms usually points to ductwork or sizing.";
      if (v === "1") return "Often a balancing issue, not the whole system.";
      return "Even comfort is rare — great baseline.";

    case "humidity":
      if (v === "major") return "Persistent humidity hits comfort, health, and your home itself.";
      if (v === "sticky") return "Sticky = cooling without dehumidifying. A sizing or age signal.";
      if (v === "slight") return "Intermittent stickiness is usually an oversizing tell.";
      return "Humidity control is huge — you've got that going for you.";

    case "noises":
      if (v === "severe") return "That needs attention — not someday, now.";
      if (v === "regular") return "Regular noises are early warnings.";
      if (v === "occasional") return "Occasional sounds are usually fine.";
      return "Quiet operation is a strong health sign.";

    case "short_cycling":
      if (v === "constant") return "Constant cycling burns through components fast. Big red flag.";
      if (v === "frequent") return "Frequent cycling is one of the most expensive problems to ignore.";
      if (v === "sometimes") return "Occasional cycling is okay — constant is the issue.";
      if (v === "unknown") return "We'll listen for it during the visual audit.";
      return "Long cycles are exactly what you want.";

    case "filter_freq":
      if (v === "unknown") return "Easy fix — and it changes everything.";
      if (v === "rarely") return "Filters are the #1 preventable cause of early system death.";
      if (v === "yearly") return "Yearly is too long — a clogged filter chokes everything.";
      if (v === "4-6mo") return "Solid cadence for most homes.";
      return "You're doing the single most important thing right.";

    case "tune_up":
      if (v === "never") return "No tune-ups is a huge hidden efficiency drain.";
      if (v === "3+_years") return "3+ years usually means hidden wear is adding up.";
      if (v === "1-2_years") return "Due, but not critical.";
      if (v === "this_year") return "Ahead of most homeowners. Nice.";
      return "We'll check what the permit record says.";

    case "seer_rating":
      if (v === "<10") return "Under 10 SEER is the classic 'Power Tax' situation.";
      if (v === "10-13") return "You're paying 20–30% more every month than you need to.";
      if (v === "14-17") return "Decent — still meaningful room to upgrade.";
      if (v === "18+") return "Already energy-aware. Strong.";
      return "We'll estimate it from the serial number.";

    case "intent":
      if (v === "yes") return "Got it — we'll fast-track your plan and credit eligibility.";
      if (v === "maybe") return "Knowing your number now gives you leverage later.";
      if (v === "only_if_breaks") return "Run-it-till-it-dies always dies at the worst time. Let's price it now.";
      if (v === "no") return "Curiosity is a great reason to be here.";
      return "That's exactly what this is for. Let's get you clarity.";

    default:
      return "";
  }
}
