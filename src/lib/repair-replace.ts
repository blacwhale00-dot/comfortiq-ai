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
  conversion_adders: {
    plenum_usd: { low: number; high: number };
    air_handler_incremental_usd: { low: number; high: number };
    panel_possible_usd: { low: number; high: number };
    marginal_net_rebate_threshold_usd: number;
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
  // Addendum 1 §3 — PLACEHOLDERS pending Will's Atlanta market review.
  conversion_adders: {
    plenum_usd: { low: 1200, high: 2500 },
    air_handler_incremental_usd: { low: 800, high: 1800 },
    panel_possible_usd: { low: 0, high: 3000 },
    marginal_net_rebate_threshold_usd: 1000,
  },
};

// ---------- Rebate resolution ----------

export interface RebateScopeRequirements {
  full_conversion_required?: boolean;
  eligibility_rule_verified?: boolean;
  /** Income-tier coverage multipliers, e.g. {"<=80_ami": 1.0, "80_150_ami": 0.5}. */
  tier_coverage?: Record<string, number>;
}

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
  scope_requirements?: RebateScopeRequirements | null;
  friction_level?: string | null;
  display_mode?: string | null; // 'headline' | 'conditional' | 'hidden'
}

export interface ResolvedRebate {
  name: string;
  amountUsd: number;
  /** false = income-dependent and the homeowner hasn't answered the income
   * question — present as "you may qualify for up to $X". */
  certain: boolean;
  /** 'unverified' = the program's eligibility rule is disputed/unconfirmed —
   * Cora must hedge, never promise dollars (Addendum 1 §2). */
  confidence: "verified" | "unverified";
  /** Qualifying requires a complete conversion (HP + air handler) — the
   * Replace-side math must carry conversion adders (Addendum 1 §3). */
  fullConversionRequired: boolean;
  displayMode: "headline" | "conditional" | "hidden";
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

    if (p.display_mode === "hidden") continue;

    const scope = p.scope_requirements ?? {};
    const base = {
      confidence: (scope.eligibility_rule_verified === false ? "unverified" : "verified") as
        | "verified"
        | "unverified",
      fullConversionRequired: scope.full_conversion_required === true,
      displayMode: (p.display_mode ?? "conditional") as "headline" | "conditional" | "hidden",
    };

    if (p.income_qualified) {
      if (opts.incomeTier === "none") continue; // answered: not income-qualified
      const known = opts.incomeTier === "<=80_ami" || opts.incomeTier === "80_150_ami";
      // Tier-correct ceiling: 80-150% AMI covers ~50%, not the full cap.
      const coverage = known ? scope.tier_coverage?.[opts.incomeTier!] ?? 1 : 1;
      applied.push({
        name: p.program_name,
        amountUsd: p.max_amount_usd * coverage,
        certain: known,
        ...base,
      });
    } else {
      applied.push({ name: p.program_name, amountUsd: p.max_amount_usd, certain: true, ...base });
    }
  }
  const totalCertainUsd = applied.filter((r) => r.certain).reduce((s, r) => s + r.amountUsd, 0);
  const totalPossibleUsd = applied.reduce((s, r) => s + r.amountUsd, 0);
  return { applied, totalCertainUsd, totalPossibleUsd };
}

// ---------- Rebate partition: realism pass (Addendum 1 §3) ----------
// A rebate that requires a full conversion is not free money on a gas home —
// it arrives with plenum + air-handler adders. Partition every resolved rebate
// into: headline (clean money), conversion-path (in the math for gas homes when
// net-positive, presented as the optional electrification route, never
// headlined), or footnote (excluded from the math entirely).

export interface RebatePartition {
  headline: ResolvedRebate[];
  conversionPath: ResolvedRebate[];
  footnote: { rebate: ResolvedRebate; reason: string }[];
  /** Adders applied to the Replace side when a conversion rebate is in play. */
  conversionAdderUsd: number;
  /** rebate − adder midpoint for the conversion route (null = no conversion rebate). */
  netConversionEffectUsd: number | null;
}

const GAS_BASED: SystemType[] = ["gas_furnace_ac"];
const ELECTRIC_TO_ELECTRIC: SystemType[] = ["heat_pump", "electric_resistance"];

export function partitionRebates(
  resolution: RebateResolution,
  systemType: SystemType,
  config: CalcConfig = DEFAULT_CONFIG,
): RebatePartition {
  const adders = config.conversion_adders;
  const mid = (r: { low: number; high: number }) => (r.low + r.high) / 2;
  // Panel work is "possible, site-dependent" — excluded from the midpoint,
  // surfaced in language only.
  const adderMid = mid(adders.plenum_usd) + mid(adders.air_handler_incremental_usd);

  const out: RebatePartition = {
    headline: [],
    conversionPath: [],
    footnote: [],
    conversionAdderUsd: 0,
    netConversionEffectUsd: null,
  };

  for (const r of resolution.applied) {
    if (!r.fullConversionRequired) {
      out.headline.push(r);
      continue;
    }
    // Full-conversion rebate:
    if (ELECTRIC_TO_ELECTRIC.includes(systemType)) {
      // Already electric — applies cleanly, no adders. The rebate-advantaged segment.
      out.headline.push(r);
    } else if (GAS_BASED.includes(systemType)) {
      const net = r.amountUsd - adderMid;
      out.netConversionEffectUsd = net;
      if (net < adders.marginal_net_rebate_threshold_usd) {
        out.footnote.push({ rebate: r, reason: "marginal_conversion_economics" });
      } else {
        // In the math (with adders), but presented as the electrification
        // path — never a headline dollar to a gas home (Addendum 1 §4.1).
        out.conversionPath.push(r);
        out.conversionAdderUsd = adderMid;
      }
    } else {
      // unknown / straight_cool: can't assess the conversion honestly yet.
      out.footnote.push({ rebate: r, reason: "system_type_unknown" });
    }
  }
  return out;
}

/** Electric-to-electric homes with aging equipment are the highest-rebate-
 * leverage segment post-8/10 (Addendum 1 §6). Implemented as a separate lead
 * flag (not a regret-weight change) so segmentation stays orthogonal to
 * regret; stored on the lead file via funnel_events metadata. */
export function computeRebateLeverage(systemType: SystemType, ageYears: number | null): boolean {
  return ELECTRIC_TO_ELECTRIC.includes(systemType) && (ageYears ?? 0) >= 10;
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
  /** Realism pass over rebates: headline vs conversion-path vs footnote. */
  rebatePartition: RebatePartition;
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

  // Realism pass: partition rebates; conversion rebates on gas homes bring
  // their adders into the Replace-side principal, marginal ones drop to
  // footnote and out of the math entirely (Addendum 1 §3).
  const rebatePartition = partitionRebates(rebates, inputs.systemType, config);
  const countedRebates = [...rebatePartition.headline, ...rebatePartition.conversionPath];
  const certainRebateUsd = countedRebates
    .filter((r) => r.certain)
    .reduce((s, r) => s + r.amountUsd, 0);

  // Net of certain, counted rebates only — uncertain ones are shown as "may
  // qualify"; footnoted ones never touch the math.
  const netReplacement = Math.max(
    estReplacementCostUsd + rebatePartition.conversionAdderUsd - certainRebateUsd,
    0,
  );
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
    rebatePartition,
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
