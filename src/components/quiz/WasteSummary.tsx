import { motion } from "framer-motion";
import { TrendingDown } from "lucide-react";
import { TIER_PRESENTATION, type GuzzlerTier } from "./guzzler-tiers";

interface WasteSummaryProps {
  monthlyWaste: number;
  drivers: string[];
  tier: GuzzlerTier;
}

export default function WasteSummary({ monthlyWaste, drivers, tier }: WasteSummaryProps) {
  const tone = TIER_PRESENTATION[tier];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      className="bg-background rounded-2xl shadow-card border border-border p-6 space-y-5"
    >
      {/* Monthly waste estimate */}
      <div className={`rounded-xl border p-4 text-center ${tone.box}`}>
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1 flex items-center justify-center gap-1.5">
          <TrendingDown className={`w-3.5 h-3.5 ${tone.text}`} />
          Estimated Monthly Waste
        </p>
        <p className={`text-4xl font-display font-extrabold tabular-nums ${tone.text}`}>
          ${monthlyWaste}
          <span className="text-base font-normal text-muted-foreground">/mo</span>
        </p>
      </div>

      {/* Top waste drivers */}
      {drivers.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-foreground text-sm mb-3 tracking-wide uppercase">
            Top Waste Drivers
          </h3>
          <ul className="space-y-2">
            {drivers.map((d, i) => (
              <motion.li
                key={d}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.12 }}
                className="flex items-start gap-2.5 text-sm text-foreground"
              >
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5 ${tone.chip}`}>
                  {i + 1}
                </span>
                {d}
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
