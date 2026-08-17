import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import GuzzlerScoreGauge from "./GuzzlerScoreGauge";
import CategoryBreakdown from "./CategoryBreakdown";
import WasteSummary from "./WasteSummary";
import UnlockProgress from "./UnlockProgress";
import GuzzlerEvidence from "./GuzzlerEvidence";
import ConciergeMessage from "./ConciergeMessage";
import ShareScore from "./ShareScore";
import { bandForTier } from "@/lib/guzzler-band";

// The four factors the scoring engine actually weighs (src/lib/guzzler-score.ts).
// The reveal breakdown is built from these so the bars can never disagree with
// the headline score.
export type FactorKey = "systemAge" | "bills" | "homeAge" | "silence";

export interface FactorScore {
  key: FactorKey;
  severity: number; // 0–100 — this factor's contribution as a share of its max
}

// Base result produced by the scoring engine (src/lib/guzzler-score.ts).
export interface GuzzlerResultsData {
  score: number;
  tier: "Mild" | "Moderate" | "High" | "Severe";
  factorScores: FactorScore[];
  yearBuilt: number | null;
  yearBuiltSource: "County" | "Homeowner" | "Unknown";
  silenceYears: number | null;
  lastPermitDate: string | null;
}

export interface CategoryScore {
  key: FactorKey;
  label: string;
  score: number; // 0–100, higher = more waste
  grade: string;
}

// Engine result plus the presentation-layer extras derived for the score reveal
// (see src/lib/guzzler-reveal.ts). Kept separate so the engine stays untouched.
export interface GuzzlerRevealData extends GuzzlerResultsData {
  grade: string;
  monthlyWaste: number;
  categories: CategoryScore[];
  topDrivers: string[];
  unlockedValue: number;
  maxValue: number;
}

interface GuzzlerResultsProps {
  data: GuzzlerRevealData;
}

export default function GuzzlerResults({ data }: GuzzlerResultsProps) {
  const navigate = useNavigate();

  const coraMessage = `Great job! You just unlocked $${data.unlockedValue} toward your Home Efficiency Discount. Upload photos of your AC equipment to unlock more — it takes 2 minutes and each photo adds value. 📸`;

  return (
    <div className="space-y-6">
      <GuzzlerScoreGauge score={data.score} grade={data.grade} tier={data.tier} />

      <CategoryBreakdown categories={data.categories} />

      <WasteSummary monthlyWaste={data.monthlyWaste} drivers={data.topDrivers} tier={data.tier} />

      <UnlockProgress unlocked={data.unlockedValue} max={data.maxValue} />

      {/* The mascot IS the score moment. The band is derived from the tier —
          NOT from bandForScore — so the needle and arc glow can never disagree
          with the gauge above it. See src/lib/guzzler-band.ts for why. */}
      <ConciergeMessage
        message={coraMessage}
        coraState="score_reveal"
        coraBand={bandForTier(data.tier)}
      />

      {/* CTA — opens the photo upload flow */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Button
          variant="hero"
          size="xl"
          className="w-full"
          onClick={() => navigate("/unlock")}
        >
          Unlock More Value
          <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Share sits below the CTA on purpose: the reveal's job is still to move
          the homeowner into the photo upload, so bragging never outranks it.
          Only score/grade/tier are passed — see src/lib/share-score.ts. */}
      <ShareScore result={{ score: data.score, grade: data.grade, tier: data.tier }} />

      <GuzzlerEvidence
        yearBuilt={data.yearBuilt}
        yearBuiltSource={data.yearBuiltSource}
        silenceYears={data.silenceYears}
        lastPermitDate={data.lastPermitDate}
      />
    </div>
  );
}
