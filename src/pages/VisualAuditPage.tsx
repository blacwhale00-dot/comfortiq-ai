import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import ComfortAIChat from "@/components/ComfortAIChat";
import UploadSlot from "@/components/quiz/UploadSlot";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useAuditUpload } from "@/hooks/useAuditUpload";
import { UPLOAD_SLOTS } from "@/lib/upload-progress";

// Shape returned by the analyze-audit edge function.
interface RoiReport {
  summary: string;
  insights?: string[];
  estimatedSavings?: number;
  urgencyLevel?: "low" | "moderate" | "high" | "critical";
  recommendedTier?: "Good" | "Better" | "Best";
}

// "Level 2" visual audit. Shares the exact upload machinery as /unlock
// (useAuditUpload + the 5 UPLOAD_SLOTS), and layers an AI ROI report on top —
// that report is the only thing that makes this distinct from /unlock.
export default function VisualAuditPage() {
  const navigate = useNavigate();
  const sessionId = useMemo(() => localStorage.getItem("comfortiq_session"), []);

  const { slots, progress, handleFile } = useAuditUpload(sessionId);
  const [analyzing, setAnalyzing] = useState(false);
  const [roiReport, setRoiReport] = useState<RoiReport | null>(null);

  // No session means they skipped the quiz — send them back to start it.
  useEffect(() => {
    if (!sessionId) navigate("/quiz", { replace: true });
  }, [sessionId, navigate]);

  const anyUploaded = progress.uploadedCount > 0;
  const isExpress = localStorage.getItem("comfortiq_express") === "true";

  // Fire confetti when every slot is in.
  useEffect(() => {
    if (!progress.isComplete) return;
    const t = setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#0D7377", "#F4A261", "#10B981"],
      });
    }, 300);
    return () => clearTimeout(t);
  }, [progress.isComplete]);

  const handleAnalyze = async () => {
    if (!sessionId) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-audit", {
        body: { sessionId },
      });
      if (error) throw error;
      setRoiReport(data?.report || null);

      await supabase
        .from("quiz_sessions")
        .update({
          total_discount_earned: progress.unlockedValue,
          funnel_status: "audit_complete",
          roi_report: data?.report ?? null,
        })
        .eq("id", sessionId);
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Layout>
      {/* Progress Header */}
      <div className="bg-surface border-b border-border">
        <div className="container py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Level 2 — Visual Audit
              </p>
              <p className="text-xs font-medium text-primary">
                {progress.uploadedCount}/{progress.total} uploads
              </p>
            </div>
            <div className="w-full bg-border rounded-full h-2.5 overflow-hidden">
              <motion.div
                className="h-2.5 rounded-full gradient-teal"
                initial={{ width: 0 }}
                animate={{ width: `${(progress.uploadedCount / progress.total) * 100}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mb-2">
            Visual Audit & ROI Report
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {isExpress
              ? "You've entered the Express Lane. Upload your photos and bill below for a prioritized Engineering Review."
              : `Upload your equipment photos to unlock your personalized savings analysis and $${progress.maxValue} discount`}
          </p>
        </div>

        {/* Savings Counter */}
        <div className="max-w-md mx-auto mb-10">
          <motion.div className="bg-background rounded-2xl shadow-card p-5 text-center" layout>
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">
              Discount Unlocked
            </p>
            <motion.p
              key={progress.unlockedValue}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-display font-extrabold text-primary"
            >
              ${progress.unlockedValue}
              <span className="text-base font-normal text-muted-foreground"> / ${progress.maxValue}</span>
            </motion.p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Upload slots — shared with /unlock */}
          <div className="lg:col-span-3 space-y-8">
            <div className="space-y-3">
              {UPLOAD_SLOTS.map((slot, i) => (
                <UploadSlot
                  key={slot.id}
                  index={i}
                  id={slot.id}
                  title={slot.title}
                  instruction={slot.instruction}
                  value={slot.value}
                  accept={slot.accept}
                  trophy={slot.trophy}
                  uploaded={slots[slot.id].uploaded}
                  uploading={slots[slot.id].uploading}
                  onFile={(file) => handleFile(slot.id, file)}
                />
              ))}
            </div>

            {/* Analysis / CTA Section */}
            <AnimatePresence mode="wait">
              {roiReport ? (
                <motion.div
                  key="report"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* ROI Report Card */}
                  <div className="bg-background rounded-2xl shadow-elevated p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h3 className="font-display font-bold text-lg text-foreground">
                        Your ROI Analysis
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                      {roiReport.summary}
                    </p>

                    {roiReport.insights && (
                      <div className="space-y-3 mb-6">
                        {roiReport.insights.map((insight: string, i: number) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className="flex gap-3 text-sm text-foreground"
                          >
                            <span className="text-primary mt-0.5 shrink-0">✓</span>
                            {insight}
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {roiReport.estimatedSavings && (
                      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                          Estimated Annual Savings
                        </p>
                        <p className="text-3xl font-display font-extrabold text-primary">
                          ${roiReport.estimatedSavings}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Discount Badge */}
                  <div className="relative overflow-hidden rounded-2xl gradient-teal p-6 text-center">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15),transparent_60%)]" />
                    <Sparkles className="w-8 h-8 text-primary-foreground/80 mx-auto mb-2" />
                    <p className="text-2xl md:text-3xl font-display font-extrabold text-primary-foreground">
                      ${progress.unlockedValue} Discount Applied
                    </p>
                    <p className="text-sm text-primary-foreground/80 mt-1">
                      Automatically applied to your estimate
                    </p>
                  </div>

                  <div className="text-center">
                    <Button variant="hero" size="xl" onClick={() => navigate("/estimate")}>
                      View My Estimate
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="cta" className="text-center space-y-3">
                  <Button
                    variant="hero"
                    size="xl"
                    disabled={!anyUploaded || analyzing}
                    onClick={handleAnalyze}
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing Your Home...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate ROI Report
                      </>
                    )}
                  </Button>
                  {!anyUploaded && (
                    <p className="text-xs text-muted-foreground">
                      Upload at least one photo to get started
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* AI Chat Sidebar */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <ComfortAIChat />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
