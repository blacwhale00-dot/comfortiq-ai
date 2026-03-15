import { motion } from "framer-motion";
import comfortAvatar from "@/assets/comfort-avatar.png";

interface ConciergeMessageProps {
  message: string;
  isTyping?: boolean;
}

export default function ConciergeMessage({ message, isTyping }: ConciergeMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex gap-3 items-start"
    >
      <img
        src={comfortAvatar}
        alt="Comfort AI"
        className="w-10 h-10 rounded-full object-cover border-2 border-primary/20 flex-shrink-0 mt-0.5"
      />
      <div className="flex-1 rounded-2xl rounded-tl-md bg-primary/5 border border-primary/15 px-4 py-3">
        <p className="text-xs font-semibold text-primary mb-1">
          Comfort <span className="text-muted-foreground font-normal">— Your AI Home Advisor</span>
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
