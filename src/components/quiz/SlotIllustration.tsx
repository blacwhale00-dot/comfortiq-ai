import type { SVGProps } from "react";
import type { UploadSlotId } from "@/lib/upload-progress";

// Simple line-art reference of what to photograph for each slot. Uses
// currentColor so it inherits the slot's accent tint, like the rest of the card.
const SHARED: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 48 48",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

interface SlotIllustrationProps {
  id: UploadSlotId;
  className?: string;
}

export default function SlotIllustration({ id, className }: SlotIllustrationProps) {
  switch (id) {
    case "outdoor": // Condenser: boxy unit with a fan
      return (
        <svg {...SHARED} className={className} aria-hidden="true">
          <rect x="7" y="14" width="34" height="22" rx="2" />
          <circle cx="24" cy="25" r="7" />
          <circle cx="24" cy="25" r="1.5" />
          <path d="M24 19.5v2M24 28.5v2M19.5 25h2M26.5 25h2" />
          <path d="M11 36v3M37 36v3" />
        </svg>
      );
    case "breaker": // Panel: door with two columns of breakers
      return (
        <svg {...SHARED} className={className} aria-hidden="true">
          <rect x="12" y="7" width="24" height="34" rx="2" />
          <path d="M24 11v26" />
          <path d="M16 16h4M28 16h4M16 22h4M28 22h4M16 28h4M28 28h4M16 34h4M28 34h4" />
        </svg>
      );
    case "thermostat": // Wall unit with a dial display
      return (
        <svg {...SHARED} className={className} aria-hidden="true">
          <rect x="11" y="9" width="26" height="26" rx="5" />
          <circle cx="24" cy="20" r="6" />
          <path d="M24 17v3l2 1" />
          <path d="M18 30h12" />
        </svg>
      );
    case "air_handler": // Tall indoor cabinet with grille + coil slats
      return (
        <svg {...SHARED} className={className} aria-hidden="true">
          <rect x="14" y="6" width="20" height="36" rx="2" />
          <path d="M18 11h12" />
          <path d="M14 18h20" />
          <path d="M18 25v10M24 25v10M30 25v10" />
        </svg>
      );
    case "bill": // Document with folded corner + lines
      return (
        <svg {...SHARED} className={className} aria-hidden="true">
          <path d="M16 7h11l5 5v29a1 1 0 0 1-1 1H16a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
          <path d="M27 7v5h5" />
          <path d="M19 19h10M19 24h10M19 29h7" />
        </svg>
      );
  }
}
