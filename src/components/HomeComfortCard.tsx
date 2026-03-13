import { motion } from "framer-motion";

const ModernHouse = ({ variant }: { variant: "before" | "after" }) => {
  const isBefore = variant === "before";
  const stroke = isBefore ? "hsl(215, 14%, 45%)" : "hsl(var(--primary))";
  const fill = isBefore ? "hsl(215, 14%, 96%)" : "hsl(181, 82%, 97%)";

  return (
    <g>
      {/* Main body */}
      <rect x="20" y="30" width="90" height="65" rx="3" stroke={stroke} strokeWidth="2" fill={fill} />
      {/* Flat/shed roof */}
      <path d="M16,30 L110,20 L114,30 L16,30 Z" fill={isBefore ? "hsl(215, 14%, 55%)" : "hsl(181, 82%, 30%)"} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />

      {/* Large window left */}
      <rect x="30" y="42" width="22" height="18" rx="1.5" stroke={stroke} strokeWidth="1.2" fill={isBefore ? "hsl(215, 14%, 88%)" : "hsl(181, 82%, 90%)"} />
      <line x1="41" y1="42" x2="41" y2="60" stroke={stroke} strokeWidth="0.8" />
      <line x1="30" y1="51" x2="52" y2="51" stroke={stroke} strokeWidth="0.8" />

      {/* Large window right */}
      <rect x="58" y="42" width="22" height="18" rx="1.5" stroke={stroke} strokeWidth="1.2" fill={isBefore ? "hsl(215, 14%, 88%)" : "hsl(181, 82%, 90%)"} />
      <line x1="69" y1="42" x2="69" y2="60" stroke={stroke} strokeWidth="0.8" />
      <line x1="58" y1="51" x2="80" y2="51" stroke={stroke} strokeWidth="0.8" />

      {/* Door */}
      <rect x="86" y="62" width="16" height="33" rx="1.5" stroke={stroke} strokeWidth="1.2" fill={isBefore ? "hsl(215, 14%, 80%)" : "hsl(181, 82%, 85%)"} />
      <circle cx="89" cy="80" r="1.2" fill={stroke} />

      {/* AC unit on side */}
      {isBefore ? (
        <g transform="translate(112, 55)">
          <rect x="0" y="0" width="14" height="22" rx="1" stroke="hsl(215, 14%, 50%)" strokeWidth="1.2" fill="hsl(215, 14%, 80%)" />
          <line x1="3" y1="5" x2="11" y2="5" stroke="hsl(215, 14%, 60%)" strokeWidth="0.8" />
          <line x1="3" y1="8" x2="11" y2="8" stroke="hsl(215, 14%, 60%)" strokeWidth="0.8" />
          <line x1="3" y1="11" x2="11" y2="11" stroke="hsl(215, 14%, 60%)" strokeWidth="0.8" />
          {/* Crack */}
          <path d="M12,1 L9,6 L11,8" stroke="hsl(0, 60%, 55%)" strokeWidth="0.7" fill="none" />
          <path d="M2,18 L5,15" stroke="hsl(0, 60%, 55%)" strokeWidth="0.7" fill="none" />
        </g>
      ) : (
        <g transform="translate(112, 58)">
          <rect x="0" y="0" width="14" height="18" rx="2.5" stroke="hsl(181, 82%, 25%)" strokeWidth="1.2" fill="hsl(181, 82%, 92%)" />
          <line x1="3" y1="5" x2="11" y2="5" stroke="hsl(181, 82%, 40%)" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="3" y1="8" x2="11" y2="8" stroke="hsl(181, 82%, 40%)" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="3" y1="11" x2="11" y2="11" stroke="hsl(181, 82%, 40%)" strokeWidth="0.8" strokeLinecap="round" />
          <circle cx="7" cy="15" r="1.2" fill="hsl(181, 82%, 30%)" />
        </g>
      )}

      {/* Top effects */}
      {isBefore ? (
        // Heat shimmer waves
        <g>
          {[0, 14, 28].map((x, i) => (
            <path
              key={i}
              d={`M${40 + x},18 Q${44 + x},12 ${40 + x},6 Q${36 + x},0 ${40 + x},-6`}
              stroke="hsl(15, 80%, 55%)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              opacity={0.5 + i * 0.15}
            />
          ))}
          {/* Flame icon */}
          <g transform="translate(42, 68)">
            <path d="M0,10 Q0,4 4,0 Q5,4 8,2 Q8,8 4,12 Q0,12 0,10Z" fill="hsl(25, 90%, 55%)" opacity="0.7" />
            <path d="M2,10 Q2,7 4,4 Q5,7 6,6 Q6,9 4,11 Q2,11 2,10Z" fill="hsl(40, 95%, 60%)" opacity="0.8" />
          </g>
        </g>
      ) : (
        // Cool flow lines
        <g>
          {[0, 16, 32].map((x, i) => (
            <path
              key={i}
              d={`M${35 + x},16 C${39 + x},10 ${31 + x},4 ${35 + x},-2`}
              stroke="hsl(181, 82%, 35%)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              opacity={0.4 + i * 0.2}
            />
          ))}
          {/* Snowflake / cool icon */}
          <g transform="translate(55, 66)">
            <line x1="5" y1="0" x2="5" y2="10" stroke="hsl(181, 82%, 35%)" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="0" y1="5" x2="10" y2="5" stroke="hsl(181, 82%, 35%)" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="hsl(181, 82%, 35%)" strokeWidth="1" strokeLinecap="round" />
            <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="hsl(181, 82%, 35%)" strokeWidth="1" strokeLinecap="round" />
          </g>
        </g>
      )}

      {/* Cost indicator */}
      {isBefore ? (
        <g transform="translate(34, 72)">
          <text x="0" y="12" fontSize="13" fontWeight="bold" fill="hsl(0, 70%, 50%)" fontFamily="sans-serif">$</text>
          <path d="M14,14 L14,4 M11,7 L14,4 L17,7" stroke="hsl(0, 70%, 50%)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : (
        <g transform="translate(34, 72)">
          <text x="0" y="12" fontSize="13" fontWeight="bold" fill="hsl(181, 82%, 25%)" fontFamily="sans-serif">$</text>
          <path d="M14,4 L14,14 M11,11 L14,14 L17,11" stroke="hsl(181, 82%, 25%)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
};

export default function HomeComfortCard() {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } }}
      className="w-full max-w-xl mx-auto rounded-2xl bg-background p-8 shadow-card"
      style={{
        border: "2px solid transparent",
        backgroundClip: "padding-box",
        backgroundImage: "linear-gradient(hsl(0 0% 100%), hsl(0 0% 100%)), linear-gradient(135deg, hsl(181 82% 45% / 0.4), hsl(181 82% 25% / 0.6))",
        backgroundOrigin: "border-box",
      }}
    >
      {/* Top label */}
      <p className="text-center text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-5">
        Before → After
      </p>

      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {/* Before */}
        <div className="flex flex-col items-center">
          <svg viewBox="-2 -10 140 110" className="w-36 sm:w-44" aria-label="Inefficient home with rising costs">
            <ModernHouse variant="before" />
          </svg>
          <span className="text-xs font-semibold text-destructive mt-1.5">Before</span>
        </div>

        {/* Arrow */}
        <svg viewBox="0 0 40 40" className="w-8 sm:w-10 flex-shrink-0" aria-hidden="true">
          <path d="M8,20 L30,20 M24,14 L30,20 L24,26" stroke="hsl(181, 82%, 25%)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* After */}
        <div className="flex flex-col items-center">
          <svg viewBox="-2 -10 140 110" className="w-36 sm:w-44" aria-label="Efficient home with savings">
            <ModernHouse variant="after" />
          </svg>
          <span className="text-xs font-semibold text-primary mt-1.5">After</span>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-5 leading-relaxed">
        The right system + the right contractor = comfort and savings
      </p>
    </motion.div>
  );
}
