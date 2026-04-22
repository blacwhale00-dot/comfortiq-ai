import type { GuzzlerResultsData } from "@/components/quiz/GuzzlerResults";

interface ScoreInputs {
  // Pain answers
  bills?: string | number; // "low" | "med" | "high"
  systemAgeBand?: string | number; // "<8" | "8-12" | "12-15" | ">15"
  emergencies?: string | number; // "true" | "false"
  temperature?: string | number; // 1-5

  // Property intelligence
  yearBuilt: number | null;
  silenceYears: number | null;
  lastPermitDate: string | null;
  yearBuiltSource: "County" | "Homeowner" | "Unknown";
}

function billsScore(v: ScoreInputs["bills"]): number {
  if (v === "high") return 30;
  if (v === "med") return 18;
  if (v === "low") return 5;
  return 10;
}

function homeAgeScore(yearBuilt: number | null): number {
  if (!yearBuilt) return 10;
  const age = new Date().getFullYear() - yearBuilt;
  if (age >= 40) return 25;
  if (age >= 25) return 18;
  if (age >= 15) return 12;
  return 5;
}

function silenceScore(years: number | null): number {
  if (years === null) return 15; // unknown ≈ assume gap
  if (years > 20) return 30;
  if (years > 12) return 25;
  if (years > 8) return 15;
  if (years > 4) return 8;
  return 2;
}

function systemAgeScore(band: ScoreInputs["systemAgeBand"]): number {
  switch (String(band)) {
    case ">15": return 15;
    case "12-15": return 12;
    case "8-12": return 7;
    case "<8": return 2;
    default: return 6;
  }
}

export function calculateGuzzlerScore(inputs: ScoreInputs): GuzzlerResultsData {
  const bills = billsScore(inputs.bills);
  const home = homeAgeScore(inputs.yearBuilt);
  const silence = silenceScore(inputs.silenceYears);
  const sysAge = systemAgeScore(inputs.systemAgeBand);

  let score = bills + home + silence + sysAge;

  // Severity floor: extended permit silence forces Severe tier
  if ((inputs.silenceYears ?? 0) > 12) {
    score = Math.max(score, 80);
  }

  score = Math.min(100, Math.max(0, Math.round(score)));

  let tier: GuzzlerResultsData["tier"];
  if (score >= 80) tier = "Severe";
  else if (score >= 60) tier = "High";
  else if (score >= 35) tier = "Moderate";
  else tier = "Mild";

  return {
    score,
    tier,
    yearBuilt: inputs.yearBuilt,
    yearBuiltSource: inputs.yearBuiltSource,
    silenceYears: inputs.silenceYears,
    lastPermitDate: inputs.lastPermitDate,
  };
}
