import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  acknowledge,
  applyExtraction,
  heuristicExtract,
  initFlow,
  promptFor,
  type FlowState,
  type RepairFacts,
} from "@/lib/repair-flow";
import {
  computeRebateLeverage,
  computeRegretScore,
  computeRepairReplace,
  isFuelSwitch,
  resolveRebates,
  DEFAULT_CONFIG,
  type CalcConfig,
  type CalcOutputs,
  type GuzzlerBand,
  type RebateProgramRow,
  type RebateResolution,
  type SystemType,
} from "@/lib/repair-replace";

// Cora's repair-history exchange (July 23 handoff §3). Placed after uploads,
// before the report. One question at a time; the homeowner can ramble and
// Cora extracts everything said, skipping answered questions. All math comes
// from repair-replace.ts — Cora's numbers are never model-generated.

interface Msg {
  role: "cora" | "homeowner";
  text: string;
}

export interface RepairAnalysisDone {
  outputs: CalcOutputs;
  rebates: RebateResolution;
  facts: RepairFacts;
}

interface Props {
  sessionId: string;
  systemAgeYears: number | null;
  guzzlerScore: number | null;
  onComplete: (result: RepairAnalysisDone) => void;
}

export function bandForScore(score: number | null): GuzzlerBand | null {
  if (score == null) return null;
  if (score <= 25) return "sipping";
  if (score <= 50) return "steady";
  if (score <= 75) return "drinking";
  return "bleeding";
}

export default function RepairHistoryChat({ sessionId, systemAgeYears, guzzlerScore, onComplete }: Props) {
  const [flow, setFlow] = useState<FlowState>(() => initFlow(systemAgeYears));
  const [messages, setMessages] = useState<Msg[]>([
    { role: "cora", text: promptFor(initFlow(systemAgeYears)) },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [safetyIssue, setSafetyIssue] = useState(false);
  const finished = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const finish = async (finalFlow: FlowState, safety: boolean) => {
    if (finished.current) return;
    finished.current = true;

    const band = bandForScore(guzzlerScore);
    const facts = finalFlow.facts;

    // Regret score — every yes-path record gets one.
    const regret = facts.repair_within_24mo
      ? computeRegretScore({
          wasFinanced: facts.was_financed,
          repairCostUsd: facts.repair_cost_usd,
          stillHavingIssues: facts.still_having_issues,
          repairCount24mo: facts.repair_count_24mo,
          systemAgeYears,
          guzzlerBand: band,
        })
      : null;

    // Persist the repair history (fire-and-forget contract — never break flow).
    void supabase.from("repair_history").insert({
      quiz_session_id: sessionId,
      repair_within_24mo: facts.repair_within_24mo ?? false,
      repair_date_approx: facts.repair_date_approx,
      repair_cost_usd: facts.repair_cost_usd,
      repair_component: facts.repair_component,
      repair_count_24mo: facts.repair_count_24mo,
      was_financed: facts.was_financed,
      monthly_payment_usd: facts.monthly_payment_usd,
      contractor_name: facts.contractor_name,
      still_having_issues: facts.still_having_issues,
      repair_regret_score: regret?.score ?? null,
      regret_formula_version: regret?.version ?? null,
      raw_conversation_extract: { notes: finalFlow.extractionNotes, safety_issue: safety },
    }).then(({ error }) => { if (error) console.warn("repair_history not saved:", error.message); });

    // Config + rebates from the DB (single source of truth), code defaults as fallback.
    let config: CalcConfig = DEFAULT_CONFIG;
    let programs: RebateProgramRow[] = [];
    try {
      const [cfgRes, rebRes] = await Promise.all([
        supabase.from("repair_calc_config").select("key, value"),
        supabase.from("rebate_programs").select("program_name, state, utility_or_emc, max_amount_usd, income_qualified, income_tier, fuel_switching_allowed, fuel_switching_ends_on, status, scope_requirements, friction_level, display_mode").eq("state", "GA"),
      ]);
      if (cfgRes.data?.length) {
        const byKey = Object.fromEntries(cfgRes.data.map((r) => [r.key, r.value]));
        config = { ...DEFAULT_CONFIG, ...byKey } as CalcConfig;
      }
      programs = (rebRes.data ?? []) as RebateProgramRow[];
    } catch { /* offline — defaults carry it */ }

    const systemType: SystemType = "unknown"; // captured by the verified-score build later
    const rebates = resolveRebates(programs, {
      state: "GA",
      utility: null,          // soft utility question ships with verified score
      incomeTier: null,       // not asked -> income-dependent shown as "may qualify"
      fuelSwitchNeeded: isFuelSwitch(systemType),
      onDate: new Date(),
    });

    const outputs = computeRepairReplace(
      {
        systemAgeYears,
        systemType,
        guzzlerBand: band,
        monthlyEnergyWasteUsd: null, // bill analysis lands with the verified score
        cumulativeRepairCost24mo: (facts.repair_cost_usd ?? 0) * Math.max(facts.repair_count_24mo ?? 1, 1),
        repairCount24mo: facts.repair_count_24mo ?? (facts.repair_within_24mo ? 1 : 0),
        activeRepairPaymentUsd: facts.monthly_payment_usd,
        remainingRepairPaymentMonths: facts.was_financed ? 24 : 0,
        stillHavingIssues: facts.still_having_issues,
        safetyIssueReported: safety,
      },
      config,
      rebates,
    );

    // Persist the analysis run + nurture tag for D.A.V.E.
    void supabase.from("repair_replace_analysis").insert({
      quiz_session_id: sessionId,
      system_age_years: systemAgeYears,
      system_type: systemType,
      guzzler_band: band,
      est_monthly_energy_waste_usd: null,
      cumulative_repair_cost_24mo: (facts.repair_cost_usd ?? 0) * Math.max(facts.repair_count_24mo ?? 1, 1),
      active_repair_payment_usd: facts.monthly_payment_usd,
      est_replacement_cost_usd: outputs.estReplacementCostUsd,
      est_replacement_monthly_usd: outputs.estReplacementMonthlyUsd,
      applicable_rebates: JSON.parse(JSON.stringify(rebates.applied)),
      repair_cost_pct_of_replacement: outputs.repairCostPctOfReplacement,
      five_year_keep_cost_usd: outputs.fiveYearKeepCostUsd,
      five_year_replace_cost_usd: outputs.fiveYearReplaceCostUsd,
      recommendation: outputs.recommendation,
      recommendation_confidence: outputs.confidence,
      reasoning_summary: outputs.reasoningSummary,
    }).then(({ error }) => { if (error) console.warn("analysis not saved:", error.message); });

    void supabase.from("funnel_events").insert({
      quiz_session_id: sessionId,
      event_type: "repair_analysis_completed",
      step: outputs.recommendation,
      metadata: {
        regret_score: regret?.score ?? null,
        confidence: outputs.confidence,
        // replace -> hot queue; repair/monitor -> 2027 long-cycle nurture
        nurture: outputs.recommendation === "replace" ? "hot" : "long_cycle",
        // Electric-to-electric + aging = highest rebate leverage post-8/10.
        // Gas homes get the efficiency pitch; electric homes get the rebate pitch.
        rebate_leverage: computeRebateLeverage(systemType, systemAgeYears),
      },
    }).then(({ error }) => { if (error) console.warn("nurture tag not saved:", error.message); });

    onComplete({ outputs, rebates, facts });
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy || flow.step === "done") return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "homeowner", text }]);

    // 1) Local heuristics (instant, offline-safe)
    let extracted: Partial<RepairFacts> = heuristicExtract(text, flow.step);
    let notes: Record<string, string> = {};
    let safety = /heat exchanger|gas smell|carbon monoxide|co alarm|spark/i.test(text);

    // 2) LLM extraction for anything the heuristics didn't catch on longer messages
    const gotNothingNew = Object.keys(extracted).length === 0;
    if (gotNothingNew && text.split(/\s+/).length > 2) {
      try {
        const { data } = await supabase.functions.invoke("extract-repair-history", {
          body: { message: text, knownFacts: flow.facts, step: flow.step },
        });
        if (data?.fields) extracted = data.fields;
        if (data?.notes) notes = data.notes;
        if (data?.safetyIssue) safety = true;
      } catch { /* heuristics-only is fine */ }
    }
    if (safety) setSafetyIssue(true);

    const nextFlow = applyExtraction(flow, extracted, notes);
    const ack = acknowledge(flow.facts, nextFlow.facts);
    const coraLines: Msg[] = [];
    if (ack) coraLines.push({ role: "cora", text: ack });

    if (nextFlow.step === "done") {
      coraLines.push({ role: "cora", text: "Got it — let me run your actual numbers." });
      setMessages((m) => [...m, ...coraLines]);
      setFlow(nextFlow);
      setBusy(false);
      await finish(nextFlow, safety || safetyIssue);
      return;
    }

    // If nothing was understood, gently re-ask the same question once.
    if (nextFlow.step === flow.step && Object.keys(extracted).length === 0) {
      coraLines.push({ role: "cora", text: "No wrong answers here — even a rough guess helps. " + promptFor(nextFlow) });
    } else {
      coraLines.push({ role: "cora", text: promptFor(nextFlow) });
    }
    setMessages((m) => [...m, ...coraLines]);
    setFlow(nextFlow);
    setBusy(false);
  };

  const showYesNo = flow.step === "q1_opener";

  return (
    <div className="bg-background rounded-2xl shadow-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Wrench className="w-4 h-4 text-primary" />
        <h3 className="font-display font-bold text-foreground">Quick repair check with Cora</h3>
      </div>

      <div ref={scroller} className="max-h-72 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-sm leading-relaxed rounded-xl px-4 py-2.5 max-w-[85%] ${
              msg.role === "cora"
                ? "bg-primary/5 border border-primary/15 text-foreground"
                : "bg-muted text-foreground ml-auto"
            }`}
          >
            {msg.text}
          </motion.div>
        ))}
      </div>

      {flow.step !== "done" && (
        <div className="space-y-2">
          {showYesNo && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void send("Yes")} disabled={busy}>
                Yes, we have
              </Button>
              <Button variant="outline" size="sm" onClick={() => void send("No")} disabled={busy}>
                No repairs
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
              placeholder="Type your answer…"
              disabled={busy}
              className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
            />
            <Button size="sm" onClick={() => void send()} disabled={busy || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
