import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeadIntelligencePanel, PropertyIntelligence } from "@/components/intelligence/LeadIntelligencePanel";
import { Loader2, Database, FlaskConical } from "lucide-react";
import Layout from "@/components/Layout";

type IntelRow = Tables<"property_intelligence">;

// Demo / fallback record so the panel renders even before any enrichment data exists.
const DEMO_INTEL: PropertyIntelligence = {
  street_address: "1428 Magnolia Ridge Dr",
  city: "Marietta",
  state: "GA",
  zip_code: "30062",
  county_verified_sqft: 2840,
  county_year_built: 2003,
  homeowner_reported_sqft: "2500",
  homeowner_reported_system_age: 18,
  permit_last_hvac_date: "2009-06-14",
  permit_silence_years: new Date().getFullYear() - 2009,
  enrichment_confidence: 0.92,
  confidence_tier: "High",
  primary_source: "County",
  source_sqft: "County",
  source_year_built: "County",
  source_permit: "Shovels",
  sqft_locked: true,
  year_built_locked: true,
};

const IntelligencePage = () => {
  const [rows, setRows] = useState<IntelRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("property_intelligence")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);
      if (!active) return;
      if (error) {
        console.error("[IntelligencePage] fetch error", error);
      }
      const list = data ?? [];
      setRows(list);
      if (list.length === 0) {
        setShowDemo(true);
      } else {
        setSelectedId(list[0].id);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const selected = useMemo<PropertyIntelligence | null>(() => {
    if (showDemo) return DEMO_INTEL;
    const row = rows.find((r) => r.id === selectedId);
    if (!row) return null;
    return row as unknown as PropertyIntelligence;
  }, [rows, selectedId, showDemo]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Mission Control
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Intelligence Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Property enrichment, truth hierarchy, and evidence-based empathy.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDemo((v) => !v)}
            className="gap-2"
          >
            <FlaskConical className="h-4 w-4" />
            {showDemo ? "View live records" : "Load demo brief"}
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="shadow-card h-fit">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Database className="h-3.5 w-3.5" />
                Enriched Leads ({rows.length})
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : rows.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  No enrichment records yet. Showing demo brief.
                </p>
              ) : (
                <ul className="space-y-1">
                  {rows.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => {
                          setSelectedId(r.id);
                          setShowDemo(false);
                        }}
                        className={`w-full text-left rounded-md px-2 py-2 text-sm transition-colors ${
                          !showDemo && selectedId === r.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <div className="truncate">{r.street_address ?? "Unknown"}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {r.confidence_tier ?? "—"} · {r.primary_source ?? "—"}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div>
            {selected ? (
              <LeadIntelligencePanel intel={selected} />
            ) : (
              <Card className="shadow-card">
                <CardContent className="p-10 text-center text-muted-foreground">
                  Select a lead to view the intelligence brief.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default IntelligencePage;
