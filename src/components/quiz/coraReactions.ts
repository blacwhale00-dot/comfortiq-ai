// Real-time reactions from Cora based on quiz answers.
// Distinct from the in-flow "mirror" responses — these are short, conversational
// nudges that appear in the floating Cora bubble.

export function getCoraReaction(
  questionId: string,
  value: string | number,
): string {
  const v = String(value);

  switch (questionId) {
    case "temperature": {
      const n = Number(v);
      if (n >= 4) return "Constant temperature swings usually mean ductwork or sizing issues. Worth investigating.";
      if (n >= 3) return "Some inconsistency is common — but if it's daily, that's a signal.";
      return "Steady comfort is a great baseline. Let's keep going.";
    }
    case "bills":
      if (v === "high") return "That sounds high for an Atlanta home. Let's see if your system is silently working overtime.";
      if (v === "med") return "A noticeable bump can mean rate hikes — or efficiency loss. We'll find out which.";
      return "Steady bills are a good sign your system isn't bleeding energy.";
    case "system_age":
      if (v === ">15") return "15+ years is the danger zone. I'll cross-check public permit records to see when it was last serviced.";
      if (v === "12-15") return "You're in the replacement-conversation window. Most systems start failing here.";
      if (v === "8-12") return "Mid-life — performance can slip without warning. Permit history will tell us more.";
      return "You've got a young system. That's a strong starting point.";
    case "emergencies":
      if (v === "true") return "Emergency calls are a pattern, not bad luck. Let's get ahead of the next one.";
      return "No breakdowns yet — but we'll check if you're due for one.";
    case "confusion": {
      const n = Number(v);
      if (n >= 4) return "You're not alone here. Most homeowners feel this exact way — clarity is what we're building.";
      return "Good — having a clear head about this is half the battle.";
    }
    case "health":
      if (v === "true") return "Air quality is often overlooked but hugely impactful. I'll factor this into your brief.";
      return "One less thing to worry about. Moving on.";
    case "trust": {
      const n = Number(v);
      if (n >= 4) return "The HVAC industry has a trust problem. That's exactly why ComfortIQ exists — full transparency.";
      return "Glad you've had decent experiences. Let's keep that streak going.";
    }
    case "moisture": {
      const n = Number(v);
      if (n >= 4) return "Persistent moisture is serious — it impacts air, health, and your home's structure.";
      if (n >= 3) return "Occasional mustiness can signal humidity creep. Worth watching.";
      return "Good — moisture control is a healthy-home win.";
    }
    case "financial":
      if (v === "high") return "I hear you. The $900 credit + smart financing changes the math more than people expect.";
      if (v === "med") return "There are financing paths designed for exactly this — we'll show them clearly.";
      return "Being prepared makes the rest of this much smoother.";
    case "confidence": {
      const n = Number(v);
      if (n >= 4) return "Almost done. Your personalized brief will give you the clarity you need.";
      return "You've done your homework. Let's package up your readiness profile.";
    }
    case "residents": {
      const n = Number(v);
      if (n >= 5) return "A larger household means more comfort variability — sizing matters even more for you.";
      if (n >= 3) return "A typical-sized home. Sizing the system right is critical for your comfort.";
      return "A smaller household gives us more sizing flexibility — good for efficiency.";
    }
    default:
      return "";
  }
}
