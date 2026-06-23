import { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Trophy, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import ConciergeMessage from "@/components/quiz/ConciergeMessage";
import UnlockProgress from "@/components/quiz/UnlockProgress";
import { MAX_UNLOCK_VALUE } from "@/lib/guzzler-reveal";

// Book-a-free-audit destination from the Build Order.
const BOOK_AUDIT_URL = "https://app.smbsolution.ai/audit?ref=dma-8d24de6b";

export default function TrophyPage() {
  useEffect(() => {
    const t = setTimeout(() => {
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.5 },
        colors: ["#0D7377", "#F4A261", "#10B981", "#FFFFFF"],
      });
    }, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <Layout>
      <div className="container py-10 max-w-xl space-y-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 12 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full gradient-amber shadow-elevated"
        >
          <Trophy className="w-12 h-12 text-primary-foreground" />
        </motion.div>

        <div>
          <h1 className="font-display font-extrabold text-3xl text-foreground">You did it! 🏆</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            GOLD status unlocked — you've revealed your TRUE Guzzler Score.
          </p>
        </div>

        <UnlockProgress
          unlocked={MAX_UNLOCK_VALUE}
          max={MAX_UNLOCK_VALUE}
          caption="GOLD tier — full $900 unlocked"
        />

        <div className="text-left">
          <ConciergeMessage message="You did it! Your full Guzzler Score report is being generated. Want a real HVAC expert to review your results? Book a free 15-minute audit. 💚" />
        </div>

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
