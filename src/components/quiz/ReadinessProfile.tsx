import { motion } from "framer-motion";
import { CheckCircle, Sparkles, ArrowRight, Mail, Camera, Zap, Thermometer, CircuitBoard, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReadinessProfile as ProfileType } from "./conciergeConfig";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface ReadinessProfileProps {
  profile: ProfileType;
}

const auditSteps = [
  { icon: Zap, label: "Outdoor AC Unit", desc: "Snap the model/serial label", discount: "$250" },
  { icon: Thermometer, label: "Thermostat", desc: "Show the current display", discount: "$50" },
  { icon: CircuitBoard, label: "Breaker Panel", desc: "Open the panel door & snap", discount: "$100" },
  { icon: Receipt, label: "Electric Bill", desc: "Upload a recent bill for ROI math", discount: "$500" },
];

export default function ReadinessProfile({ profile }: ReadinessProfileProps) {
  const navigate = useNavigate();

  useEffect(() => {
    // Fire celebration confetti
    const timer = setTimeout(() => {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#0D9488", "#14B8A6", "#F59E0B"] });
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const scoreColor =
    profile.color === "red"
      ? "text-destructive"
      : profile.color === "amber"
      ? "text-amber"
      : "text-primary";

  const ringColor =
    profile.color === "red"
      ? "border-destructive/30"
      : profile.color === "amber"
      ? "border-amber/30"
      : "border-primary/30";

  const ringGlow =
    profile.color === "red"
      ? "shadow-[0_0_30px_rgba(239,68,68,0.2)]"
      : profile.color === "amber"
      ? "shadow-[0_0_30px_rgba(245,158,11,0.2)]"
      : "shadow-[0_0_30px_rgba(13,148,136,0.2)]";

  return (
    <div className="space-y-6">
      {/* Success Celebration Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center py-2"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold mb-3"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Results Unlocked
        </motion.div>
      </motion.div>

      {/* Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-background rounded-2xl shadow-elevated p-6 md:p-8 text-center"
      >
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">
          Your Readiness Score
        </p>
        <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full border-4 ${ringColor} ${ringGlow} mb-4`}>
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5, type: "spring" }}
            className={`text-5xl font-display font-extrabold ${scoreColor}`}
          >
            {profile.score}
          </motion.span>
        </div>
        <h2 className="text-2xl md:text-3xl font-display font-extrabold text-foreground mb-1">
          {profile.title}
        </h2>
        <p className="text-sm text-muted-foreground">{profile.subtitle}</p>
      </motion.div>

      {/* $900 Credit Badge */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl gradient-teal p-5 text-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative z-10 flex items-center justify-center gap-3">
          <div className="shrink-0 w-14 h-14 rounded-xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center">
            <span className="text-2xl font-display font-extrabold text-primary-foreground">$900</span>
          </div>
          <div className="text-left">
            <p className="text-base font-display font-bold text-primary-foreground">Credit Unlocked</p>
            <p className="text-xs text-primary-foreground/70">Complete the Visual Audit to claim</p>
          </div>
        </div>
      </motion.div>

      {/* Expert Summary */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="bg-background rounded-2xl shadow-card p-6"
      >
        <h3 className="font-display font-bold text-foreground text-sm mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-primary" />
          Expert Summary
        </h3>
        <ul className="space-y-3">
          {profile.bullets.map((bullet, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.15, duration: 0.3 }}
              className="flex gap-3 text-sm text-foreground leading-relaxed"
            >
              <span className="text-primary mt-0.5 shrink-0">•</span>
              {bullet}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Level 2 CTA with Photo Coaching */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4 }}
        className="bg-background rounded-2xl shadow-card border border-border p-6 space-y-5"
      >
        <div className="flex items-center gap-2 mb-1">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-display font-extrabold text-foreground">
            Start Your Visual Audit
          </h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Level 1 gave us a gut-check. Level 2 gives us the <strong className="text-foreground">math</strong>. Upload 4 quick photos to unlock your full ROI report.
        </p>

        {/* Photo coaching steps */}
        <div className="grid grid-cols-2 gap-3">
          {auditSteps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 + i * 0.1, duration: 0.3 }}
              className="bg-surface rounded-xl p-3 border border-border"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <step.icon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-bold text-foreground truncate">{step.label}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">{step.desc}</p>
              <span className="inline-block mt-1.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                +{step.discount}
              </span>
            </motion.div>
          ))}
        </div>

        <Button
          variant="hero"
          size="xl"
          className="w-full"
          onClick={() => navigate("/audit")}
        >
          Start Visual Audit — Claim $900
          <ArrowRight className="w-5 h-5" />
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-full"
        >
          <Mail className="w-4 h-4" />
          Email my basic summary for now
        </Button>
      </motion.div>
    </div>
  );
}
