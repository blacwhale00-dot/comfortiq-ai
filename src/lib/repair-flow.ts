// Cora's repair-history exchange — a state machine, not free-form chat
// (spec §3). One question at a time; any homeowner message may answer several
// questions at once ("we paid $2k last summer for the compressor and it's
// STILL not cooling right"), so every extraction is merged into the state and
// already-answered questions are skipped. Cora never re-asks.

export interface RepairFacts {
  repair_within_24mo: boolean | null;
  repair_component: string | null;
  repair_date_approx: string | null; // ISO date, month precision fine
  repair_cost_usd: number | null;
  was_financed: boolean | null;
  monthly_payment_usd: number | null;
  repair_count_24mo: number | null;
  still_having_issues: boolean | null;
  contractor_name: string | null;
}

export const EMPTY_FACTS: RepairFacts = {
  repair_within_24mo: null,
  repair_component: null,
  repair_date_approx: null,
  repair_cost_usd: null,
  was_financed: null,
  monthly_payment_usd: null,
  repair_count_24mo: null,
  still_having_issues: null,
  contractor_name: null,
};

export type FlowStep =
  | "q1_opener"
  | "q1b_keeping_up" // no-repair path, old system only
  | "q2_what_when"
  | "q3_cost"
  | "q4_financed"
  | "q5_frequency"
  | "q6_current_state"
  | "done";

export interface FlowState {
  facts: RepairFacts;
  step: FlowStep;
  systemAgeYears: number | null;
  /** Per-field extraction confidence notes, persisted to raw_conversation_extract. */
  extractionNotes: Record<string, string>;
}

export function initFlow(systemAgeYears: number | null): FlowState {
  return {
    facts: { ...EMPTY_FACTS },
    step: "q1_opener",
    systemAgeYears,
    extractionNotes: {},
  };
}

// ---------- prompts (Cora's voice: plain, warm, one at a time) ----------

export function promptFor(state: FlowState): string {
  switch (state.step) {
    case "q1_opener":
      return "One more thing that really sharpens your score: have you had to repair this system in the last two years?";
    case "q1b_keeping_up":
      return "Has it been keeping up on the hottest days, or do some rooms fall behind?";
    case "q2_what_when":
      return "What ended up needing the fix — and roughly when was that?";
    case "q3_cost":
      return "Do you remember about what it cost?";
    case "q4_financed":
      return "Did you pay that outright, or did the company set you up on payments?";
    case "q5_frequency":
      return "Was that the only repair in the last couple of years, or has it needed more than one visit?";
    case "q6_current_state":
      return "And since that fix — running strong, or still giving you trouble?";
    case "done":
      return "";
  }
}

/** Warm acknowledgement of what was just learned, before the next question. */
export function acknowledge(prev: RepairFacts, next: RepairFacts): string | null {
  if (prev.repair_within_24mo === null && next.repair_within_24mo === false) {
    return "That's a good sign — either it's holding up or it hasn't hit its trouble years yet.";
  }
  if (prev.repair_cost_usd === null && next.repair_cost_usd !== null) {
    const c = next.repair_cost_usd;
    if (c >= 1200)
      return `$${Math.round(c).toLocaleString()} ${next.repair_component ? "on a " + label(next.repair_component) : ""} is a real hit — and it tells me something about where the system is in its life.`;
    return `Okay — $${Math.round(c).toLocaleString()} is on the lighter end, which actually matters for the math.`;
  }
  if (prev.was_financed === null && next.was_financed === true) {
    return "That was a reasonable call — a lot of homeowners are doing exactly that right now.";
  }
  if (prev.repair_count_24mo === null && (next.repair_count_24mo ?? 0) >= 2) {
    return "More than one visit in two years — that's worth paying attention to.";
  }
  if (prev.still_having_issues === null && next.still_having_issues === true) {
    return "Paying for a fix and still having trouble is the worst of both — let's get you real numbers.";
  }
  return null;
}

function label(component: string): string {
  const map: Record<string, string> = {
    compressor: "compressor",
    capacitor: "capacitor",
    blower_motor: "blower motor",
    refrigerant_leak: "refrigerant leak",
    control_board: "control board",
    unknown: "repair",
  };
  return map[component] ?? component;
}

// ---------- merge + advance ----------

/** Merge newly extracted fields into facts. Existing (non-null) answers are
 * never overwritten — the homeowner said it once; we keep it. */
export function mergeFacts(
  facts: RepairFacts,
  extracted: Partial<RepairFacts>,
): RepairFacts {
  const merged = { ...facts };
  for (const k of Object.keys(EMPTY_FACTS) as (keyof RepairFacts)[]) {
    const incoming = extracted[k];
    if (incoming !== undefined && incoming !== null && merged[k] === null) {
      (merged as Record<string, unknown>)[k] = incoming;
    }
  }
  return merged;
}

/** Advance to the next UNANSWERED question — the skip logic that guarantees
 * Cora never asks something the homeowner already said. */
export function nextStep(state: FlowState): FlowStep {
  const f = state.facts;

  if (f.repair_within_24mo === null) return "q1_opener";

  if (f.repair_within_24mo === false) {
    // No-repair path: one soft follow-up for old systems, then done.
    const old = (state.systemAgeYears ?? 0) >= 12;
    if (old && f.still_having_issues === null) return "q1b_keeping_up";
    return "done";
  }

  if (f.repair_component === null && f.repair_date_approx === null) return "q2_what_when";
  if (f.repair_cost_usd === null) return "q3_cost";
  if (f.was_financed === null) return "q4_financed";
  if (f.repair_count_24mo === null) return "q5_frequency";
  if (f.still_having_issues === null) return "q6_current_state";
  return "done";
}

export function applyExtraction(
  state: FlowState,
  extracted: Partial<RepairFacts>,
  notes?: Record<string, string>,
): FlowState {
  const facts = mergeFacts(state.facts, extracted);
  const next: FlowState = {
    ...state,
    facts,
    extractionNotes: { ...state.extractionNotes, ...(notes ?? {}) },
  };
  next.step = nextStep(next);
  return next;
}

// ---------- local heuristic extraction ----------
// First-pass parser for simple answers (yes/no, dollar amounts, counts).
// The extract-repair-history edge function (Claude) handles messy free text;
// this keeps the flow working offline and makes buttons instant.

const COMPONENT_PATTERNS: [RegExp, string][] = [
  [/compressor/i, "compressor"],
  [/capacitor|start.?cap/i, "capacitor"],
  [/blower|fan\s?motor|the fan/i, "blower_motor"],
  [/refrigerant|freon|leak|recharge/i, "refrigerant_leak"],
  [/control board|circuit board|board/i, "control_board"],
  [/coil/i, "evaporator_coil"],
  [/thermostat/i, "thermostat"],
];

export function heuristicExtract(message: string, step: FlowStep): Partial<RepairFacts> {
  const m = message.toLowerCase().trim();
  const out: Partial<RepairFacts> = {};

  // yes/no — meaning depends on which question is on the table
  const saidYes = /^(y(es|ea|ep)?|sure|we (did|have)|unfortunately)/.test(m);
  const saidNo = /^(n(o|ope|ah)?|never|not that i)/.test(m);
  if (step === "q1_opener") {
    if (saidYes) out.repair_within_24mo = true;
    if (saidNo) out.repair_within_24mo = false;
  }
  if (step === "q1b_keeping_up") {
    if (/keep(s|ing)? up|fine|strong|no problem|does great/.test(m)) out.still_having_issues = false;
    if (/fall|behind|struggle|hot|can't|cant|never cools|upstairs/.test(m)) out.still_having_issues = true;
  }
  if (step === "q6_current_state") {
    if (/strong|fine|good|great|no (more )?(trouble|issues)/.test(m)) out.still_having_issues = false;
    if (/still|trouble|issues|not (cooling|working)|acting up/.test(m)) out.still_having_issues = true;
  }
  if (step === "q4_financed") {
    if (/outright|cash|paid (it )?(in )?full|credit card/.test(m)) out.was_financed = false;
    if (/payments?|financ|monthly|installment/.test(m)) out.was_financed = true;
  }

  // dollars: "$1,800", "1800", "about 2k", "$85/month"
  const money = m.match(/\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d+)?)\s?(k)?\b/);
  if (money) {
    let amount = parseFloat(money[1].replace(/,/g, ""));
    if (money[2] === "k") amount *= 1000;
    const isMonthly = /\/?\s?(a |per )?month|\/mo/.test(m);
    if (isMonthly && amount > 0 && amount < 1000) {
      out.monthly_payment_usd = amount;
      out.was_financed = true;
    } else if (amount >= 50 && amount <= 20000 && (step === "q3_cost" || /cost|paid|charge|ran (us|me)|bill/.test(m))) {
      out.repair_cost_usd = amount;
    }
  }

  // "between 1500 and 2000" → midpoint
  const range = m.match(/(\d[\d,]*)\s*(?:-|to|and)\s*\$?(\d[\d,]*)/);
  if (range && step === "q3_cost") {
    const lo = parseFloat(range[1].replace(/,/g, ""));
    const hi = parseFloat(range[2].replace(/,/g, ""));
    if (hi > lo && lo >= 50 && hi <= 20000) out.repair_cost_usd = (lo + hi) / 2;
  }

  // component
  for (const [re, comp] of COMPONENT_PATTERNS) {
    if (re.test(m)) {
      out.repair_component = comp;
      if (step === "q1_opener") out.repair_within_24mo = true; // volunteered a repair
      break;
    }
  }

  // count: "twice", "two times", "three visits", "only the one"
  if (/twice|two (times|visits|repairs)/.test(m)) out.repair_count_24mo = 2;
  else if (/three (times|visits|repairs)|3 times/.test(m)) out.repair_count_24mo = 3;
  else if (step === "q5_frequency" && /only|just (the )?(one|once)|that was it|once/.test(m))
    out.repair_count_24mo = 1;

  // rough dates: "last summer", "march 2025", "last year"
  const now = new Date();
  if (/last summer/.test(m)) out.repair_date_approx = `${now.getFullYear() - 1}-07-01`;
  else if (/this summer/.test(m)) out.repair_date_approx = `${now.getFullYear()}-07-01`;
  else if (/last year/.test(m)) out.repair_date_approx = `${now.getFullYear() - 1}-06-01`;
  else {
    const my = m.match(
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/,
    );
    if (my) {
      const month = ["january","february","march","april","may","june","july","august","september","october","november","december"].indexOf(my[1]) + 1;
      const year = my[2] ? parseInt(my[2]) : month > now.getMonth() + 1 ? now.getFullYear() - 1 : now.getFullYear();
      out.repair_date_approx = `${year}-${String(month).padStart(2, "0")}-01`;
    }
  }

  return out;
}
