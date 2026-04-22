import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Database, FileSearch, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type IntelligenceSource = "County" | "Shovels" | "Zillow" | "EDS" | null | undefined;

interface SourceBadgeProps {
  source: IntelligenceSource;
  className?: string;
}

const SOURCE_META: Record<
  Exclude<IntelligenceSource, null | undefined>,
  { label: string; icon: typeof ShieldCheck; tone: string }
> = {
  County: {
    label: "Official County Record",
    icon: ShieldCheck,
    tone: "bg-primary/10 text-primary border-primary/30",
  },
  Shovels: {
    label: "Permit Index (Shovels)",
    icon: FileSearch,
    tone: "bg-primary/10 text-primary border-primary/30",
  },
  EDS: {
    label: "Energy Data Service",
    icon: Database,
    tone: "bg-accent/15 text-amber-foreground border-accent/40",
  },
  Zillow: {
    label: "Public Fallback (Zillow)",
    icon: Building2,
    tone: "bg-muted text-muted-foreground border-border",
  },
};

export const SourceBadge = ({ source, className }: SourceBadgeProps) => {
  if (!source) {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1 text-[10px] font-medium border-dashed text-muted-foreground", className)}
      >
        Unverified
      </Badge>
    );
  }
  const meta = SOURCE_META[source];
  const Icon = meta.icon;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 text-[10px] font-medium border", meta.tone, className)}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
};
