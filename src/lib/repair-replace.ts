// Repair-vs-Replace calculator — the trust engine from the July 23 handoff.
// Pure functions, zero Supabase imports: every number Cora speaks traces to a
// computation here, never to LLM generation. Config comes from the
// repair_calc_config table at runtime with these defaults as fallback (kept in
// sync with the migration seed); rebates come from rebate_programs rows.
//
// GUARDRAIL (spec §4): this engine must genuinely recommend REPAIR when the
// math favors it. The ladder below is ordered exactly as specced — the
// keep-it branch is real and unit-tested.

export type SystemType =
  | "gas_furnace_ac"
  | "heat_pump"
  | "electric_resistance"
  | "straight_cool"
  | "unknown";

export type GuzzlerBand = "sipping" | "steady" | "drinking" | "bleeding";
export type Recommendation = "repair" | "replace" | "monitor" | "needs_inspection";
export type Confidence = "high" | "moderate" | "low";
export type IncomeTier = "<=80_ami" | "80_150_ami" | "none";

export interface CalcConfig {
  thresholds: {
    fifty_pct_rule: number;
    thirty_pct_rule: number;
    old_age_years: number;
    very_old_age_years: number;
    young_age_years: number;
  };
  replacement_cost_bands: Record<SystemType, { low: number; high: number }>;
  financing: { apr: number; term_months: number };
  projection: {
    deferral_multiplier_old: number;
    annual_repair_base_usd: { lt8: number; "8to12": number; gte12: number };
    waste_recovery_pct: number;
  };
  regret_weights: {
    version: string;
    financed: number;
    cost_gte_1200: number;
    still_having_issues: number;
    two_plus_repairs: number;
    age_gte_12: number;
    band_drinking_bleeding: number;
  };
}

// Fallback mirror of the repair_calc_config seed — used only when the config
// table is unreachable. Update BOTH places if a default changes.
export const DEFAULT_CONFIG: CalcConfig = {
  thresholds: {
    fifty_pct_rule: 0.5,
    thirty_pct_rule: 0.3,
    old_age_years: 10,
    very_old_age_years: 12,
    young_age_years: 8,
  },
  replacement_cost_bands: {
    gas_furnace_ac: { low: 9000, high: 16000 },
    heat_pump: { low: 9500, high: 16000 },
    electric_resistance: { low: 9000, high: 15000 },
    straight_cool: { low: 7500, high: 13000 },
    unknown: { low: 9000, high: 16000 },
  },
  financing: { apr: 0.0899, term_months: 120 },
  projection: {
    deferral_multiplier_old: 1.5,
    annual_repair_base_usd: { lt8: 150, "8to12": 350, gte12: 650 },
    waste_recovery_pct: 0.75,
  },
  regret_weights: {
    version: "v1",
    financed: 25,
    cost_gte_1200: 20,
    still_having_issues: 20,
    two_plus_repairs: 15,
    age_gte_12: 10,
    band_drinking_bleeding: 10,
  },
};

// ---------- Rebate resolution ----------

export interface RebateProgramRow {
  program_name: string;
  state: string;
  utility_or_emc: string | null;
  max_amount_usd: number | null;
  income_qualified: boolean;
  income_tier: string | null;
  fuel_switching_allowed: boolean | null;
  fuel_switching_ends_on: string | null; // ISO date
  status: string;
}

export interface ResolvedRebate {
  name: string;
  amountUsd: number;
  /** false = income-dependent and the homeowner hasn't answered the income
   * question — present as "you may qualify for up to $X". */
  certain: boolean;
}

export interface RebateResolution {
  applied: ResolvedRebate[];
  totalCertainUsd: number;
  totalPossibleUsd: number; // certain + uncertain
}

export function resolveRebates(
  programs: RebateProgramRow[],
  opts: {
    state: string;
    utility?: string | null;
    incomeTier?: IncomeTier | null; // null/undefined = homeowner not asked / declined
    fuelSwitchNeeded: boolean;
    onDate: Date;
  },
): RebateResolution {
  const applied: ResolvedRebate[] = [];
  for (const p of programs) {
    if (p.status !== "active") continue;
    if (p.state !== opts.state) continue;
    if (p.utility_or_emc && opts.utility && p.utility_or_emc !== opts.utility) continue;
    if (p.utility_or_emc && !opts.utility) continue; // utility-specific but utility unknown
    if (!p.max_amount_usd) continue; // placeholder row, amount unconfirmed

    // Fuel-switching cutoff (HEAR): if this application IS a fuel switch and
    // the program's fuel-switching pathway has ended, the rebate is gone.
    if (opts.fuelSwitchNeeded) {
      if (p.fuel_switching_allowed === false) continue;
      if (
        p.fuel_switching_ends_on &&
        opts.onDate > new Date(p.fuel_switching_ends_on + "T10:00:00-04:00")
      )
        continue;
    }

    if (p.income_qualified) {
      if (opts.incomeTier === "none") continue; // answered: not income-qualified
      const certain = opts.incomeTier === "<=80_ami" || opts.incomeTier === "80_150_ami";
      applied.push({ name: p.program_name, amountUsd: p.max_amount_usd, certain });
    } else {
      applied.push({ name: p.program_name, amountUsd: p.max_amount_usd, certain: true });
    }
  }
  const totalCertainUsd = applied.filter((r) => r.certain).reduce((s, r) => s + r.amountUsd, 0);
  const totalPossibleUsd = applied.reduce((s, r) => s + r.amountUsd, 0);
  return { applied, totalCertainUsd, totalPossibleUsd };
}

// ---------- The calculator ----------

export interface CalcInputs {
  systemAgeYears: number | null;
  systemType: SystemType;
  guzzlerBand: GuzzlerBand | null;
  monthlyEnergyWasteUsd: number | null;
  cumulativeRepairCost24mo: number;
  repairCount24mo: number;
  activeRepairPaymentUsd: number | null;
  remainingRepairPaymentMonths?: number | null;
  stillHavingIssues?: boolean | null;
  safetyIssueReported?: boolean;
}

export interface CalcOutputs {
  estReplacementCostUsd: number;
  estReplacementMonthlyUsd: number;
  repairCostPctOfReplacement: number;
  fiveYearKeepCostUsd: number;
  fiveYearReplaceCostUsd: number;
  recommendation: Recommendation;
  confidence: Confidence;
  reasoningSummary: string;
  /** Data gaps that lowered confidence — surfaced honestly to the homeowner. */
  missingData: string[];
}

export function monthlyPayment(principal: number, apr: number, termMonths: number): number {
  if (principal <= 0) return 0;
  if (apr === 0) return principal / termMonths;
  const r = apr / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

function ageBracketBase(age: number, cfg: CalcConfig): number {
  const base = cfg.projection.annual_repair_base_usd;
  if (age < 8) return base.lt8;
  if (age < 12) return base["8to12"];
  return base.gte12;
}

export function computeRepairReplace(
  inputs: CalcInputs,
  config: CalcConfig = DEFAULT_CONFIG,
  rebates: RebateResolution = { applied: [], totalCertainUsd: 0, totalPossibleUsd: 0 },
): CalcOutputs {
  const t = config.thresholds;
  const missingData: string[] = [];
  if (inputs.systemAgeYears == null) missingData.push("system age");
  if (inputs.monthlyEnergyWasteUsd == null) missingData.push("utility bill analysis");
  if (inputs.guzzlerBand == null) missingData.push("guzzler band");

  const age = inputs.systemAgeYears ?? 0;
  const waste = inputs.monthlyEnergyWasteUsd ?? 0;
  const band = inputs.guzzlerBand;

  // Replacement estimate: band midpoint. Never a quote.
  const bandCfg =
    config.replacement_cost_bands[inputs.systemType] ?? config.replacement_cost_bands.unknown;
  const estReplacementCostUsd = (bandCfg.low + bandCfg.high) / 2;

  // Net of certain rebates only — uncertain ones are shown as "may qualify".
  const netReplacement = Math.max(estReplacementCostUsd - rebates.totalCertainUsd, 0);
  const estReplacementMonthlyUsd = monthlyPayment(
    netReplacement,
    config.financing.apr,
    config.financing.term_months,
  );

  const repairCostPctOfReplacement =
    estReplacementCostUsd > 0 ? inputs.cumulativeRepairCost24mo / estReplacementCostUsd : 0;

  // 5-year KEEP: projected repairs (age-based, deferral-escalated for old
  // systems) + energy waste + remaining repair financing.
  const deferralMult = age >= t.very_old_age_years ? config.projection.deferral_multiplier_old : 1;
  const projectedRepairs = ageBracketBase(age, config) * 5 * deferralMult;
  const remainingFinancing =
    (inputs.activeRepairPaymentUsd ?? 0) * Math.min(inputs.remainingRepairPaymentMonths ?? 0, 60);
  const fiveYearKeepCostUsd = projectedRepairs + waste * 60 + remainingFinancing;

  // 5-year REPLACE: financed payments over 60 months, minus recovered waste.
  const wasteRecovered = waste * 60 * config.projection.waste_recovery_pct;
  const fiveYearReplaceCostUsd = estReplacementMonthlyUsd * 60 - wasteRecovered;

  // ---------- Recommendation ladder (spec order — do not reorder) ----------
  let recommendation: Recommendation;
  let confidence: Confidence;
  let reasoning: string;

  const pct = repairCostPctOfReplacement;
  const hotBand = band === "drinking" || band === "bleeding";
  const coolBand = band === "sipping" || band === "steady";
  const hadRepair = inputs.cumulativeRepairCost24mo > 0;

  if (inputs.safetyIssueReported) {
    recommendation = "replace";
    confidence = "high";
    reasoning =
      "A safety issue like a cracked heat exchanger isn't a repair conversation — it needs to come out. Get eyes on it right away.";
  } else if (pct >= t.fifty_pct_rule && age >= t.old_age_years) {
    recommendation = "replace";
    confidence = "high";
    reasoning = `You've put ${fmtUsd(inputs.cumulativeRepairCost24mo)} into a ${fmtAge(age)} system — that's ${Math.round(pct * 100)}% of what a new one runs. That's the fifty-percent-rule moment: the math has flipped to replacement.`;
  } else if (
    pct >= t.thirty_pct_rule &&
    (age >= t.very_old_age_years || hotBand || inputs.repairCount24mo >= 2)
  ) {
    recommendation = "replace";
    confidence = "moderate";
    reasoning = `Repairs at ${Math.round(pct * 100)}% of replacement cost on ${age >= t.very_old_age_years ? `a ${fmtAge(age)} system` : hotBand ? `a system in the ${band} zone` : "a system that keeps needing visits"} — the trend line points toward replacement being the cheaper path from here.`;
  } else if (age < t.young_age_years && pct < t.thirty_pct_rule && coolBand) {
    recommendation = hadRepair ? "repair" : "monitor";
    confidence = "high";
    reasoning = hadRepair
      ? `Honest answer: keep it. A ${fmtAge(age)} system in the ${band} zone with ${fmtUsd(inputs.cumulativeRepairCost24mo)} of repairs is a system worth fixing — that repair was the right call. Re-check your score in a year.`
      : `Honest answer: leave it alone. A ${fmtAge(age)} system running in the ${band} zone doesn't need anything from anyone right now.`;
  } else {
    recommendation = inputs.stillHavingIssues ? "needs_inspection" : "monitor";
    confidence = missingData.length > 0 ? "low" : "moderate";
    reasoning = inputs.stillHavingIssues
      ? "The numbers alone don't settle it, and something's still not right — this is worth a real set of eyes. No pressure, just clarity."
      : "The math doesn't force a move either way right now. Keep an eye on the bills, and re-run your score if anything changes.";
  }

  return {
    estReplacementCostUsd,
    estReplacementMonthlyUsd: round2(estReplacementMonthlyUsd),
    repairCostPctOfReplacement: round2(pct),
    fiveYearKeepCostUsd: round2(fiveYearKeepCostUsd),
    fiveYearReplaceCostUsd: round2(fiveYearReplaceCostUsd),
    recommendation,
    confidence,
    reasoningSummary: reasoning,
    missingData,
  };
}

// ---------- Repair regret score (segmentation / Lead Avatar) ----------

export interface RegretInputs {
  wasFinanced: boolean | null;
  repairCostUsd: number | null;
  stillHavingIssues: boolean | null;
  repairCount24mo: number | null;
  systemAgeYears: number | null;
  guzzlerBand: GuzzlerBand | null;
}

export function computeRegretScore(
  r: RegretInputs,
  weights = DEFAULT_CONFIG.regret_weights,
): { score: number; version: string } {
  let score = 0;
  if (r.wasFinanced) score += weights.financed;
  if ((r.repairCostUsd ?? 0) >= 1200) score += weights.cost_gte_1200;
  if (r.stillHavingIssues) score += weights.still_having_issues;
  if ((r.repairCount24mo ?? 0) >= 2) score += weights.two_plus_repairs;
  if ((r.systemAgeYears ?? 0) >= 12) score += weights.age_gte_12;
  if (r.guzzlerBand === "drinking" || r.guzzlerBand === "bleeding")
    score += weights.band_drinking_bleeding;
  return { score: Math.min(score, 100), version: weights.version };
}

// ---------- helpers ----------

export function fmtUsd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}
function fmtAge(age: number): string {
  return `${Math.round(age)}-year-old`;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Fuel switching = moving OFF fossil fuel onto a heat pump. */
export function isFuelSwitch(currentSystem: SystemType): boolean {
  return currentSystem === "gas_furnace_ac";
}
