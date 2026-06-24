import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Trophy, ArrowRight, Mail, CheckCircle2, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConciergeMessage from "@/components/quiz/ConciergeMessage";
import UnlockProgress from "@/components/quiz/UnlockProgress";
import { MAX_UNLOCK_VALUE } from "@/lib/guzzler-reveal";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";

// Book-a-free-audit destination from the Build Order.
const BOOK_AUDIT_URL = "https://app.smbsolution.ai/audit?ref=dma-8d24de6b";

// Basic email format check — one @, a domain, and a dotted TLD.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Stage = "capture" | "sending" | "confirmed";

export default function TrophyPage() {
  const sessionId = useMemo(() => localStorage.getItem("comfortiq_session"), []);

  const [stage, setStage] = useState<Stage>("capture");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());
  const showError = touched && !emailValid;

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

  // Pre-fill with the email already captured at the quiz gate so we don't ask
  // a returning homeowner to re-type what we have. They can still edit it.
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("quiz_sessions")
        .select("email")
        .eq("id", sessionId)
        .maybeSingle();
      if (!active || error || !data?.email) return;
      setEmail((prev) => prev || data.email!);
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const handleSend = async () => {
    setTouched(true);
    if (!emailValid || stage === "sending") return;

    setStage("sending");

    // MVP handoff: persist the report email + flag the session so a real
    // PDF/email backend can pick it up later. We don't block the confirmation
    // on the DB write — the lead has done their part.
    if (sessionId) {
      const update: TablesUpdate<"quiz_sessions"> = {
        email: email.trim(),
        funnel_status: "report_requested",
      };
      try {
        await supabase.from("quiz_sessions").update(update).eq("id", sessionId);
      } catch (err) {
        console.error("Failed to save report email:", err);
      }
    }

    setStage("confirmed");
  };

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

        {stage !== "confirmed" ? (
          <>
            <div className="text-left">
              <ConciergeMessage message="You did it! 🎉 I'm putting together your full Guzzler Score report right now. Where should I send it? Drop your email below and it'll land in your inbox shortly. 💚" />
            </div>

            <div className="text-left space-y-2">
              <label htmlFor="report-email" className="text-sm font-medium text-foreground">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="report-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  disabled={stage === "sending"}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend();
                  }}
                  aria-invalid={showError}
                  className="pl-9"
                />
              </div>
              {showError && (
                <p className="text-xs text-destructive">Please enter a valid email address.</p>
              )}
            </div>

            <Button
              variant="hero"
              size="xl"
              className="w-full"
              disabled={!emailValid || stage === "sending"}
              onClick={handleSend}
            >
              {stage === "sending" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Send My Report
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-primary/5 border border-primary/20 p-6">
              <CheckCircle2 className="w-10 h-10 text-primary" />
              <p className="font-display font-bold text-lg text-foreground">Report on its way!</p>
              <p className="text-sm text-muted-foreground">
                We're generating your full Guzzler Score report and sending it to{" "}
                <span className="font-medium text-foreground">{email.trim()}</span>. Check your
                inbox in the next few minutes.
              </p>
            </div>

            <div className="text-left">
              <ConciergeMessage message="While that's cooking — want a real HVAC expert to walk through your results with you? Book a free 15-minute audit. No pressure, just answers. 💚" />
            </div>

            <Button asChild variant="hero" size="xl" className="w-full">
              <a href={BOOK_AUDIT_URL} target="_blank" rel="noopener noreferrer">
                Book Your Free Audit
                <ArrowRight className="w-5 h-5" />
              </a>
            </Button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
