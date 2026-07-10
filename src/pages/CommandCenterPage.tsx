import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, Flame, Phone, Trophy, Users } from "lucide-react";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  buildDailyStats,
  buildFunnelSteps,
  buildRecoveryQueue,
  buildSourceBreakdown,
  stageRank,
  type SessionSummary,
} from "@/lib/command-center";

// D.A.V.E. — the CRM command center. Internal-only route (not linked from the
// consumer funnel). Reads quiz_sessions through the same anon client the funnel
// writes with; once operator auth lands, tighten quiz_sessions RLS and move this
// behind it.

const RANGE_OPTIONS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

const BASE_COLUMNS =
  "id, first_name, last_name, phone, email, funnel_status, guzzler_score, entry_intent, quiz_completed_at, created_at, updated_at, upload_outdoor, upload_breaker, upload_thermostat, upload_bill";
const SESSION_COLUMNS = `${BASE_COLUMNS}, lead_source, utm_source`;

function useSessions(rangeDays: number) {
  return useQuery({
    queryKey: ["command-center-sessions", rangeDays],
    refetchInterval: 60_000,
    queryFn: async (): Promise<SessionSummary[]> => {
      const since = new Date(Date.now() - rangeDays * 24 * 3_600_000).toISOString();
      const fetchWith = (columns: string) =>
        supabase
          .from("quiz_sessions")
          .select(columns)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(1000);

      // Primary select includes the attribution columns; fall back without them
      // if that migration hasn't been applied yet (useAuditUpload pattern).
      const primary = await fetchWith(SESSION_COLUMNS);
      if (!primary.error) return (primary.data ?? []) as unknown as SessionSummary[];
      const fallback = await fetchWith(BASE_COLUMNS);
      if (fallback.error) throw fallback.error;
      return ((fallback.data ?? []) as unknown as Omit<SessionSummary, "lead_source" | "utm_source">[]).map(
        (row) => ({ ...row, lead_source: null, utm_source: null }),
      );
    },
  });
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  urgent = false,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  sub?: string;
  urgent?: boolean;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${urgent ? "text-destructive" : "text-primary"}`} />
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            {label}
          </p>
        </div>
        <p className={`text-3xl font-display font-bold ${urgent ? "text-destructive" : ""}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// Single-series horizontal funnel: one teal hue (identity doesn't change per
// stage), width encodes reach, direct labels carry the numbers, drop-off reads
// as muted ink beside each bar.
function FunnelChart({ sessions }: { sessions: SessionSummary[] }) {
  const steps = buildFunnelSteps(sessions);
  const max = steps[0]?.count || 1;

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={step.key} title={`${step.label}: ${step.count} leads (${step.pctOfStart}% of started)`}>
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-sm font-medium">{step.label}</p>
            <p className="text-xs text-muted-foreground">
              {i > 0 && `${step.conversionFromPrev}% from prev`}
              {i > 0 && step.droppedHere > 0 && ` · `}
              {step.droppedHere > 0 && (
                <span className="text-destructive">{step.droppedHere} dropped here</span>
              )}
            </p>
          </div>
          <div className="w-full bg-border/50 rounded h-7">
            <div
              className="h-7 rounded gradient-teal flex items-center transition-all duration-500"
              style={{ width: `${Math.max((step.count / max) * 100, step.count > 0 ? 6 : 0)}%` }}
            >
              {step.count > 0 && (
                <span className="text-xs font-semibold text-primary-foreground px-2 whitespace-nowrap">
                  {step.count} · {step.pctOfStart}%
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function hoursLeftBadge(hoursLeft: number) {
  if (hoursLeft <= 0) {
    return <Badge variant="outline" className="text-muted-foreground">Expired</Badge>;
  }
  if (hoursLeft < 6) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="w-3 h-3" /> {hoursLeft.toFixed(1)}h left
      </Badge>
    );
  }
  if (hoursLeft < 24) {
    return (
      <Badge className="gap-1 bg-accent text-accent-foreground hover:bg-accent">
        <Clock className="w-3 h-3" /> {Math.round(hoursLeft)}h left
      </Badge>
    );
  }
  return <Badge variant="secondary">{Math.round(hoursLeft)}h left</Badge>;
}

const STATUS_LABELS: Record<string, string> = {
  started: "Started",
  quiz_complete: "Quiz done",
  audit_bronze: "Uploading",
  audit_silver: "4 photos",
  audit_gold: "GOLD",
  booked: "Booked",
  audit_booked: "Booked",
  audit_complete: "Audit done",
};

function statusLabel(funnelStatus: string | null): string {
  const status = funnelStatus ?? "started";
  if (STATUS_LABELS[status]) return STATUS_LABELS[status];
  const q = /^question_(\d+)$/.exec(status);
  if (q) return `Q${q[1]} of 12`;
  return status;
}

export default function CommandCenterPage() {
  const [rangeDays, setRangeDays] = useState<number>(30);
  const { data: sessions, isLoading, error } = useSessions(rangeDays);

  const now = useMemo(() => new Date(), []);
  const stats = useMemo(
    () => (sessions ? buildDailyStats(sessions, now) : null),
    [sessions, now],
  );
  const recovery = useMemo(
    () => (sessions ? buildRecoveryQueue(sessions, now) : []),
    [sessions, now],
  );
  const recentLeads = useMemo(
    () => (sessions ?? []).filter((s) => stageRank(s.funnel_status) >= 2).slice(0, 25),
    [sessions],
  );
  const sources = useMemo(
    () => (sessions ? buildSourceBreakdown(sessions) : []),
    [sessions],
  );

  return (
    <Layout>
      <div className="container py-8 space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">D.A.V.E. Command Center</h1>
            <p className="text-sm text-muted-foreground">
              GuzzlerScore funnel intelligence — refreshes every minute
            </p>
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-1 bg-surface">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setRangeDays(opt.days)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  rangeDays === opt.days
                    ? "gradient-teal text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <Card className="border-destructive/40">
            <CardContent className="pt-5 text-sm text-destructive">
              Couldn't load funnel data: {(error as Error).message}
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading the pipeline…</p>
        )}

        {sessions && stats && (
          <>
            {/* Today's KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile icon={Users} label="New leads today" value={stats.newToday} />
              <StatTile icon={Trophy} label="Quizzes done today" value={stats.completedToday} />
              <StatTile icon={Flame} label="GOLD unlocks today" value={stats.goldToday} />
              <StatTile
                icon={Clock}
                label="In recovery window"
                value={stats.recoveryActive}
                sub={stats.expiringSoon > 0 ? `${stats.expiringSoon} expiring within 6h` : undefined}
                urgent={stats.expiringSoon > 0}
              />
            </div>

            {/* Conversion funnel */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Conversion funnel · last {rangeDays} days
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No sessions in this range yet.
                  </p>
                ) : (
                  <FunnelChart sessions={sessions} />
                )}
              </CardContent>
            </Card>

            {/* Lead sources */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Lead sources · last {rangeDays} days
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sources.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No sessions in this range yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sources.map((src) => {
                      const max = sources[0]?.count || 1;
                      return (
                        <div
                          key={src.key}
                          title={`${src.label}: ${src.count} leads, ${src.completed} captured contact (${src.conversionPct}%)`}
                        >
                          <div className="flex items-baseline justify-between mb-1">
                            <p className="text-sm font-medium">{src.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {src.completed} of {src.count} captured · {src.conversionPct}%
                            </p>
                          </div>
                          <div className="w-full bg-border/50 rounded h-5">
                            <div
                              className="h-5 rounded gradient-teal flex items-center transition-all duration-500"
                              style={{
                                width: `${Math.max((src.count / max) * 100, src.count > 0 ? 5 : 0)}%`,
                              }}
                            >
                              <span className="text-xs font-semibold text-primary-foreground px-2">
                                {src.count}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recovery queue */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Recovery queue · stalled in the 48h window
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {recovery.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Nobody is stalled right now. 🎉
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Photos</TableHead>
                        <TableHead>Intent</TableHead>
                        <TableHead>Window</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recovery.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>{lead.guzzler_score ?? "—"}</TableCell>
                          <TableCell>{lead.photosUploaded} / 4</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {lead.entry_intent === "ready_now" ? "🔥 Ready now" : lead.entry_intent ?? "—"}
                          </TableCell>
                          <TableCell>{hoursLeftBadge(lead.hoursLeft)}</TableCell>
                          <TableCell>
                            <a
                              href={`tel:${lead.phone}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              <Phone className="w-3 h-3" /> {lead.phone}
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent leads */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent leads · contact captured</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {recentLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No completed quizzes in this range yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentLeads.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">
                            {[s.first_name, s.last_name].filter(Boolean).join(" ") || "Unknown"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{s.phone ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={stageRank(s.funnel_status) >= 5 ? "default" : "secondary"}>
                              {statusLabel(s.funnel_status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{s.guzzler_score ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {new Date(s.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
