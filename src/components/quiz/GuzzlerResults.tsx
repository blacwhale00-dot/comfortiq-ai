import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import GuzzlerScoreGauge from "./GuzzlerScoreGauge";
import GuzzlerEvidence from "./GuzzlerEvidence";
import CreditCertificate from "./CreditCertificate";

export interface GuzzlerResultsData {
  score: number;
  tier: "Mild" | "Moderate" | "High" | "Severe";
  yearBuilt: number | null;
  yearBuiltSource: "County" | "Homeowner" | "Unknown";
  silenceYears: number | null;
  lastPermitDate: string | null;
}

interface GuzzlerResultsProps {
  data: GuzzlerResultsData;
}

export default function GuzzlerResults({ data }: GuzzlerResultsProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <GuzzlerScoreGauge score={data.score} tier={data.tier} />

      <GuzzlerEvidence
        yearBuilt={data.yearBuilt}
        yearBuiltSource={data.yearBuiltSource}
        silenceYears={data.silenceYears}
        lastPermitDate={data.lastPermitDate}
      />

      <CreditCertificate />

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.4 }}
        className="bg-background rounded-2xl shadow-card border border-border p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-display font-extrabold text-foreground">
            Final Step: Photo Verification
          </h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Four quick photos of your equipment will finalize your credit and produce your rough estimate.
        </p>
        <Button
          variant="hero"
          size="xl"
          className="w-full"
          onClick={() => navigate("/audit")}
        >
          Proceed to Photo Upload
          <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>
    </div>
  );
}
