import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertOctagon, Clock } from "lucide-react";
import { SourceBadge, IntelligenceSource } from "./SourceBadge";
import { cn } from "@/lib/utils";

interface Props {
  permitLastHvacDate?: string | null;
  permitSilenceYears?: number | null;
  source?: IntelligenceSource;
}

const MAX_YEARS = 20;

export const SilenceIndicator = ({ permitLastHvacDate, permitSilenceYears, source }: Props) => {
  const years = permitSilenceYears ?? 0;
  const pct = Math.min(100, (years / MAX_YEARS) * 100);

  let status: { label: string; tone: string; ring: string; icon: typeof Clock } = {
    label: "Within Normal Range",
    tone: "text-primary",
    ring: "border-primary/30 bg-primary/5",
    icon: Activity,
  };

  if (years >= 12) {
    status = {
      label: "High Urgency",
      tone: "text-destructive",
      ring: "border-destructive/40 bg-destructive/5",
      icon: AlertOctagon,
    };
  } else if (years >= 7) {
    status = {
      label: "Watch Window",
      tone: "text-amber-foreground",
      ring: "border-accent/50 bg-accent/10",
      icon: Clock,
    };
  }

  const StatusIcon = status.icon;
  const formattedDate = permitLastHvacDate
    ? new Date(permitLastHvacDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No permit on record";

  return (
    <Card className={cn("shadow-card border", status.ring)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <StatusIcon className={cn("h-4 w-4", status.tone)} />
            Permit Silence Indicator
          </CardTitle>
          <SourceBadge source={source} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Years Since Last HVAC Permit
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-4xl font-bold tabular-nums font-display", status.tone)}>
                {permitSilenceYears != null ? years : "—"}
              </span>
              <span className="text-sm text-muted-foreground">years</span>
            </div>
          </div>
          <div
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
              status.ring,
              status.tone,
            )}
          >
            {status.label}
          </div>
        </div>

        <Progress
          value={pct}
          className={cn(
            "h-2",
            years >= 12 && "[&>div]:bg-destructive",
            years >= 7 && years < 12 && "[&>div]:bg-accent",
          )}
        />

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Last permit: <span className="text-foreground font-medium">{formattedDate}</span></span>
          <span className="tabular-nums">{MAX_YEARS}+ yr scale</span>
        </div>
      </CardContent>
    </Card>
  );
};
