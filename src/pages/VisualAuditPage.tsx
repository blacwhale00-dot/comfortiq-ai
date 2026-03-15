import { useState, useRef, useEffect } from "react";
import Layout from "@/components/Layout";
import ComfortAIChat from "@/components/ComfortAIChat";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Camera, Check, FileText, Zap, Thermometer, Fan, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface AuditMission {
  id: string;
  emoji: React.ReactNode;
  title: string;
  description: string;
  discount: number;
  uploadKey: "upload_outdoor" | "upload_breaker" | "upload_thermostat" | "upload_bill";
  highlight?: boolean;
  accept: string;
}

const missions: AuditMission[] = [
  {
    id: "outdoor",
    emoji: <Fan className="w-6 h-6" />,
    title: "Outdoor AC Unit",
    description: "Photo of the unit outside your home",
    discount: 250,
    uploadKey: "upload_outdoor",
    accept: "image/*",
  },
  {
    id: "breaker",
    emoji: <Zap className="w-6 h-6" />,
    title: "Breaker Panel",
    description: "Open panel showing circuit breakers",
    discount: 100,
    uploadKey: "upload_breaker",
    accept: "image/*",
  },
  {
    id: "thermostat",
    emoji: <Thermometer className="w-6 h-6" />,
    title: "Thermostat",
    description: "Current thermostat on the wall",
    discount: 50,
    uploadKey: "upload_thermostat",
    accept: "image/*",
  },
  {
    id: "bill",
    emoji: <FileText className="w-6 h-6" />,
    title: "Electric Bill",
    description: "Most recent utility bill (photo or PDF)",
    discount: 500,
    uploadKey: "upload_bill",
    highlight: true,
    accept: "image/*,.pdf",
  },
];

type UploadState = Record<string, { uploaded: boolean; url?: string; uploading?: boolean }>;

export default function VisualAuditPage() {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<UploadState>(() =>
    Object.fromEntries(missions.map((m) => [m.id, { uploaded: false }]))
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [roiReport, setRoiReport] = useState<any>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const sessionId = localStorage.getItem("comfortiq_session");

  const completedCount = Object.values(uploads).filter((u) => u.uploaded).length;
  const totalDiscount = missions
    .filter((m) => uploads[m.id]?.uploaded)
    .reduce((sum, m) => sum + m.discount, 0);
  const allComplete = completedCount === missions.length;
  const anyUploaded = completedCount > 0;

  // Fire confetti when all complete
  useEffect(() => {
    if (allComplete) {
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#0D7377", "#F4A261", "#10B981"],
        });
      }, 300);
    }
  }, [allComplete]);

  const handleFileSelect = async (missionId: string, file: File) => {
    if (!sessionId) return;

    const mission = missions.find((m) => m.id === missionId);
    if (!mission) return;

    // Set uploading state
    setUploads((prev) => ({
      ...prev,
      [missionId]: { ...prev[missionId], uploading: true },
    }));

    const filePath = `${sessionId}/${missionId}-${Date.now()}.${file.name.split(".").pop()}`;

    const { error: uploadError } = await supabase.storage
      .from("audit-uploads")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload failed:", uploadError);
      setUploads((prev) => ({
        ...prev,
        [missionId]: { uploaded: false, uploading: false },
      }));
      return;
    }

    const { data: urlData } = supabase.storage
      .from("audit-uploads")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update DB
    await supabase
      .from("quiz_sessions")
      .update({ [mission.uploadKey]: publicUrl } as any)
      .eq("id", sessionId);

    setUploads((prev) => ({
      ...prev,
      [missionId]: { uploaded: true, url: publicUrl, uploading: false },
    }));
  };

  const handleAnalyze = async () => {
    if (!sessionId) return;
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-audit", {
        body: { sessionId },
      });

      if (error) throw error;
      setRoiReport(data?.report || null);

      // Update DB with total discount
      await supabase
        .from("quiz_sessions")
        .update({
          total_discount_earned: totalDiscount,
          funnel_status: "audit_complete",
          roi_report: data?.report || null,
        } as any)
        .eq("id", sessionId);
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const isExpress = localStorage.getItem("comfortiq_express") === "true";

  const chatMessages = allComplete
    ? ["🎉 All uploads complete! You've unlocked the full $900 discount. Hit 'Generate ROI Report' to see your savings breakdown!"]
    : anyUploaded
      ? [`Great progress! ${completedCount}/4 uploaded. ${!uploads.bill?.uploaded ? "Don't forget the Electric Bill — it's worth $500 alone!" : "Keep going!"}`]
      : isExpress
        ? ["You've entered the Express Lane. Upload your photos and bill below for a prioritized Engineering Review."]
        : ["Welcome to Level 2! Upload photos of your equipment and electric bill to unlock up to $900 in savings. Start with any card below."];

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
              <p className="text-xs font-medium text-primary">{completedCount}/4 uploads</p>
            </div>
            <div className="w-full bg-border rounded-full h-2.5 overflow-hidden">
              <motion.div
                className="h-2.5 rounded-full gradient-teal"
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / 4) * 100}%` }}
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
              : "Upload 4 photos to unlock your personalized savings analysis and $900 discount"}
          </p>
        </div>

        {/* Savings Counter */}
        <div className="max-w-md mx-auto mb-10">
          <motion.div
            className="bg-background rounded-2xl shadow-card p-5 text-center"
            layout
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">
              Discount Unlocked
            </p>
            <motion.p
              key={totalDiscount}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-display font-extrabold text-primary"
            >
              ${totalDiscount}
              <span className="text-base font-normal text-muted-foreground"> / $900</span>
            </motion.p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Mission Cards */}
          <div className="lg:col-span-3 space-y-8">
            <div className="grid sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {missions.map((m, i) => {
                  const state = uploads[m.id];
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.4 }}
                      className={`relative rounded-2xl border-2 p-6 transition-all duration-300 ${
                        state?.uploaded
                          ? "border-primary bg-primary/5 shadow-card"
                          : m.highlight
                            ? "border-accent bg-accent/5 shadow-card-hover"
                            : "border-border bg-background shadow-card hover:shadow-card-hover"
                      }`}
                    >
                      {m.highlight && !state?.uploaded && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-amber text-primary-foreground text-xs font-bold whitespace-nowrap">
                          BIGGEST SAVINGS
                        </div>
                      )}
                      <div className="text-center">
                        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-3 ${
                          state?.uploaded
                            ? "bg-primary/10 text-primary"
                            : m.highlight
                              ? "bg-accent/10 text-accent"
                              : "bg-muted text-muted-foreground"
                        }`}>
                          {state?.uploaded ? <Check className="w-7 h-7" /> : m.emoji}
                        </div>
                        <h3 className="font-display font-bold text-foreground mb-0.5">{m.title}</h3>
                        <p className="text-xs text-muted-foreground mb-1">{m.description}</p>
                        <p className={`text-lg font-display font-extrabold mb-4 ${
                          state?.uploaded ? "text-primary" : m.highlight ? "text-accent" : "text-muted-foreground"
                        }`}>
                          ${m.discount} off
                        </p>

                        <input
                          type="file"
                          accept={m.accept}
                          className="hidden"
                          ref={(el) => { fileRefs.current[m.id] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(m.id, file);
                            e.target.value = "";
                          }}
                        />

                        {state?.uploaded ? (
                          <div className="flex items-center justify-center gap-2 text-primary text-sm font-medium">
                            <Check className="w-4 h-4" /> Uploaded
                          </div>
                        ) : state?.uploading ? (
                          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                          </div>
                        ) : (
                          <Button
                            variant={m.highlight ? "amber" : "outline"}
                            size="sm"
                            onClick={() => fileRefs.current[m.id]?.click()}
                          >
                            <Camera className="w-4 h-4" />
                            Upload Photo
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
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
                      ${totalDiscount} Discount Applied
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
              <ComfortAIChat contextMessages={chatMessages} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
