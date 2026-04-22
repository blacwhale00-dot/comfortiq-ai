import { motion } from "framer-motion";
import { Award, Lock } from "lucide-react";
import { useEffect } from "react";
import confetti from "canvas-confetti";

export default function CreditCertificate() {
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 75,
        origin: { y: 0.5 },
        colors: ["#0D9488", "#14B8A6", "#F59E0B", "#FFFFFF"],
      });
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, rotateX: -10 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl gradient-teal p-1 shadow-elevated"
    >
      {/* Inner certificate */}
      <div className="relative bg-background rounded-[14px] p-6 md:p-7">
        {/* Corner ornaments */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-primary/40 rounded-tl-md" />
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-primary/40 rounded-tr-md" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-primary/40 rounded-bl-md" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-primary/40 rounded-br-md" />

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full gradient-teal mb-3">
            <Award className="w-7 h-7 text-primary-foreground" />
          </div>

          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
            Certificate of Eligibility
          </p>

          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.0, type: "spring", stiffness: 180 }}
            className="text-5xl md:text-6xl font-display font-extrabold text-primary mb-1 tabular-nums"
          >
            $900
          </motion.p>

          <p className="text-base font-display font-bold text-foreground mb-3">
            Replacement Credit
          </p>

          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase">
            <Lock className="w-3.5 h-3.5" />
            Unlocked
          </div>

          <div className="mt-4 pt-4 border-t border-dashed border-border">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Earned by completing the ComfortIQ Readiness Assessment.
              Finalize with the Visual Audit to apply toward your install.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
