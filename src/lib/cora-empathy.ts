// Cora's Evidence-Based Empathy generator.
// Produces a homeowner-facing message grounded in verified property intelligence.

export interface CoraInputs {
  countyYearBuilt?: number | null;
  permitLastHvacDate?: string | null; // ISO date string
  permitSilenceYears?: number | null;
  countyVerifiedSqft?: number | null;
  homeownerReportedSqft?: string | null;
  confidenceTier?: "High" | "Medium" | "Low" | string | null;
}

const formatDate = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export function buildCoraMessage(inputs: CoraInputs): string {
  const {
    countyYearBuilt,
    permitLastHvacDate,
    permitSilenceYears,
    countyVerifiedSqft,
    homeownerReportedSqft,
  } = inputs;

  const parts: string[] = [];

  // Lead with property age
  if (countyYearBuilt) {
    parts.push(`I noticed your home was built in ${countyYearBuilt}`);
  } else {
    parts.push(`Looking at your property records`);
  }

  // Permit silence framing
  const lastPermit = formatDate(permitLastHvacDate);
  if (lastPermit) {
    parts.push(
      `and there hasn't been a permit for a system update since ${lastPermit}`,
    );
  } else if (permitSilenceYears && permitSilenceYears > 0) {
    parts.push(
      `and there hasn't been a permitted HVAC update in over ${permitSilenceYears} years`,
    );
  } else {
    parts.push(`and I couldn't find a recent HVAC permit on file`);
  }

  let intro = parts.join(" ") + ".";

  // Square footage discrepancy nudge
  const reportedNum = homeownerReportedSqft ? parseInt(homeownerReportedSqft, 10) : NaN;
  let sqftNote = "";
  if (countyVerifiedSqft && !Number.isNaN(reportedNum)) {
    const diff = Math.abs(countyVerifiedSqft - reportedNum);
    if (diff / countyVerifiedSqft > 0.1) {
      sqftNote = ` County records actually show ${Math.round(countyVerifiedSqft).toLocaleString()} sq ft — a bit different from the ${reportedNum.toLocaleString()} you mentioned, which can change how a system is sized.`;
    }
  }

  // Urgency tail based on silence years
  let urgency = " Usually, that points to some hidden energy waste — let's look at your bills to confirm.";
  if (permitSilenceYears != null) {
    if (permitSilenceYears >= 12) {
      urgency = " A system that old is almost always costing you money silently — let's look at your bills together and confirm where the waste is.";
    } else if (permitSilenceYears >= 7) {
      urgency = " Equipment in that range often starts losing efficiency — let's pull your bills and see if the numbers back that up.";
    }
  }

  return intro + sqftNote + urgency;
}
