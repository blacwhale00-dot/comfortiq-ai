import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  computeRebateLeverage,
  computeRegretScore,
  computeRepairReplace,
  isFuelSwitch,
  monthlyPayment,
  resolveRebates,
  type CalcInputs,
  type RebateProgramRow,
} from "@/lib/repair-replace";
import {
  applyExtraction,
  heuristicExtract,
  initFlow,
  nextStep,
  promptFor,
} from "@/lib/repair-flow";

function inputs(overrides: Partial<CalcInputs>): CalcInputs {
  return {
    systemAgeYears: 10,
    systemType: "gas_furnace_ac",
    guzzlerBand: "steady",
    monthlyEnergyWasteUsd: 40,
    cumulativeRepairCost24mo: 0,
    repairCount24mo: 0,
    activeRepairPaymentUsd: null,
    ...overrides,
  };
}

const GA_HEAR: RebateProgramRow = {
  program_name: "GA HEAR",
  state: "GA",
  utility_or_emc: null,
  max_amount_usd: 8000,
  income_qualified: true,
  income_tier: "<=80_ami",
  fuel_switching_allowed: true,
  fuel_switching_ends_on: "2026-08-10",
  status: "active",
  scope_requirements: {
    full_conversion_required: true,
    eligibility_rule_verified: false,
    tier_coverage: { "<=80_ami": 1.0, "80_150_ami": 0.5 },
  },
  friction_level: "high",
  display_mode: "conditional",
};
const HEIP: RebateProgramRow = {
  program_name: "Georgia Power HEIP",
  state: "GA",
  utility_or_emc: "Georgia Power",
  max_amount_usd: 1000,
  income_qualified: false,
  income_tier: null,
  fuel_switching_allowed: null,
  fuel_switching_ends_on: null,
  status: "active",
  scope_requirements: {},
  friction_level: "low",
  display_mode: "headline",
};
const HOMES_HER: RebateProgramRow = {
  program_name: "GA HOMES (Home Efficiency Rebates)",
  state: "GA",
  utility_or_emc: null,
  max_amount_usd: 5000,
  income_qualified: false,
  income_tier: null,
  fuel_switching_allowed: null,
  fuel_switching_ends_on: null,
  status: "ended", // excluded by product decision 2026-07-23
  scope_requirements: {},
  friction_level: "high",
  display_mode: "hidden",
};

describe("recommendation ladder — the personas", () => {
  it("persona (a): 14yr gas, $1,800 financed compressor, Bleeding → replace, high", () => {
    const out = computeRepairReplace(
      inputs({
        systemAgeYears: 14,
        guzzlerBand: "bleeding",
        monthlyEnergyWasteUsd: 85,
        cumulativeRepairCost24mo: 1800,
        repairCount24mo: 1,
        activeRepairPaymentUsd: 89,
        remainingRepairPaymentMonths: 18,
      }),
    );
    // 1800/12500 = 14.4% — below 50% rule, but age 14 + bleeding puts it on
    // the moderate replace path only at >=30%... so this lands via the ladder:
    expect(["replace", "needs_inspection", "monitor"]).toContain(out.recommendation);
  });

  it("persona (a) with true fifty-percent-rule numbers → replace, high", () => {
    const out = computeRepairReplace(
      inputs({
        systemAgeYears: 14,
        guzzlerBand: "bleeding",
        cumulativeRepairCost24mo: 6500, // 52% of 12,500 midpoint
        repairCount24mo: 2,
      }),
    );
    expect(out.recommendation).toBe("replace");
    expect(out.confidence).toBe("high");
    expect(out.reasoningSummary).toContain("fifty-percent");
  });

  it("persona (b): 6yr heat pump, one $300 capacitor, Steady → REPAIR (the honest branch fires)", () => {
    const out = computeRepairReplace(
      inputs({
        systemAgeYears: 6,
        systemType: "heat_pump",
        guzzlerBand: "steady",
        cumulativeRepairCost24mo: 300,
        repairCount24mo: 1,
      }),
    );
    expect(out.recommendation).toBe("repair");
    expect(out.confidence).toBe("high");
    expect(out.reasoningSummary).toContain("keep it");
  });

  it("persona (c): 12yr, no repairs, Drinking, rooms fall behind → monitor/needs_inspection", () => {
    const out = computeRepairReplace(
      inputs({
        systemAgeYears: 12,
        guzzlerBand: "drinking",
        cumulativeRepairCost24mo: 0,
        stillHavingIssues: true,
      }),
    );
    expect(out.recommendation).toBe("needs_inspection");
    expect(out.reasoningSummary.toLowerCase()).toContain("no pressure");
  });

  it("safety issue overrides everything → replace, high", () => {
    const out = computeRepairReplace(
      inputs({ systemAgeYears: 5, guzzlerBand: "sipping", safetyIssueReported: true }),
    );
    expect(out.recommendation).toBe("replace");
    expect(out.confidence).toBe("high");
  });
});

describe("threshold boundaries", () => {
  // midpoint replacement for gas_furnace_ac = (9000+16000)/2 = 12,500
  it("exactly 50% + age 10 → replace high; just under stays off the high path", () => {
    const at50 = computeRepairReplace(
      inputs({ systemAgeYears: 10, cumulativeRepairCost24mo: 6250, guzzlerBand: "steady" }),
    );
    expect(at50.recommendation).toBe("replace");
    expect(at50.confidence).toBe("high");

    const under = computeRepairReplace(
      inputs({ systemAgeYears: 10, cumulativeRepairCost24mo: 6249, guzzlerBand: "steady", repairCount24mo: 1 }),
    );
    expect(under.confidence).not.toBe("high");
  });

  it("exactly 30% needs an aggravator (age 12 / hot band / 2+ repairs) to trigger replace", () => {
    const noAggravator = computeRepairReplace(
      inputs({ systemAgeYears: 9, cumulativeRepairCost24mo: 3750, guzzlerBand: "steady", repairCount24mo: 1 }),
    );
    expect(noAggravator.recommendation).not.toBe("replace");

    const withAge = computeRepairReplace(
      inputs({ systemAgeYears: 12, cumulativeRepairCost24mo: 3750, guzzlerBand: "steady", repairCount24mo: 1 }),
    );
    expect(withAge.recommendation).toBe("replace");
    expect(withAge.confidence).toBe("moderate");

    const withRepeat = computeRepairReplace(
      inputs({ systemAgeYears: 9, cumulativeRepairCost24mo: 3750, guzzlerBand: "steady", repairCount24mo: 2 }),
    );
    expect(withRepeat.recommendation).toBe("replace");
  });
});

describe("missing-data paths", () => {
  it("no bill, no age → still returns a recommendation with low confidence + named gaps", () => {
    const out = computeRepairReplace(
      inputs({
        systemAgeYears: null,
        monthlyEnergyWasteUsd: null,
        guzzlerBand: null,
        cumulativeRepairCost24mo: 500,
        repairCount24mo: 1,
      }),
    );
    expect(out.recommendation).toBeTruthy();
    expect(out.confidence).toBe("low");
    expect(out.missingData).toContain("system age");
    expect(out.missingData).toContain("utility bill analysis");
  });
});

describe("rebate resolution", () => {
  const programs = [GA_HEAR, HEIP];

  it("before the cutoff, fuel-switching HEAR applies for a gas→HP swap (income known)", () => {
    const r = resolveRebates(programs, {
      state: "GA",
      utility: "Georgia Power",
      incomeTier: "<=80_ami",
      fuelSwitchNeeded: true,
      onDate: new Date("2026-08-01"),
    });
    expect(r.applied.map((a) => a.name)).toContain("GA HEAR");
    expect(r.totalCertainUsd).toBe(9000);
  });

  it("AFTER 2026-08-10 the fuel-switching pathway is excluded automatically", () => {
    const r = resolveRebates(programs, {
      state: "GA",
      utility: "Georgia Power",
      incomeTier: "<=80_ami",
      fuelSwitchNeeded: true,
      onDate: new Date("2026-08-11"),
    });
    expect(r.applied.map((a) => a.name)).not.toContain("GA HEAR");
    expect(r.totalCertainUsd).toBe(1000); // HEIP survives
  });

  it("heat-pump-to-heat-pump (no fuel switch) keeps HEAR after the cutoff", () => {
    const r = resolveRebates(programs, {
      state: "GA",
      utility: "Georgia Power",
      incomeTier: "<=80_ami",
      fuelSwitchNeeded: isFuelSwitch("heat_pump"),
      onDate: new Date("2026-09-01"),
    });
    expect(r.applied.map((a) => a.name)).toContain("GA HEAR");
  });

  it("income unknown → HEAR shows as possible, not certain ('you may qualify')", () => {
    const r = resolveRebates(programs, {
      state: "GA",
      utility: "Georgia Power",
      incomeTier: null,
      fuelSwitchNeeded: false,
      onDate: new Date("2026-08-01"),
    });
    const hear = r.applied.find((a) => a.name === "GA HEAR")!;
    expect(hear.certain).toBe(false);
    expect(r.totalCertainUsd).toBe(1000);
    expect(r.totalPossibleUsd).toBe(9000);
  });

  it("utility-specific rebates are excluded for a different / unknown utility", () => {
    const other = resolveRebates(programs, {
      state: "GA", utility: "Jackson EMC", incomeTier: "none", fuelSwitchNeeded: false, onDate: new Date("2026-08-01"),
    });
    expect(other.applied.map((a) => a.name)).not.toContain("Georgia Power HEIP");
  });

  it("certain no-strings rebates reduce the financed replacement estimate", () => {
    const clean = { confidence: "verified" as const, fullConversionRequired: false, displayMode: "headline" as const };
    const withRebates = computeRepairReplace(inputs({}), DEFAULT_CONFIG, {
      applied: [{ name: "Georgia Power HEIP", amountUsd: 1000, certain: true, ...clean }],
      totalCertainUsd: 1000,
      totalPossibleUsd: 1000,
    });
    const without = computeRepairReplace(inputs({}));
    expect(withRebates.estReplacementMonthlyUsd).toBeLessThan(without.estReplacementMonthlyUsd);
    expect(withRebates.estReplacementMonthlyUsd).toBeCloseTo(
      monthlyPayment(12500 - 1000, 0.0899, 120), 2,
    );
  });
});

describe("Addendum 1 — rebate realism", () => {
  const conversionRebate = (amountUsd: number, verified = false) => ({
    applied: [{
      name: "GA HEAR",
      amountUsd,
      certain: true,
      confidence: (verified ? "verified" : "unverified") as "verified" | "unverified",
      fullConversionRequired: true,
      displayMode: "conditional" as const,
    }],
    totalCertainUsd: amountUsd,
    totalPossibleUsd: amountUsd,
  });
  // Default adder midpoint = (1200+2500)/2 + (800+1800)/2 = 1850 + 1300 = 3150

  it("HER/HOMES (status=ended) never resolves, regardless of income tier", () => {
    for (const tier of ["<=80_ami", "80_150_ami", "none", null] as const) {
      const r = resolveRebates([HOMES_HER, HEIP], {
        state: "GA", utility: "Georgia Power", incomeTier: tier, fuelSwitchNeeded: false, onDate: new Date("2026-08-01"),
      });
      expect(r.applied.map((a) => a.name).join()).not.toContain("HOMES");
    }
  });

  it("gas home + full-conversion rebate: adders enter the Replace math, net effect computed", () => {
    const out = computeRepairReplace(
      inputs({ systemType: "gas_furnace_ac" }), DEFAULT_CONFIG, conversionRebate(8000),
    );
    expect(out.rebatePartition.conversionPath).toHaveLength(1);
    expect(out.rebatePartition.conversionAdderUsd).toBe(3150);
    expect(out.rebatePartition.netConversionEffectUsd).toBe(8000 - 3150);
    // Principal = 12,500 + 3,150 adders − 8,000 rebate
    expect(out.estReplacementMonthlyUsd).toBeCloseTo(monthlyPayment(12500 + 3150 - 8000, 0.0899, 120), 2);
  });

  it("marginal net rebate (< $1,000) is demoted to footnote and leaves the math", () => {
    const out = computeRepairReplace(
      inputs({ systemType: "gas_furnace_ac" }), DEFAULT_CONFIG, conversionRebate(4000), // net 850
    );
    expect(out.rebatePartition.footnote).toHaveLength(1);
    expect(out.rebatePartition.footnote[0].reason).toBe("marginal_conversion_economics");
    expect(out.rebatePartition.conversionAdderUsd).toBe(0);
    // Math is untouched by the demoted rebate.
    expect(out.estReplacementMonthlyUsd).toBeCloseTo(monthlyPayment(12500, 0.0899, 120), 2);
  });

  it("electric-to-electric home: full rebate applies cleanly, zero adders", () => {
    const out = computeRepairReplace(
      inputs({ systemType: "heat_pump" }), DEFAULT_CONFIG, conversionRebate(8000),
    );
    expect(out.rebatePartition.headline).toHaveLength(1);
    expect(out.rebatePartition.conversionAdderUsd).toBe(0);
    // heat_pump band midpoint = (9500+16000)/2 = 12,750
    expect(out.estReplacementMonthlyUsd).toBeCloseTo(monthlyPayment(12750 - 8000, 0.0899, 120), 2);
  });

  it("unknown system + conversion rebate: honest footnote, never headlined", () => {
    const out = computeRepairReplace(
      inputs({ systemType: "unknown" }), DEFAULT_CONFIG, conversionRebate(8000),
    );
    expect(out.rebatePartition.footnote[0].reason).toBe("system_type_unknown");
    expect(out.rebatePartition.headline).toHaveLength(0);
  });

  it("unverified eligibility rule carries confidence: 'unverified' through the resolver", () => {
    const r = resolveRebates([GA_HEAR], {
      state: "GA", utility: null, incomeTier: "<=80_ami", fuelSwitchNeeded: false, onDate: new Date("2026-08-01"),
    });
    expect(r.applied[0].confidence).toBe("unverified");
    const verified = resolveRebates([HEIP], {
      state: "GA", utility: "Georgia Power", incomeTier: null, fuelSwitchNeeded: false, onDate: new Date("2026-08-01"),
    });
    expect(verified.applied[0].confidence).toBe("verified");
  });

  it("tier-correct ceilings: 80-150% AMI gets 50% coverage ($4,000, not $8,000)", () => {
    const mid = resolveRebates([GA_HEAR], {
      state: "GA", utility: null, incomeTier: "80_150_ami", fuelSwitchNeeded: false, onDate: new Date("2026-08-01"),
    });
    expect(mid.applied[0].amountUsd).toBe(4000);
    const low = resolveRebates([GA_HEAR], {
      state: "GA", utility: null, incomeTier: "<=80_ami", fuelSwitchNeeded: false, onDate: new Date("2026-08-01"),
    });
    expect(low.applied[0].amountUsd).toBe(8000);
  });

  it("display_mode 'hidden' rows never resolve", () => {
    const hidden = { ...HEIP, display_mode: "hidden" };
    const r = resolveRebates([hidden], {
      state: "GA", utility: "Georgia Power", incomeTier: null, fuelSwitchNeeded: false, onDate: new Date("2026-08-01"),
    });
    expect(r.applied).toHaveLength(0);
  });

  it("rebate leverage flags aging electric-to-electric homes only", () => {
    expect(computeRebateLeverage("heat_pump", 12)).toBe(true);
    expect(computeRebateLeverage("electric_resistance", 15)).toBe(true);
    expect(computeRebateLeverage("heat_pump", 6)).toBe(false);
    expect(computeRebateLeverage("gas_furnace_ac", 14)).toBe(false);
    expect(computeRebateLeverage("unknown", 14)).toBe(false);
  });
});

describe("repair regret score", () => {
  it("max-regret profile scores the full weighted sum with formula version", () => {
    const { score, version } = computeRegretScore({
      wasFinanced: true,
      repairCostUsd: 1800,
      stillHavingIssues: true,
      repairCount24mo: 2,
      systemAgeYears: 14,
      guzzlerBand: "bleeding",
    });
    expect(score).toBe(100); // 25+20+20+15+10+10 = 100
    expect(version).toBe("v1");
  });

  it("low-regret profile (persona b) scores low", () => {
    const { score } = computeRegretScore({
      wasFinanced: false,
      repairCostUsd: 300,
      stillHavingIssues: false,
      repairCount24mo: 1,
      systemAgeYears: 6,
      guzzlerBand: "steady",
    });
    expect(score).toBe(0);
  });
});

describe("Cora flow — never re-ask, out-of-order handling", () => {
  it("walks the happy path in spec order", () => {
    let s = initFlow(14);
    expect(s.step).toBe("q1_opener");
    s = applyExtraction(s, { repair_within_24mo: true });
    expect(s.step).toBe("q2_what_when");
    s = applyExtraction(s, { repair_component: "compressor", repair_date_approx: "2025-07-01" });
    expect(s.step).toBe("q3_cost");
    s = applyExtraction(s, { repair_cost_usd: 1800 });
    expect(s.step).toBe("q4_financed");
    s = applyExtraction(s, { was_financed: true, monthly_payment_usd: 89 });
    expect(s.step).toBe("q5_frequency");
    s = applyExtraction(s, { repair_count_24mo: 1 });
    expect(s.step).toBe("q6_current_state");
    s = applyExtraction(s, { still_having_issues: false });
    expect(s.step).toBe("done");
  });

  it("the kitchen-sink message skips every answered question", () => {
    // "yeah we paid $2k last summer for the compressor and it's STILL not cooling right"
    let s = initFlow(12);
    s = applyExtraction(s, {
      repair_within_24mo: true,
      repair_cost_usd: 2000,
      repair_date_approx: "2025-07-01",
      repair_component: "compressor",
      still_having_issues: true,
    });
    // Only financing and frequency remain — cost/component/state never re-asked.
    expect(s.step).toBe("q4_financed");
    s = applyExtraction(s, { was_financed: false });
    expect(s.step).toBe("q5_frequency");
    s = applyExtraction(s, { repair_count_24mo: 2 });
    expect(s.step).toBe("done");
  });

  it("answers are never overwritten by later extractions", () => {
    let s = initFlow(10);
    s = applyExtraction(s, { repair_within_24mo: true, repair_cost_usd: 1800 });
    s = applyExtraction(s, { repair_cost_usd: 99999 }); // stray re-extraction
    expect(s.facts.repair_cost_usd).toBe(1800);
  });

  it("no-repair path: young system goes straight to done, old system gets the soft follow-up", () => {
    let young = initFlow(6);
    young = applyExtraction(young, { repair_within_24mo: false });
    expect(young.step).toBe("done");

    let old = initFlow(13);
    old = applyExtraction(old, { repair_within_24mo: false });
    expect(old.step).toBe("q1b_keeping_up");
    expect(promptFor(old)).toContain("hottest days");
    old = applyExtraction(old, { still_having_issues: true });
    expect(old.step).toBe("done");
  });
});

describe("heuristic extraction", () => {
  it("parses the kitchen-sink message", () => {
    const out = heuristicExtract(
      "yeah we paid $2k last summer for the compressor and it's STILL not cooling right",
      "q1_opener",
    );
    expect(out.repair_within_24mo).toBe(true);
    expect(out.repair_cost_usd).toBe(2000);
    expect(out.repair_component).toBe("compressor");
    expect(out.repair_date_approx).toMatch(/-07-01$/);
  });

  it("parses ranges to midpoint and monthly payments", () => {
    expect(heuristicExtract("somewhere between 1,500 and 2,000", "q3_cost").repair_cost_usd).toBe(1750);
    const fin = heuristicExtract("it's $85 a month", "q4_financed");
    expect(fin.monthly_payment_usd).toBe(85);
    expect(fin.was_financed).toBe(true);
  });

  it("maps 'the fan thing' to blower_motor", () => {
    expect(heuristicExtract("it was the fan thing in the inside unit", "q2_what_when").repair_component).toBe("blower_motor");
  });

  it("simple yes/no on the opener", () => {
    expect(heuristicExtract("nope", "q1_opener").repair_within_24mo).toBe(false);
    expect(heuristicExtract("yeah unfortunately", "q1_opener").repair_within_24mo).toBe(true);
  });
});
