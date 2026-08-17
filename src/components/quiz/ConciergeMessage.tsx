import { motion } from "framer-motion";
import CoraMascot from "@/components/cora/CoraMascot";
import type { CoraState } from "@/components/cora/cora-states";
import type { GuzzlerBand } from "@/lib/guzzler-band";

interface ConciergeMessageProps {
  message: string;
  isTyping?: boolean;
  /**
   * Cora's animation state. Defaults to idle; `isTyping` overrides it with
   * scanning, since a typing indicator IS Cora processing.
   */
  coraState?: CoraState;
  /** Only meaningful on the score reveal — see CoraMascot's band prop. */
  coraBand?: GuzzlerBand | null;
}

export default function ConciergeMessage({
  message,
  isTyping,
  coraState = "idle",
  coraBand = null,
}: ConciergeMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex gap-3 items-start"
    >
      <CoraMascot
        state={isTyping ? "scanning" : coraState}
        band={coraBand}
        alt="Cora"
        className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 flex-shrink-0 mt-0.5 block"
      />
      <div className="flex-1 rounded-2xl rounded-tl-md bg-primary/5 border border-primary/15 px-4 py-3">
        <p className="text-xs font-semibold text-primary mb-1">
          Cora <span className="text-muted-foreground font-normal">— Your GuzzlerScore Guide</span>
        </p>
        {isTyping ? (
          <div className="flex gap-1.5 py-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary/40"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground leading-relaxed">{message}</p>
        )}
      </div>
    </motion.div>
  );
}
