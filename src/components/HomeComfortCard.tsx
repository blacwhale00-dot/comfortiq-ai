import { motion } from "framer-motion";

const HeatWaves = () => (
  <g>
    {[0, 12, 24].map((x, i) => (
      <path
        key={i}
        d={`M${58 + x},28 Q${62 + x},22 ${58 + x},16 Q${54 + x},10 ${58 + x},4`}
        stroke="hsl(15, 80%, 55%)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity={0.7 + i * 0.1}
      />
    ))}
  </g>
);

const CoolWaves = () => (
  <g>
    {[0, 14, 28].map((x, i) => (
      <path
        key={i}
        d={`M${52 + x},12 C${56 + x},18 ${48 + x},24 ${52 + x},30 C${56 + x},36 ${48 + x},42 ${52 + x},48`}
        stroke="hsl(181, 82%, 30%)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity={0.5 + i * 0.15}
      />
    ))}
  </g>
);

const HouseOutline = ({ children }: { children: React.ReactNode }) => (
  <g>
    {/* Roof */}
    <path d="M20,45 L70,10 L120,45" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* Walls */}
    <rect x="30" y="45" width="80" height="60" rx="2" stroke="currentColor" strokeWidth="2.5" fill="hsl(0,0%,100%)" />
    {/* Door */}
    <rect x="60" y="80" width="20" height="25" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="76" cy="93" r="1.5" fill="currentColor" />
    {children}
  </g>
);

const OldAC = () => (
  <g transform="translate(36, 52)">
    <rect x="0" y="0" width="18" height="12" rx="2" stroke="hsl(215, 14%, 45%)" strokeWidth="1.5" fill="hsl(215, 14%, 85%)" />
    <line x1="3" y1="4" x2="15" y2="4" stroke="hsl(215, 14%, 55%)" strokeWidth="1" />
    <line x1="3" y1="7" x2="15" y2="7" stroke="hsl(215, 14%, 55%)" strokeWidth="1" />
    {/* Cracks / wear */}
    <path d="M16,1 L13,5 L15,6" stroke="hsl(0, 60%, 50%)" strokeWidth="0.8" fill="none" />
  </g>
);

const NewAC = () => (
  <g transform="translate(36, 52)">
    <rect x="0" y="0" width="18" height="12" rx="3" stroke="hsl(181, 82%, 25%)" strokeWidth="1.5" fill="hsl(181, 82%, 92%)" />
    <line x1="3" y1="4" x2="15" y2="4" stroke="hsl(181, 82%, 40%)" strokeWidth="1" strokeLinecap="round" />
    <line x1="3" y1="7" x2="15" y2="7" stroke="hsl(181, 82%, 40%)" strokeWidth="1" strokeLinecap="round" />
    <circle cx="9" cy="10" r="1" fill="hsl(181, 82%, 30%)" />
  </g>
);

const CostUp = () => (
  <g transform="translate(88, 50)">
    <text x="0" y="10" fontSize="14" fontWeight="bold" fill="hsl(0, 70%, 50%)" fontFamily="sans-serif">$</text>
    <path d="M14,12 L14,2 M11,5 L14,2 L17,5" stroke="hsl(0, 70%, 50%)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

const CostDown = () => (
  <g transform="translate(85, 50)">
    <path d="M0,4 L6,0 L12,4" stroke="hsl(181, 82%, 25%)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <text x="16" y="10" fontSize="14" fontWeight="bold" fill="hsl(181, 82%, 25%)" fontFamily="sans-serif">$</text>
    <path d="M30,2 L30,12 M27,9 L30,12 L33,9" stroke="hsl(181, 82%, 25%)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

export default function HomeComfortCard() {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } }}
      className="w-full max-w-lg mx-auto rounded-2xl bg-background border border-primary/20 p-6 shadow-card"
    >
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {/* Before */}
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 140 115" className="w-32 sm:w-40 text-muted-foreground" aria-label="Inefficient home with rising costs">
            <HouseOutline>
              <HeatWaves />
              <OldAC />
              <CostUp />
            </HouseOutline>
          </svg>
          <span className="text-xs font-medium text-destructive mt-1">Before</span>
        </div>

        {/* Arrow */}
        <svg viewBox="0 0 40 40" className="w-8 sm:w-10 flex-shrink-0" aria-hidden="true">
          <path d="M8,20 L30,20 M24,14 L30,20 L24,26" stroke="hsl(181, 82%, 25%)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* After */}
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 140 115" className="w-32 sm:w-40 text-primary" aria-label="Efficient home with savings">
            <HouseOutline>
              <CoolWaves />
              <NewAC />
              <CostDown />
            </HouseOutline>
          </svg>
          <span className="text-xs font-medium text-primary mt-1">After</span>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
        The right system + the right contractor = comfort and savings
      </p>
    </motion.div>
  );
}
