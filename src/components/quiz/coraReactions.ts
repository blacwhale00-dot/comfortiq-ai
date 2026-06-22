// Short, conversational nudges shown in the floating Cora bubble
// as the user answers each of the 12 questions.

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
      if (v === "5-9") return "Mid-life — performance can quietly slip here.";
      if (v === "<5") return "Young system. Strong starting point.";
      return "We'll cross-check the County record to nail the age down.";

    case "bills":
      if (v === "400+") return "That sounds a bit high for a house of your size — let's see if we can find out why.";
      if (v === "250-400") return "On the high side. Your system is likely working overtime.";
      if (v === "150-250") return "Normal range — but there's usually still savings hiding.";
      if (v === "<150") return "Efficient baseline. Nice.";
      return "No problem — we'll estimate it from your home's profile.";

    case "repairs":
      if (v === "6+") return "6+ repairs in 2 years is past the nursing-it-along line.";
      if (v === "4-5") return "That's a clear pattern, not bad luck.";
      if (v === "2-3") return "This is where the math usually shifts toward replacement.";
      if (v === "1") return "Normal wear and tear.";
      return "Reliability is a great sign.";

    case "repair_cost":
      if (v === "2500+") return "$2,500+ in repairs is usually past break-even.";
      if (v === "1000-2500") return "Serious money. Let's see if it's still the right move.";
      if (v === "500-1000") return "That'd be a real down payment on a real fix.";
      if (v === "200-500") return "Manageable — but worth tracking.";
      return "Minor money so far.";

    case "comfort_rooms":
      if (v === "4+") return "When most of the house is off, the system itself is the bottleneck.";
      if (v === "3") return "Three rooms means the system isn't keeping up.";
      if (v === "2") return "Two off rooms usually points to ductwork or sizing.";
      if (v === "1") return "Often a balancing issue, not the whole system.";
      return "Even comfort is rare — great baseline.";

    case "humidity":
      if (v === "very_humid") return "Persistent humidity hits comfort, health, and your home itself.";
      if (v === "muggy") return "Muggy = cooling without dehumidifying. A sizing or age signal.";
      if (v === "dry") return "Dry air is a comfort drag — fixable with the right setup.";
      if (v === "comfortable") return "Humidity control is huge — you've got that going for you.";
      return "Easy to miss. We'll factor it in.";

    case "noises":
      if (v === "constant" || v === "loud_burning") return "That needs attention — not someday, now.";
      if (v === "frequent") return "Frequent noises are early warnings.";
      if (v === "minor") return "Minor sounds are usually fine.";
      return "Quiet operation is a strong health sign.";

    case "short_cycling":
      if (v === "yes") return "Short cycling burns through components fast. Big red flag.";
      if (v === "sometimes") return "Occasional cycling is okay — constant is the issue.";
      if (v === "unknown") return "We'll listen for it during the visual audit.";
      return "Long cycles are exactly what you want.";

    case "filter_freq":
      if (v === "never" || v === "rarely") return "Filters are the #1 preventable cause of early system death.";
      if (v === "yearly") return "Yearly is too long — a clogged filter chokes everything.";
      if (v === "quarterly") return "Solid cadence for most homes.";
      return "You're doing the single most important thing right.";

    case "tune_up":
      if (v === "never") return "No tune-ups is a huge hidden efficiency drain.";
      if (v === "3+_years") return "3+ years usually means hidden wear is adding up.";
      if (v === "1-2_years") return "Due, but not critical.";
      if (v === "this_year") return "Ahead of most homeowners. Nice.";
      return "We'll check what the permit record says.";

    case "seer_rating":
      if (v === "<10") return "Under 10 SEER is the classic 'Power Tax' situation.";
      if (v === "10-12") return "You're paying 20–30% more every month than you need to.";
      if (v === "13-15") return "Decent — still meaningful room to upgrade.";
      if (v === "16+") return "Already energy-aware. Strong.";
      return "We'll estimate it from the serial number.";

    case "intent":
      if (v === "yes") return "Got it — we'll fast-track your plan and credit eligibility.";
      if (v === "maybe") return "Knowing your number now gives you leverage later.";
      if (v === "no") return "All good — a future-planning brief is useful too.";
      return "That's exactly what this is for. Let's get you clarity.";

    default:
      return "";
  }
}
