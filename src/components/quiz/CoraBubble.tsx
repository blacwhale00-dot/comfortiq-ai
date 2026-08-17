import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import CoraMascot from "@/components/cora/CoraMascot";
import type { CoraState } from "@/components/cora/cora-states";

interface CoraBubbleProps {
  /** Latest reactive comment from Cora. Empty string = idle. */
  comment: string;
  /** Optional persistent footer line (e.g. progress hint). */
  hint?: string;
  /** Cora's animation state — scanning while the quiz is analyzing, etc. */
  state?: CoraState;
}

/**
 * Floating Cora assistant bubble. Appears in the bottom-right corner of the quiz
 * and animates in a fresh comment whenever `comment` changes.
 */
export default function CoraBubble({ comment, hint, state = "idle" }: CoraBubbleProps) {
  const [open, setOpen] = useState(true);
  const [visibleComment, setVisibleComment] = useState(comment);

  // Re-open on every new comment so the user always sees Cora react.
  useEffect(() => {
    if (!comment) return;
    setVisibleComment(comment);
    setOpen(true);
  }, [comment]);

  return (
    // The bottom offset clears the iOS home indicator; the width cap is
    // viewport-aware so the bubble can never push the page sideways on a narrow
    // phone. QuizPage reserves matching bottom padding so the bubble never
    // covers the primary CTA.
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] right-4 z-50 flex flex-col items-end gap-2 sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:right-6 max-w-[calc(100vw-2rem)]">
      <AnimatePresence>
        {open && visibleComment && (
          <motion.div
            key={visibleComment}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-[min(280px,calc(100vw-2rem))] sm:w-[320px] rounded-2xl bg-card shadow-elevated border border-border p-4 pr-8"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Dismiss Cora"
              className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-2 mb-1.5">
              <CoraMascot
                state={state}
                alt="Cora"
                className="h-6 w-6 rounded-full overflow-hidden flex-shrink-0 block"
              />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Cora · AI Advisor
              </span>
            </div>
            <p className="text-sm text-foreground leading-snug">{visibleComment}</p>
            {hint && (
              <p className="mt-2 text-[11px] text-muted-foreground italic">{hint}</p>
            )}
            {/* Tail */}
            <div className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 bg-card border-r border-b border-border" />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Hide Cora" : "Show Cora"}
        className="h-12 w-12 rounded-full gradient-teal shadow-elevated flex items-center justify-center hover:opacity-90 transition-opacity"
      >
        <MessageCircle className="h-5 w-5 text-primary-foreground" />
      </button>
    </div>
  );
}
