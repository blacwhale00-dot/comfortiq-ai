import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import IntentGate from "@/components/IntentGate";
import { AlertOctagon, TrendingDown, BadgeCheck, Gauge, ShieldCheck, Clock, Heart, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import guzzlerLogo from "@/assets/guzzler-score-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { UPLOAD_SLOTS, computeUploadProgress, type UploadSlotId } from "@/lib/upload-progress";
import { hasSeenEntryGate } from "@/lib/entry-intent";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const todayLabel = new Date().toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

type Module = {
  icon: typeof AlertOctagon;
  iconBg: string;
  iconColor: string;
  eyebrow: string;
  title: string;
  body: string;
  to: string;
};

const modules: Module[] = [
  {
    icon: AlertOctagon,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    eyebrow: "System Alert",
    title: "Action Required: High Guzzling Detected",
    body: "90° Day risk. A proactive fix could prevent an emergency.",
    to: "/quiz",
  },
  {
    icon: TrendingDown,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    eyebrow: "Bill Health",
    title: "Potential Savings Insight",
    body: "Your Guzzler Score is high, but your usage is proactive. Optimize now to maximize savings.",
    to: "/quiz",
  },
  {
    icon: BadgeCheck,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    eyebrow: "Pro-Blueprint",
    title: "Expert Blueprint by Will Macon",
    body: "Verified HVAC Architect with 20+ years of Atlanta experience. View your custom plan.",
    to: "/intelligence",
  },
  {
    icon: Gauge,
    iconBg: "bg-accent/15",
    iconColor: "text-accent",
    eyebrow: "Cost Impact Assessment",
    title: "Is Your System Guzzling?",
    body: "Uncover exactly where your HVAC system is leaking value — and how to stop it.",
    to: "/quiz",
  },
];

const trustItems = [
  { icon: ShieldCheck, text: "15 Years HVAC Expertise" },
  { icon: Clock, text: "Free Assessment" },
  { icon: Heart, text: "No Commitment Required" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const sessionId = useMemo(() => localStorage.getItem("comfortiq_session"), []);

  // The three intent doors are the entry moment. Show them once per browser
  // session to a fresh visitor (no session) immediately to avoid a flash of the
  // dashboard. Visitors with a session are resolved in the effect below: those
  // already scored skip the doors; unscored sessions still see them.
  const [showGate, setShowGate] = useState(() => !hasSeenEntryGate() && !sessionId);

  useEffect(() => {
    if (hasSeenEntryGate() || !sessionId) return;
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("quiz_sessions")
        .select("guzzler_score")
        .eq("id", sessionId)
        .maybeSingle();
      if (!active) return;
      // Already scored → past the doors; let them land on the dashboard.
      if (!error && data?.guzzler_score != null) return;
      setShowGate(true);
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  // A returning homeowner who finished the quiz but never reached GOLD is sent
  // to their closed-window results. Unscored sessions (quiz unfinished) and GOLD
  // sessions are left on the landing page untouched. Once per browser session
  // only — so after seeing it they can still browse home; a genuine later visit
  // (new session) shows it again.
  useEffect(() => {
    if (!sessionId) return;
    if (sessionStorage.getItem("comfortiq_incomplete_seen")) return;
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("quiz_sessions")
        .select(
          "guzzler_score, upload_outdoor, upload_breaker, upload_thermostat, upload_air_handler, upload_bill",
        )
        .eq("id", sessionId)
        .maybeSingle();
      if (!active || error || !data || data.guzzler_score == null) return;
      const uploaded = new Set<UploadSlotId>(
        UPLOAD_SLOTS.filter((s) => data[s.uploadKey]).map((s) => s.id),
      );
      if (computeUploadProgress(uploaded).isComplete) return;
      sessionStorage.setItem("comfortiq_incomplete_seen", "1");
      navigate("/incomplete", { replace: true });
    })();
    return () => {
      active = false;
    };
  }, [sessionId, navigate]);

  return (
    <Layout>
      {showGate && <IntentGate onDismiss={() => setShowGate(false)} />}

      {/* Page intro */}
      <section className="bg-background">
        <div className="container max-w-3xl text-center pt-6 pb-4">
          <h1 className="font-display font-extrabold text-2xl md:text-4xl text-foreground tracking-tight">
            Your HVAC Health, Simplified.
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            See your system's score and unlock personalized recommendations.
          </p>
        </div>
      </section>

      {/* Hero Score */}
      <section className="bg-background">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="container max-w-2xl flex flex-col items-center text-center pb-8"
        >
          <motion.div
            variants={fadeUp}
            className="w-full rounded-3xl border border-border bg-background shadow-card px-4 py-6 md:py-8"
          >
            <img
              src={guzzlerLogo}
              alt="The Guzzler Score — your home's HVAC efficiency rating"
              className="mx-auto w-full max-w-[340px] md:max-w-[420px] h-auto object-contain"
            />
            <h2 className="mt-5 font-display font-extrabold text-xl md:text-3xl text-foreground">
              Your Home's Guzzler Score
            </h2>
            <p className="mt-1 text-xs md:text-sm text-muted-foreground">
              Updated {todayLabel}
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Dashboard modules */}
      <section className="bg-background">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger}
          className="container max-w-3xl pb-10"
        >
          <motion.h3
            variants={fadeUp}
            className="font-display font-bold text-base text-foreground mb-3 px-1"
          >
            Your dashboard
          </motion.h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {modules.map((m) => (
              <motion.div key={m.title} variants={fadeUp}>
                <Link
                  to={m.to}
                  className="group block h-full rounded-2xl border border-border bg-background shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200 p-4 md:p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${m.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <m.icon className={`w-5 h-5 ${m.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                        {m.eyebrow}
                      </p>
                      <h4 className="font-display font-bold text-sm md:text-base text-foreground mt-0.5 leading-snug">
                        {m.title}
                      </h4>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        {m.body}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="bg-surface border-t border-border">
        <div className="container max-w-2xl py-10 md:py-14 text-center">
          <h2 className="font-display font-extrabold text-xl md:text-2xl text-foreground">
            Ready to see your score?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            It only takes 60 seconds — no commitment, no pressure.
          </p>
          <Button
            asChild
            size="xl"
            className="mt-6 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold tracking-wide"
          >
            <Link to="/quiz">BEGIN HVAC HEALTH ASSESSMENT HERE</Link>
          </Button>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            {trustItems.map((item) => (
              <div key={item.text} className="flex items-center gap-2 text-muted-foreground text-xs md:text-sm">
                <item.icon className="w-4 h-4 text-primary" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
