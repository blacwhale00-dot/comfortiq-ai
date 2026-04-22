import { motion } from "framer-motion";
import { ShieldCheck, Calendar, AlertTriangle } from "lucide-react";

interface GuzzlerEvidenceProps {
  yearBuilt: number | null;
  yearBuiltSource: "County" | "Homeowner" | "Unknown";
  silenceYears: number | null;
  lastPermitDate: string | null;
}

export default function GuzzlerEvidence({
  yearBuilt,
  yearBuiltSource,
  silenceYears,
  lastPermitDate,
}: GuzzlerEvidenceProps) {
  const isHighGap = (silenceYears ?? 0) > 12;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="bg-background rounded-2xl shadow-card border border-border p-6"
    >
      <h3 className="font-display font-bold text-foreground text-sm mb-4 flex items-center gap-2 tracking-wide uppercase">
        <ShieldCheck className="w-4 h-4 text-primary" />
        What the Data Shows
      </h3>

      <div className="space-y-3">
        {/* Home Age */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-border">
          <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">
              Home Age
            </p>
            <p className="text-base font-display font-bold text-foreground">
              {yearBuilt ? `Built ${yearBuilt}` : "Year not on file"}
            </p>
            <span
              className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                yearBuiltSource === "County"
                  ? "bg-primary/10 text-primary"
                  : yearBuiltSource === "Homeowner"
                  ? "bg-amber/15 text-amber-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {yearBuiltSource === "County"
                ? "County Verified"
                : yearBuiltSource === "Homeowner"
                ? "Homeowner Reported"
                : "Unverified"}
            </span>
          </div>
        </div>

        {/* HVAC Modernization Gap */}
        <div
          className={`flex items-start gap-3 p-3 rounded-xl border ${
            isHighGap ? "bg-destructive/5 border-destructive/30" : "bg-surface border-border"
          }`}
        >
          {isHighGap ? (
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          ) : (
            <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">
              HVAC Modernization Gap
            </p>
            <p className={`text-base font-display font-bold ${isHighGap ? "text-destructive" : "text-foreground"}`}>
              {silenceYears !== null ? `${silenceYears} years` : "No permit on record"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lastPermitDate
                ? `Last HVAC permit: ${new Date(lastPermitDate).toLocaleDateString(undefined, { year: "numeric", month: "short" })}`
                : "No HVAC permits found in County records"}
            </p>
            {isHighGap && (
              <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                High Urgency
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
