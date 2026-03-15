import { motion } from "framer-motion";
import { CheckCircle, Sparkles, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReadinessProfile as ProfileType } from "./conciergeConfig";
import { useNavigate } from "react-router-dom";

interface ReadinessProfileProps {
  profile: ProfileType;
}

export default function ReadinessProfile({ profile }: ReadinessProfileProps) {
  const navigate = useNavigate();

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

  return (
    <div className="space-y-8">
      {/* Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-background rounded-2xl shadow-elevated p-6 md:p-8 text-center"
      >
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">
          Your Readiness Score
        </p>
        <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full border-4 ${ringColor} mb-4`}>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
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

      {/* Expert Summary */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
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
              transition={{ delay: 0.5 + i * 0.15, duration: 0.3 }}
              className="flex gap-3 text-sm text-foreground leading-relaxed"
            >
              <span className="text-primary mt-0.5 shrink-0">•</span>
              {bullet}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* $900 Credit Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl gradient-teal p-6 text-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15),transparent_60%)]" />
        <Sparkles className="w-8 h-8 text-primary-foreground/80 mx-auto mb-2" />
        <p className="text-2xl md:text-3xl font-display font-extrabold text-primary-foreground">
          $900 Credit Unlocked
        </p>
        <p className="text-sm text-primary-foreground/80 mt-1">
          Applied automatically when you continue to Level 2
        </p>
      </motion.div>

      {/* Level 2 Bridge */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.4 }}
        className="bg-background rounded-2xl shadow-card border border-border p-6 md:p-8 space-y-4"
      >
        <h3 className="text-xl md:text-2xl font-display font-extrabold text-foreground leading-tight">
          Unlock Your Full Savings Report & $900 Discount
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Level 1 gave us a gut-check. Level 2 (The Visual Audit) gives us the math.
          Upload 4 photos and your electric bill to see your ROI.
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={() => navigate("/estimate")}
          >
            Continue to Level 2 (Takes 3 mins)
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
        </div>
      </motion.div>
    </div>
  );
}
