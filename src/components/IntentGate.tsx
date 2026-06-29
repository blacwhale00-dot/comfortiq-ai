import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Flame, Mail, ArrowRight, X } from "lucide-react";
import guzzlerLogo from "@/assets/guzzler-score-logo.png";
import { storeEntryIntent, markEntryGateSeen, type EntryIntent } from "@/lib/entry-intent";

// The three intent doors. Doors 1 & 2 go into the assessment; Door 3 goes to the
// newsletter. Order is the order shown.
type Door = {
  intent: EntryIntent;
  to: string;
  icon: typeof Search;
  iconClass: string;
  eyebrow: string;
  title: string;
  body: string;
};

const DOORS: Door[] = [
  {
    intent: "researching",
    to: "/quiz",
    icon: Search,
    iconClass: "bg-primary/10 text-primary",
    eyebrow: "Take your time",
    title: "I'm researching a replacement",
    body: "Exploring my options and gathering the facts before I decide.",
  },
  {
    intent: "ready_now",
    to: "/quiz",
    icon: Flame,
    iconClass: "bg-accent/15 text-accent",
    eyebrow: "Ready to move",
    title: "I'm ready to replace now",
    body: "My system is on its way out — I need a clear plan soon.",
  },
  {
    intent: "newsletter",
    to: "/newsletter",
    icon: Mail,
    iconClass: "bg-muted text-muted-foreground",
    eyebrow: "Stay in the loop",
    title: "Just curious for now",
    body: "Not ready yet — send me The Guzzler Score newsletter.",
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

/**
 * Full-screen entry chooser shown in front of the landing page. Picking a door
 * records the homeowner's intent and routes them (assessment or newsletter);
 * dismissing reveals the dashboard underneath.
 */
export default function IntentGate({ onDismiss }: { onDismiss: () => void }) {
  const navigate = useNavigate();

  const handleDismiss = useCallback(() => {
    markEntryGateSeen();
    onDismiss();
  }, [onDismiss]);

  const handleChoose = useCallback(
    (door: Door) => {
      storeEntryIntent(door.intent);
      markEntryGateSeen();
      navigate(door.to);
    },
    [navigate],
  );

  // Lock body scroll while the gate is open and allow Escape to dismiss.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [handleDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Where are you in your journey?"
      className="fixed inset-0 z-[100] overflow-y-auto bg-background"
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Skip and browse the site"
        className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={container}
        className="container max-w-2xl min-h-screen flex flex-col items-center justify-center py-12"
      >
        <motion.img
          variants={item}
          src={guzzlerLogo}
          alt="GuzzlerScore — HVAC efficiency rating"
          className="w-full max-w-[260px] h-auto object-contain"
        />

        <motion.h1
          variants={item}
          className="mt-6 text-center font-display font-extrabold text-2xl md:text-3xl text-foreground tracking-tight"
        >
          Know your score before you get a quote.
        </motion.h1>
        <motion.p variants={item} className="mt-2 text-center text-sm md:text-base text-muted-foreground">
          Tell us where you are — we'll take it from there. Free, in minutes, no pressure.
        </motion.p>

        <div className="mt-8 w-full grid grid-cols-1 gap-3">
          {DOORS.map((door) => (
            <motion.button
              key={door.intent}
              variants={item}
              type="button"
              onClick={() => handleChoose(door)}
              className="group w-full text-left rounded-2xl border border-border bg-background shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200 p-4 md:p-5"
            >
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${door.iconClass}`}>
                  <door.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{door.eyebrow}</p>
                  <h2 className="font-display font-bold text-base md:text-lg text-foreground leading-snug">
                    {door.title}
                  </h2>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5 leading-relaxed">{door.body}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            </motion.button>
          ))}
        </div>

        <motion.button
          variants={item}
          type="button"
          onClick={handleDismiss}
          className="mt-6 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          Just let me look around →
        </motion.button>
      </motion.div>
    </div>
  );
}
