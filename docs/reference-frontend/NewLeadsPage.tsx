import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import Layout from "@/components/Layout";
import OperatorNav from "@/components/OperatorNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOperator } from "@/hooks/use-operator";
import {
  EMPTY_LEAD, type EquipmentItem, type ExtractedLead, type ExtractionResult, type FieldLead,
  normalizePhone, OUTCOME_LABELS, prepareImageForUpload,
} from "@/lib/field-leads";
import type { Database } from "@/integrations/supabase/types";

type CallOutcome = Database["public"]["Enums"]["call_outcome"];

interface PendingFile {
  file: File;
  status: "queued" | "processing" | "uploaded" | "error";
  path?: string;
  error?: string;
}

const MAX_FILES = 4;

// The screenshot-to-lead pipeline: Will screenshots the Successware customer
// screen, uploads it here, the extract-lead-from-screenshot edge function
// (Anthropic vision) fills the review form, and NOTHING is written until he
// confirms. Confirm dedupes on phone + street address.
export default function NewLeadsPage() {
  const { userId } = useOperator();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<PendingFile[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [review, setReview] = useState<ExtractedLead | null>(null);
  const [lowConfidence, setLowConfidence] = useState<string[]>([]);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);

  const recentLeads = useQuery({
    queryKey: ["field-leads-recent"],
    queryFn: async (): Promise<FieldLead[]> => {
      const { data, error } = await supabase
        .from("field_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const addFiles = (incoming: FileList | File[]) => {
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (next.length >= MAX_FILES) break;
      next.push({ file, status: "queued" });
    }
    setFiles(next);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  // Convert (HEIC → JPEG, downscale) + upload each file, then run extraction.
  const runExtraction = async () => {
    if (!userId || files.length === 0) return;
    setExtracting(true);
    setReview(null);
    try {
      const paths: string[] = [];
      const batchId = crypto.randomUUID();
      for (let i = 0; i < files.length; i++) {
        setFiles((cur) => cur.map((f, idx) => (idx === i ? { ...f, status: "processing" } : f)));
        try {
          const { blob, ext } = await prepareImageForUpload(files[i].file);
          const path = `${userId}/${batchId}/${i + 1}.${ext}`;
          const { error } = await supabase.storage
            .from("lead-screenshots")
            .upload(path, blob, { contentType: blob.type || "image/jpeg" });
          if (error) throw new Error(error.message);
          paths.push(path);
          setFiles((cur) => cur.map((f, idx) => (idx === i ? { ...f, status: "uploaded", path } : f)));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          setFiles((cur) => cur.map((f, idx) => (idx === i ? { ...f, status: "error", error: message } : f)));
          throw err;
        }
      }

      const { data, error } = await supabase.functions.invoke<ExtractionResult>(
        "extract-lead-from-screenshot",
        { body: { paths } },
      );
      if (error) throw new Error(error.message);
      if (!data?.lead) throw new Error("Extraction returned no data");

      setUploadedPaths(paths);
      setReview(data.lead);
      setLowConfidence(data.low_confidence_fields ?? []);
      if ((data.low_confidence_fields ?? []).length > 0) {
        toast({
          title: "Check the highlighted fields",
          description: `Extraction wasn't sure about: ${data.low_confidence_fields.join(", ")}`,
        });
      }
    } catch (err) {
      toast({
        title: "Extraction failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  // Mandatory human confirm: only this writes to the database. Dedupe on
  // phone digits + street address (backed by the field_leads_dedupe index).
  const confirmLead = useMutation({
    mutationFn: async (lead: ExtractedLead) => {
      const digits = normalizePhone(lead.phone);
      let existingId: string | null = null;
      if (digits) {
        const { data: matches, error: findError } = await supabase
          .from("field_leads")
          .select("id, street_address")
          .eq("phone_normalized", digits);
        if (findError) throw findError;
        const addr = (lead.street_address ?? "").trim().toLowerCase();
        existingId =
          matches?.find((m) => (m.street_address ?? "").trim().toLowerCase() === addr)?.id ?? null;
      }

      const row = {
        customer_name: lead.customer_name,
        phone: lead.phone,
        email: lead.email,
        street_address: lead.street_address,
        city: lead.city,
        state: lead.state,
        zip: lead.zip,
        job_number: lead.job_number,
        job_type: lead.job_type,
        equipment: lead.equipment as unknown as Database["public"]["Tables"]["field_leads"]["Insert"]["equipment"],
        notes_visible: lead.notes_visible,
        screenshot_paths: uploadedPaths,
        created_by: userId,
      };

      if (existingId) {
        const { error } = await supabase.from("field_leads").update(row).eq("id", existingId);
        if (error) throw error;
        return { deduped: true };
      }
      const { error } = await supabase.from("field_leads").insert(row);
      if (error) throw error;
      return { deduped: false };
    },
    onSuccess: ({ deduped }) => {
      toast({
        title: deduped ? "Existing lead updated" : "Lead created",
        description: deduped
          ? "Matched an existing lead by phone + address — updated it instead of duplicating."
          : "Saved. Slack ping sent. Set the outcome below after the call.",
      });
      setReview(null);
      setFiles([]);
      setUploadedPaths([]);
      setLowConfidence([]);
      queryClient.invalidateQueries({ queryKey: ["field-leads-recent"] });
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't save lead", description: err.message, variant: "destructive" }),
  });

  return (
    <Layout>
      <div className="container py-8 space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">New Leads</h1>
            <p className="text-sm text-muted-foreground">
              Screenshot the Successware customer screen → upload → confirm. No re-typing.
            </p>
          </div>
          <OperatorNav />
        </div>

        {/* Step 1: upload */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1 · Upload screenshots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              type="button"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/60 transition-colors"
            >
              <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Tap to choose, or drag screenshots here</p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG / JPG / HEIC · up to {MAX_FILES} per lead (some records span two screens)
              </p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/heic,image/heif,image/webp"
              multiple
              className="hidden"
              onChange={onPick}
            />

            {files.length > 0 && (
              <ul className="space-y-2">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Camera className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{f.file.name}</span>
                    {f.status === "queued" && <Badge variant="secondary">Ready</Badge>}
                    {f.status === "processing" && (
                      <Badge variant="secondary" className="gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Uploading
                      </Badge>
                    )}
                    {f.status === "uploaded" && (
                      <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/15">
                        <CheckCircle2 className="w-3 h-3" /> Uploaded
                      </Badge>
                    )}
                    {f.status === "error" && <Badge variant="destructive">{f.error ?? "Error"}</Badge>}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setFiles((cur) => cur.filter((_, idx) => idx !== i))}
                      disabled={extracting}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <Button
              onClick={runExtraction}
              disabled={files.length === 0 || extracting}
              className="w-full"
            >
              {extracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Reading screenshots…
                </>
              ) : (
                "Extract lead details"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: review + confirm */}
        {review && (
          <ReviewForm
            lead={review}
            lowConfidence={lowConfidence}
            saving={confirmLead.isPending}
            onChange={setReview}
            onConfirm={() => confirmLead.mutate(review)}
          />
        )}

        {/* Step 3: post-call outcome + notes */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent leads · set outcome after the call</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentLeads.isLoading && (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
            )}
            {recentLeads.error && (
              <p className="text-sm text-destructive py-4 text-center">
                {(recentLeads.error as Error).message}
              </p>
            )}
            {recentLeads.data?.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No leads yet — upload the first screenshot above.
              </p>
            )}
            {recentLeads.data?.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ["field-leads-recent"] })}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

const FIELD_LABELS: [keyof ExtractedLead, string][] = [
  ["customer_name", "Customer name"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["street_address", "Street address"],
  ["city", "City"],
  ["state", "State"],
  ["zip", "ZIP"],
  ["job_number", "Job #"],
  ["job_type", "Job type"],
];

function ReviewForm({
  lead, lowConfidence, saving, onChange, onConfirm,
}: {
  lead: ExtractedLead;
  lowConfidence: string[];
  saving: boolean;
  onChange: (lead: ExtractedLead) => void;
  onConfirm: () => void;
}) {
  const setField = (key: keyof ExtractedLead, value: string) =>
    onChange({ ...lead, [key]: value === "" ? null : value });

  const setEquipment = (index: number, key: keyof EquipmentItem, value: string) => {
    const equipment = lead.equipment.map((item, i) =>
      i === index
        ? {
            ...item,
            [key]: key === "install_year" ? (value === "" ? null : Number(value)) : value === "" ? null : value,
          }
        : item,
    );
    onChange({ ...lead, equipment });
  };

  return (
    <Card className="shadow-card border-primary/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">2 · Review &amp; confirm</CardTitle>
        <p className="text-xs text-muted-foreground">
          Nothing is saved until you confirm. Amber fields were flagged low-confidence.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FIELD_LABELS.map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`lead-${key}`} className="text-xs flex items-center gap-2">
                {label}
                {lowConfidence.includes(key) && (
                  <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px] px-1.5">
                    check
                  </Badge>
                )}
              </Label>
              <Input
                id={`lead-${key}`}
                value={(lead[key] as string | null) ?? ""}
                onChange={(e) => setField(key, e.target.value)}
                className={lowConfidence.includes(key) ? "border-amber-400" : undefined}
              />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Equipment</Label>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() =>
                onChange({
                  ...lead,
                  equipment: [
                    ...lead.equipment,
                    { type: null, brand: null, model: null, serial: null, install_year: null },
                  ],
                })
              }
            >
              <Plus className="w-3 h-3" /> Add unit
            </Button>
          </div>
          {lead.equipment.length === 0 && (
            <p className="text-xs text-muted-foreground">No equipment visible on the screenshots.</p>
          )}
          {lead.equipment.map((item, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
              {(["type", "brand", "model", "serial"] as const).map((key) => (
                <Input
                  key={key}
                  placeholder={key}
                  value={item[key] ?? ""}
                  onChange={(e) => setEquipment(i, key, e.target.value)}
                  className="text-xs"
                />
              ))}
              <div className="flex gap-1">
                <Input
                  placeholder="year"
                  type="number"
                  value={item.install_year ?? ""}
                  onChange={(e) => setEquipment(i, "install_year", e.target.value)}
                  className="text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() =>
                    onChange({ ...lead, equipment: lead.equipment.filter((_, idx) => idx !== i) })
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <Label htmlFor="lead-notes" className="text-xs">Notes visible on screen</Label>
          <Textarea
            id="lead-notes"
            value={lead.notes_visible ?? ""}
            onChange={(e) => onChange({ ...lead, notes_visible: e.target.value || null })}
            rows={3}
          />
        </div>

        <Button onClick={onConfirm} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving…
            </>
          ) : (
            "Confirm — save lead"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function LeadRow({ lead, onSaved }: { lead: FieldLead; onSaved: () => void }) {
  const { toast } = useToast();
  const [outcome, setOutcome] = useState<CallOutcome | "">(lead.outcome ?? "");
  const [callNotes, setCallNotes] = useState(lead.call_notes ?? "");
  const [ticketValue, setTicketValue] = useState(lead.ticket_value?.toString() ?? "");
  const [expanded, setExpanded] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("field_leads")
        .update({
          outcome: outcome === "" ? null : outcome,
          call_notes: callNotes || null,
          ticket_value: ticketValue === "" ? null : Number(ticketValue),
        })
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Saved",
        description:
          outcome === "no_sale" || outcome === "pending_decision"
            ? "Lead entered the follow-up sequence (Day 1 queued)."
            : undefined,
      });
      onSaved();
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't save", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="border border-border rounded-lg p-3 space-y-3">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {lead.customer_name ?? "Unknown"}{" "}
            <span className="text-muted-foreground font-normal">
              · {lead.city ?? "?"} · {lead.job_type ?? "—"}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">{lead.phone ?? "no phone"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lead.opted_out && <Badge variant="destructive">Opted out</Badge>}
          {lead.outcome ? (
            <Badge variant={lead.outcome === "sold" ? "default" : "secondary"}>
              {OUTCOME_LABELS[lead.outcome]}
            </Badge>
          ) : (
            <Badge variant="outline">No outcome yet</Badge>
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Outcome</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as CallOutcome)}>
                <SelectTrigger>
                  <SelectValue placeholder="Set after the call" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(OUTCOME_LABELS) as CallOutcome[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {OUTCOME_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {outcome === "sold" && (
              <div className="space-y-1">
                <Label className="text-xs">Ticket value ($)</Label>
                <Input
                  type="number"
                  value={ticketValue}
                  onChange={(e) => setTicketValue(e.target.value)}
                  placeholder="e.g. 12500"
                />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Call notes (voice-transcribe into here)</Label>
            <Textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              rows={3}
              placeholder="Objections, quoted price, what they cared about, spouse's name…"
            />
          </div>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save outcome & notes"}
          </Button>
        </div>
      )}
    </div>
  );
}
