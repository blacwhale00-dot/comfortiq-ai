import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Download, Facebook, Link2, MessageSquare, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  buildFacebookIntent,
  buildShareMessage,
  buildShareText,
  buildSmsIntent,
  buildXIntent,
  type ShareableScore,
} from "@/lib/share-score";
import { CARD_FILENAME, renderScoreCard } from "@/lib/share-card";

// "Share Your Score" — the post-reveal share card.
//
// Every destination is built by share-score.ts, which only ever sees score,
// grade and tier; nothing here reaches into the session, so no share can carry
// a homeowner's address, email, phone or session id. See that module's header
// for the full safety rationale.

interface ShareScoreProps {
  result: ShareableScore;
  /** Framer stagger delay, so this slots into a screen's existing sequence. */
  delay?: number;
}

type Feedback =
  | { kind: "copied" }
  | { kind: "caption-copied" }
  | { kind: "saved" }
  | { kind: "error"; message: string }
  | null;

const FEEDBACK_MS = 2600;

// The X glyph isn't in lucide, so it ships inline. currentColor keeps it in step
// with the button variant like every other icon here.
function XGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function ShareScore({ result, delay = 0.55 }: ShareScoreProps) {
  const isMobile = useIsMobile();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [cardReady, setCardReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `origin` is read at render time rather than baked in, so the same build
  // shares correct links from localhost, a preview deploy and production.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const message = buildShareMessage(result, origin, "copy");
  const previewText = buildShareText(result);

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  // Only offer the image affordances once we know a card can actually be drawn
  // (canvas can be unavailable or blocked). Probe once, quietly.
  useEffect(() => {
    let active = true;
    void renderScoreCard(result)
      .then((blob) => {
        // Only ever flip this on. Leaving it untouched when no card can be drawn
        // keeps the failure path a no-op rather than a state churn.
        if (active && blob) setCardReady(true);
      })
      .catch(() => {
        // The card is a bonus on top of the text share; its absence is not an error.
      });
    return () => {
      active = false;
    };
  }, [result]);

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );

  const flash = useCallback((next: Feedback) => {
    setFeedback(next);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), FEEDBACK_MS);
  }, []);

  // Clipboard API needs a secure context; fall back to the legacy path so "Copy
  // link" still works over plain http on a LAN preview.
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fall through to the textarea fallback
    }
    try {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(field);
      return ok;
    } catch {
      return false;
    }
  }, []);

  const openIntent = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    flash((await copyToClipboard(message))
      ? { kind: "copied" }
      : { kind: "error", message: "Couldn't copy — select the text above instead." });
  };

  const handleFacebook = async () => {
    // Facebook builds its preview from the destination's Open Graph tags and
    // ignores any caption we pass, so hand the homeowner their line to paste.
    await copyToClipboard(previewText);
    flash({ kind: "caption-copied" });
    openIntent(buildFacebookIntent(origin));
  };

  const handleSms = () => {
    // sms: links are blocked in some popup handlers — navigate instead of open.
    window.location.href = buildSmsIntent(result, origin);
  };

  const handleSaveCard = async () => {
    setBusy(true);
    try {
      const blob = await renderScoreCard(result);
      if (!blob) {
        flash({ kind: "error", message: "Couldn't build the card on this device." });
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = CARD_FILENAME;
      link.click();
      URL.revokeObjectURL(url);
      flash({ kind: "saved" });
    } finally {
      setBusy(false);
    }
  };

  // The OS share sheet is the best path on a phone — it reaches WhatsApp,
  // Messages, Instagram and everything else we can't deep-link. Attach the card
  // image when the platform accepts files, and fall back to text when it doesn't.
  const handleNativeShare = async () => {
    setBusy(true);
    try {
      const card = cardReady ? await renderScoreCard(result) : null;
      const file = card ? new File([card], CARD_FILENAME, { type: "image/png" }) : null;
      const payload: ShareData = { title: "My Guzzler Score", text: message };

      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ ...payload, files: [file] });
      } else {
        await navigator.share(payload);
      }
    } catch (err) {
      // AbortError just means they closed the sheet — not a failure.
      if (err instanceof Error && err.name !== "AbortError") {
        flash({ kind: "error", message: "Sharing isn't available right now." });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-background rounded-2xl shadow-card border border-border p-5 sm:p-6"
    >
      <div className="flex items-center gap-2 mb-1">
        <Share2 className="w-4 h-4 text-primary" />
        <h3 className="font-display font-bold text-foreground text-sm tracking-wide uppercase">
          Share Your Score
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Brag a little — or warn a friend. Your score only; never your address or contact details.
      </p>

      {/* What actually goes out. Showing it first is the honest version of a
          "safe" share — no surprises about what gets posted. */}
      <p className="mt-3 rounded-xl bg-surface border border-border px-4 py-3 text-sm text-foreground leading-relaxed">
        {previewText}
      </p>

      {isMobile && canNativeShare && (
        <Button
          variant="hero"
          className="w-full mt-4 tap-target"
          disabled={busy}
          onClick={handleNativeShare}
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="tap-target"
          onClick={() => openIntent(buildXIntent(result, origin))}
        >
          <XGlyph className="w-4 h-4" />
          Post on X
        </Button>

        <Button variant="outline" className="tap-target" onClick={handleFacebook}>
          <Facebook className="w-4 h-4" />
          Facebook
        </Button>

        <Button variant="outline" className="tap-target" onClick={handleSms}>
          <MessageSquare className="w-4 h-4" />
          Text it
        </Button>

        <Button variant="outline" className="tap-target" onClick={handleCopy}>
          {feedback?.kind === "copied" ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          {feedback?.kind === "copied" ? "Copied" : "Copy link"}
        </Button>
      </div>

      {cardReady && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full tap-target text-muted-foreground"
          disabled={busy}
          onClick={handleSaveCard}
        >
          <Download className="w-4 h-4" />
          Save score card
        </Button>
      )}

      {/* Single live region so a screen reader announces the outcome once. */}
      <p aria-live="polite" className="mt-2 min-h-[1rem] text-xs text-muted-foreground">
        {feedback?.kind === "copied" && "Link and message copied to your clipboard."}
        {feedback?.kind === "caption-copied" &&
          "Caption copied — paste it into your Facebook post."}
        {feedback?.kind === "saved" && "Score card saved to your downloads."}
        {feedback?.kind === "error" && (
          <span className="text-destructive">{feedback.message}</span>
        )}
      </p>
    </motion.div>
  );
}
