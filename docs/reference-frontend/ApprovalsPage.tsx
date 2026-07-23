import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, MessageSquare, SkipForward } from "lucide-react";
import Layout from "@/components/Layout";
import OperatorNav from "@/components/OperatorNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type DraftRow = Tables<"follow_up_messages"> & {
  follow_up_sequences: (Tables<"follow_up_sequences"> & {
    field_leads: Tables<"field_leads"> | null;
  }) | null;
};

// Human-in-the-loop approval queue. Every AI draft lands here; nothing is ever
// sent without a tap on Approve. Approve → the process-follow-ups worker sends
// immediately when inside the 8am–8pm ET window, otherwise it queues until
// morning.
export default function ApprovalsPage() {
  const queryClient = useQueryClient();

  const drafts = useQuery({
    queryKey: ["follow-up-drafts"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<DraftRow[]> => {
      const { data, error } = await supabase
        .from("follow_up_messages")
        .select("*, follow_up_sequences(*, field_leads(*))")
        .in("status", ["draft", "approved"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DraftRow[];
    },
  });

  const recent = useQuery({
    queryKey: ["follow-up-recent"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<DraftRow[]> => {
      const { data, error } = await supabase
        .from("follow_up_messages")
        .select("*, follow_up_sequences(*, field_leads(*))")
        .in("status", ["sent", "failed", "skipped"])
        .order("updated_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data ?? []) as DraftRow[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["follow-up-drafts"] });
    queryClient.invalidateQueries({ queryKey: ["follow-up-recent"] });
  };

  return (
    <Layout>
      <div className="container py-8 space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Approvals</h1>
            <p className="text-sm text-muted-foreground">
              AI drafts wait here for your tap. Nothing sends without approval.
            </p>
          </div>
          <OperatorNav />
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Waiting on you</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {drafts.isLoading && (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
            )}
            {drafts.data?.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Queue is clear. Drafts appear here when a follow-up comes due.
              </p>
            )}
            {drafts.data?.map((draft) => (
              <DraftCard key={draft.id} draft={draft} onDone={refresh} />
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.data?.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Nothing sent yet.</p>
            )}
            {recent.data?.map((m) => (
              <div key={m.id} className="flex items-start gap-2 text-sm border-b border-border/60 pb-2 last:border-0">
                <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {m.follow_up_sequences?.field_leads?.customer_name ?? "Unknown"}
                    <span className="text-muted-foreground font-normal"> · step {m.step}</span>
                  </p>
                  <p className="text-muted-foreground truncate">{m.final_body ?? m.draft_body}</p>
                  {m.status === "failed" && m.last_error && (
                    <p className="text-xs text-destructive">{m.last_error}</p>
                  )}
                </div>
                <Badge
                  variant={
                    m.status === "sent" ? "default" : m.status === "failed" ? "destructive" : "secondary"
                  }
                >
                  {m.status}
                  {m.status === "sent" && m.twilio_status ? ` · ${m.twilio_status}` : ""}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function DraftCard({ draft, onDone }: { draft: DraftRow; onDone: () => void }) {
  const { toast } = useToast();
  const lead = draft.follow_up_sequences?.field_leads;
  const [body, setBody] = useState(draft.final_body ?? draft.draft_body);
  const isQueued = draft.status === "approved";

  const act = useMutation({
    mutationFn: async (action: "approve" | "skip") => {
      const { error } = await supabase
        .from("follow_up_messages")
        .update(
          action === "approve"
            ? { status: "approved", final_body: body, approved_at: new Date().toISOString() }
            : { status: "skipped", final_body: null },
        )
        .eq("id", draft.id)
        .eq("status", draft.status); // guard against double-tap races
      if (error) throw error;
      // Kick the worker so approved messages go out immediately (it enforces
      // the 8am–8pm ET window itself and queues anything outside it).
      const { error: fnError } = await supabase.functions.invoke("process-follow-ups", {
        body: { reason: action },
      });
      if (fnError) throw new Error(`Saved, but worker kick failed: ${fnError.message}`);
      return action;
    },
    onSuccess: (action) => {
      toast({
        title: action === "approve" ? "Approved" : "Skipped",
        description:
          action === "approve"
            ? "Sending now if inside the 8am–8pm ET window; otherwise queued until morning."
            : "Sequence moves on to the next step.",
      });
      onDone();
    },
    onError: (err: Error) =>
      toast({ title: "Action failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="border border-border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {lead?.customer_name ?? "Unknown"}{" "}
            <span className="text-muted-foreground font-normal">
              · step {draft.step} · {lead?.city ?? "?"} · {lead?.job_type ?? "—"}
            </span>
          </p>
          {lead?.call_notes && (
            <p className="text-xs text-muted-foreground truncate">Notes: {lead.call_notes}</p>
          )}
        </div>
        {isQueued ? (
          <Badge className="shrink-0">Approved · queued for send window</Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0">Draft</Badge>
        )}
      </div>

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={320}
        disabled={isQueued}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{body.length}/320</p>
        {!isQueued && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => act.mutate("skip")}
              disabled={act.isPending}
            >
              <SkipForward className="w-3.5 h-3.5" /> Skip
            </Button>
            <Button size="sm" onClick={() => act.mutate("approve")} disabled={act.isPending || body.trim() === ""}>
              {act.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Approve &amp; send
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
