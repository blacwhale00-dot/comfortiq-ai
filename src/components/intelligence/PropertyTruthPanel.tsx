import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Building, Ruler, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SourceBadge, IntelligenceSource } from "./SourceBadge";
import { cn } from "@/lib/utils";

export interface PropertyTruthData {
  county_verified_sqft?: number | null;
  county_year_built?: number | null;
  homeowner_reported_sqft?: string | null;
  homeowner_reported_system_age?: number | null;
  source_sqft?: IntelligenceSource;
  source_year_built?: IntelligenceSource;
  sqft_locked?: boolean;
  year_built_locked?: boolean;
}

interface RowProps {
  icon: React.ReactNode;
  label: string;
  countyValue: React.ReactNode;
  homeownerValue: React.ReactNode;
  source: IntelligenceSource;
  locked?: boolean;
  mismatch?: boolean;
}

const TruthRow = ({ icon, label, countyValue, homeownerValue, source, locked, mismatch }: RowProps) => (
  <div className="rounded-lg border border-border bg-card p-4">
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="text-primary">{icon}</span>
        {label}
        {locked && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
            <Lock className="h-3 w-3" />
            Locked
          </span>
        )}
      </div>
      <SourceBadge source={source} />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">County Truth</div>
        <div className="text-base font-semibold text-foreground tabular-nums">{countyValue}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Homeowner Reported</div>
        <div className="text-base font-medium text-muted-foreground tabular-nums">{homeownerValue}</div>
      </div>
    </div>
    {mismatch && (
      <div className="mt-3 flex items-center gap-2 rounded-md bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
        Discrepancy detected — county record overrides homeowner input.
      </div>
    )}
  </div>
);

interface Props {
  data: PropertyTruthData;
}

export const PropertyTruthPanel = ({ data }: Props) => {
  const reportedSqftNum = data.homeowner_reported_sqft
    ? parseInt(data.homeowner_reported_sqft, 10)
    : NaN;
  const sqftMismatch =
    data.county_verified_sqft != null &&
    !Number.isNaN(reportedSqftNum) &&
    Math.abs(data.county_verified_sqft - reportedSqftNum) / data.county_verified_sqft > 0.1;

  const yearMismatch =
    data.county_year_built != null &&
    data.homeowner_reported_system_age != null &&
    Math.abs(
      new Date().getFullYear() - data.homeowner_reported_system_age - data.county_year_built,
    ) > 25;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Property Truth
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <TruthRow
          icon={<Ruler className="h-4 w-4" />}
          label="Square Footage"
          countyValue={
            data.county_verified_sqft
              ? `${Math.round(data.county_verified_sqft).toLocaleString()} sq ft`
              : "—"
          }
          homeownerValue={
            data.homeowner_reported_sqft ? `${data.homeowner_reported_sqft} sq ft` : "—"
          }
          source={data.source_sqft}
          locked={data.sqft_locked}
          mismatch={sqftMismatch}
        />
        <TruthRow
          icon={<Building className="h-4 w-4" />}
          label="Year Built"
          countyValue={data.county_year_built ?? "—"}
          homeownerValue={
            data.homeowner_reported_system_age
              ? `~${data.homeowner_reported_system_age} yr old system`
              : "—"
          }
          source={data.source_year_built}
          locked={data.year_built_locked}
          mismatch={yearMismatch}
        />
      </CardContent>
    </Card>
  );
};
