import { Card, CardContent } from "@/components/ui/card";
import { Radio } from "lucide-react";
import { PropertyTruthPanel, PropertyTruthData } from "./PropertyTruthPanel";
import { SilenceIndicator } from "./SilenceIndicator";
import { CoraPreviewBox } from "./CoraPreviewBox";
import { IntelligenceSource } from "./SourceBadge";

export interface PropertyIntelligence extends PropertyTruthData {
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  permit_last_hvac_date?: string | null;
  permit_silence_years?: number | null;
  enrichment_confidence?: number | null;
  confidence_tier?: string | null;
  primary_source?: IntelligenceSource;
  source_permit?: IntelligenceSource;
}

interface Props {
  intel: PropertyIntelligence;
  homeownerName?: string;
}

export const LeadIntelligencePanel = ({ intel, homeownerName }: Props) => {
  const confidencePct = Math.round(((intel.enrichment_confidence ?? 0) * 100));
  const tier = intel.confidence_tier ?? "Low";

  return (
    <div className="space-y-4">
      {/* Mission Control header */}
      <Card className="shadow-card border-primary/20 bg-gradient-to-r from-primary/[0.04] via-card to-accent/[0.04]">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                Lead Intelligence Brief
              </div>
              <h2 className="mt-1 font-display text-xl font-bold text-foreground">
                {homeownerName ? `${homeownerName} — ` : ""}
                {intel.street_address ?? "Unknown address"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {[intel.city, intel.state, intel.zip_code].filter(Boolean).join(", ")}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Enrichment Confidence
                </div>
                <div className="flex items-baseline gap-2 justify-end">
                  <span className="text-2xl font-bold tabular-nums text-foreground font-display">
                    {confidencePct}%
                  </span>
                  <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {tier}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Primary Source
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {intel.primary_source ?? "Unverified"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <PropertyTruthPanel data={intel} />
        <SilenceIndicator
          permitLastHvacDate={intel.permit_last_hvac_date}
          permitSilenceYears={intel.permit_silence_years}
          source={intel.source_permit}
        />
      </div>

      <CoraPreviewBox
        inputs={{
          countyYearBuilt: intel.county_year_built,
          permitLastHvacDate: intel.permit_last_hvac_date,
          permitSilenceYears: intel.permit_silence_years,
          countyVerifiedSqft: intel.county_verified_sqft,
          homeownerReportedSqft: intel.homeowner_reported_sqft,
          confidenceTier: intel.confidence_tier as "High" | "Medium" | "Low" | null,
        }}
      />
    </div>
  );
};
