import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import ConciergeMessage from "@/components/quiz/ConciergeMessage";
import UnlockProgress from "@/components/quiz/UnlockProgress";
import GuzzlerScoreGauge from "@/components/quiz/GuzzlerScoreGauge";
import { supabase } from "@/integrations/supabase/client";
import {
  UPLOAD_SLOTS,
  computeUploadProgress,
  type UploadProgress,
  type UploadSlotId,
} from "@/lib/upload-progress";
import { tierForScore } from "@/lib/guzzler-score";
import { gradeForScore } from "@/lib/guzzler-reveal";

// Book-a-free-audit destination from the Build Order. Same link as the trophy
// screen — the audit offer survives even when the discount window doesn't.
const BOOK_AUDIT_URL = "https://app.smbsolution.ai/audit?ref=dma-8d24de6b";

// Exact Cora copy for Screen 5 (Incomplete Funnel) from the Build Order.
const CORA_EXPIRED_MESSAGE =
  "Your discount window has closed, but a real HVAC expert will still review your results. You'll hear from us soon. 💚";

interface LoadedState {
  score: number | null;
  progress: UploadProgress;
}

// The partial / expired funnel state, shown to homeowners who finished the quiz
// but never reached GOLD (900/900). Driven entirely by the persisted score and
// the upload DataTier — no PDF is generated here (GOLD-only, per the spec).
export default function IncompletePage() {
  const navigate = useNavigate();
  const sessionId = useMemo(() => localStorage.getItem("comfortiq_session"), []);
  const [state, setState] = useState<LoadedState | null>(null);

  useEffect(() => {
    if (!sessionId) {
      navigate("/quiz", { replace: true });
      return;
    }
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("quiz_sessions")
        .select(
          "guzzler_score, upload_outdoor, upload_breaker, upload_thermostat, upload_air_handler, upload_bill",
        )
        .eq("id", sessionId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        navigate("/quiz", { replace: true });
        return;
      }

      const uploaded = new Set<UploadSlotId>(
        UPLOAD_SLOTS.filter((s) => data[s.uploadKey]).map((s) => s.id),
      );
      const progress = computeUploadProgress(uploaded);

      // A homeowner who actually reached GOLD belongs on the trophy screen, not
      // the closed-window one.
      if (progress.isComplete) {
        navigate("/trophy", { replace: true });
        return;
      }

      setState({ score: data.guzzler_score, progress });
    })();
    return () => {
      active = false;
    };
  }, [sessionId, navigate]);

  if (!state) {
    return (
      <Layout>
        <div className="container py-16 text-center text-sm text-muted-foreground">
          Loading your results…
        </div>
      </Layout>
    );
  }

  const { score, progress } = state;

  return (
    <Layout>
      <div className="container py-10 max-w-xl space-y-6">
        <div className="text-center">
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-foreground">
            Your GuzzlerScore Results
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Here's where your home assessment landed.
          </p>
        </div>

        {/* Score + grade stay visible even though the window has closed. */}
        {score != null && (
          <GuzzlerScoreGauge score={score} grade={gradeForScore(score)} tier={tierForScore(score)} />
        )}

        {/* Progress bar locked at whatever tier they reached. */}
        <UnlockProgress
          unlocked={progress.unlockedValue}
          max={progress.maxValue}
          caption={`Locked at ${progress.dataTier} tier`}
        />

        <ConciergeMessage message={CORA_EXPIRED_MESSAGE} />

        {/* Audit CTA stays available; no PDF is generated for non-GOLD. */}
        <Button asChild variant="hero" size="xl" className="w-full">
          <a href={BOOK_AUDIT_URL} target="_blank" rel="noopener noreferrer">
            Book Your Free Audit
            <ArrowRight className="w-5 h-5" />
          </a>
        </Button>
      </div>
    </Layout>
  );
}
