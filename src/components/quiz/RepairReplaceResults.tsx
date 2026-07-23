import { motion } from "framer-motion";
import { Scale } from "lucide-react";
import { fmtUsd } from "@/lib/repair-replace";
import type { RepairAnalysisDone } from "./RepairHistoryChat";

// Side-by-side "Keep it" vs "Replace it" five-year picture (handoff §4).
// Every figure comes from the calculator; the honest caveat is always shown.
// This card can recommend KEEPING the system — that's the point.

const REC_LABEL: Record<string, { title: string; tone: string }> = {
  repair: { title: "Our honest read: fix it and keep it.", tone: "text-primary" },
  monitor: { title: "Our honest read: leave it alone for now.", tone: "text-primary" },
  replace: { title: "Our honest read: replacement math wins here.", tone: "text-accent" },
  needs_inspection: { title: "Our honest read: worth a real set of eyes.", tone: "text-foreground" },
};

export default function RepairReplaceResults({ result }: { result: RepairAnalysisDone }) {
  const { outputs, rebates } = result;
  const rec = REC_LABEL[outputs.recommendation];
  const keepWins = outputs.recommendation === "repair" || outputs.recommendation === "monitor";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background rounded-2xl shadow-elevated p-6 md:p-8"
    >
      <div className="flex items-center gap-2 mb-1">
        <Scale className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-lg text-foreground">Repair vs. Replace — your 5-year picture</h3>
      </div>
      <p className={`text-sm font-semibold mb-5 ${rec.tone}`}>{rec.title}</p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className={`rounded-xl border p-4 ${keepWins ? "border-primary bg-primary/5" : "border-border bg-surface"}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Keep it</p>
          <p className="text-2xl font-display font-extrabold text-foreground">{fmtUsd(outputs.fiveYearKeepCostUsd)}</p>
          <p className="text-xs text-muted-foreground mt-1">projected repairs + energy waste{outputs.missingData.includes("utility bill analysis") ? "*" : ""} + any repair payments</p>
        </div>
        <div className={`rounded-xl border p-4 ${!keepWins && outputs.recommendation === "replace" ? "border-accent bg-accent/5" : "border-border bg-surface"}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Replace it</p>
          <p className="text-2xl font-display font-extrabold text-foreground">{fmtUsd(outputs.fiveYearReplaceCostUsd)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ≈ {fmtUsd(outputs.estReplacementMonthlyUsd)}/mo financed, before your $900 discount
          </p>
        </div>
      </div>

      <p className="text-sm text-foreground leading-relaxed mb-4">{outputs.reasoningSummary}</p>

      {rebates.applied.length > 0 && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 mb-4 text-sm">
          <p className="font-semibold text-foreground mb-1">On the replace side, stackable with your $900 discount:</p>
          {rebates.applied.map((r) => (
            <p key={r.name} className="text-muted-foreground">
              • {r.name}: {r.certain ? `up to ${fmtUsd(r.amountUsd)}` : `you may qualify for up to ${fmtUsd(r.amountUsd)} — we can check`}
            </p>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        Replacement figures are estimates, not quotes — final numbers come from a verification
        visit with a real human.
        {outputs.missingData.length > 0 &&
          ` *We're missing ${outputs.missingData.join(" and ")}, so treat this as directional.`}
      </p>
    </motion.div>
  );
}
