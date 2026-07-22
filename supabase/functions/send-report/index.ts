import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateReportPdf, type ReportModel } from "./pdf.ts";
import { buildReportEmailHtml, sendReportEmail } from "./email.ts";

// GOLD report handoff — the trigger behind the Trophy screen's "Send My Report".
//
// A homeowner who reached GOLD (900/900) submits their email; this function:
//   1. re-verifies GOLD from the DB (never trusts the client),
//   2. records an idempotent report request (one row per session),
//   3. renders the personalized Guzzler Score PDF from the engine's persisted
//      reveal payload, stores it, and emails it to the homeowner.
//
// The PDF renders from quiz_sessions.guzzler_report — the exact values the score
// screen showed — so no scoring logic is duplicated here (see guzzler-reveal.ts).
// Non-GOLD sessions are rejected before any PDF is generated.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// One @, a domain, and a dotted TLD — matches the client-side check on the
// trophy screen so both sides agree on what "valid" means.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The five uploads that define GOLD. Mirrors src/lib/upload-progress.ts.
const GOLD_UPLOAD_KEYS = [
  "upload_outdoor",
  "upload_breaker",
  "upload_thermostat",
  "upload_air_handler",
  "upload_bill",
] as const;

// Same book-a-free-audit link the trophy/incomplete screens use.
const BOOK_AUDIT_URL = "https://app.smbsolution.ai/audit?ref=dma-8d24de6b";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Shape of the persisted reveal payload (src/lib/guzzler-reveal.ts → GuzzlerRevealData).
interface RevealData {
  score: number;
  tier: string;
  grade: string;
  monthlyWaste: number;
  categories: { label: string; score: number; grade: string }[];
  topDrivers: string[];
}

interface SessionRow {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  funnel_status: string | null;
  guzzler_score: number | null;
  guzzler_report: RevealData | null;
  upload_outdoor: string | null;
  upload_breaker: string | null;
  upload_thermostat: string | null;
  upload_air_handler: string | null;
  upload_bill: string | null;
}

function reachedGold(session: SessionRow): boolean {
  return GOLD_UPLOAD_KEYS.every((k) => !!session[k]);
}

// Fallback letter grade — only used if a legacy session has no persisted reveal
// payload. Mirrors gradeForScore in src/lib/guzzler-reveal.ts.
function fallbackGrade(v: number): string {
  const s = Math.max(0, Math.min(100, v));
  if (s < 10) return "A+";
  if (s < 20) return "A";
  if (s < 30) return "B+";
  if (s < 40) return "B";
  if (s < 50) return "C+";
  if (s < 60) return "C";
  if (s < 70) return "D+";
  if (s < 80) return "D";
  return "F";
}

function fallbackTier(v: number): string {
  if (v >= 80) return "Severe";
  if (v >= 60) return "High";
  if (v >= 35) return "Moderate";
  return "Mild";
}

type RenderOutcome = { status: "generated" | "sent"; email: string } | { status: "failed"; error: string };

// Render the PDF, store it, and (if a provider is configured) email it. All
// status transitions on report_requests happen here; never throws to the caller.
async function renderAndSendReport(
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  sessionId: string,
  session: SessionRow,
  email: string,
): Promise<RenderOutcome> {
  try {
    const reveal = session.guzzler_report ?? null;
    const score = reveal?.score ?? session.guzzler_score ?? 0;
    const name = [session.first_name, session.last_name].filter(Boolean).join(" ").trim() || "there";
    const now = new Date();
    const dateStr = `${MONTHS[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()}`;

    const model: ReportModel = {
      name,
      score,
      grade: reveal?.grade ?? fallbackGrade(score),
      tier: reveal?.tier ?? fallbackTier(score),
      monthlyWaste: reveal?.monthlyWaste ?? 0,
      categories: reveal?.categories ?? [],
      topDrivers: reveal?.topDrivers ?? [],
      auditUrl: BOOK_AUDIT_URL,
      dateStr,
    };

    const pdf = await generateReportPdf(model);

    // Store the PDF (private bucket). upsert so a re-request overwrites cleanly.
    const path = `${sessionId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("pdf-reports")
      .upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error(`storage: ${uploadError.message}`);

    // Attempt delivery. If no provider key is set yet, this comes back
    // unconfigured and we record the report as generated (email pending).
    const emailResult = await sendReportEmail({
      to: email,
      from: Deno.env.get("REPORT_FROM_EMAIL") ?? "",
      subject: "Your ComfortIQ Guzzler Score Report",
      html: buildReportEmailHtml(name, score, model.grade, BOOK_AUDIT_URL),
      pdf,
      filename: "ComfortIQ-Guzzler-Score.pdf",
    });

    if (!emailResult.configured) {
      await supabase
        .from("report_requests")
        .update({ status: "generated", pdf_url: path })
        .eq("id", requestId);
      return { status: "generated", email };
    }

    if (emailResult.ok) {
      await supabase
        .from("report_requests")
        .update({
          status: "sent",
          pdf_url: path,
          provider_id: emailResult.id ?? null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      await supabase
        .from("quiz_sessions")
        .update({ funnel_status: "report_sent" })
        .eq("id", sessionId);
      return { status: "sent", email };
    }

    // Configured, but the provider rejected the send — surface it for retry.
    await supabase
      .from("report_requests")
      .update({ status: "failed", pdf_url: path, last_error: emailResult.error ?? "email send failed" })
      .eq("id", requestId);
    return { status: "failed", error: emailResult.error ?? "email send failed" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "render failed";
    console.error("send-report: renderAndSendReport failed:", msg);
    await supabase
      .from("report_requests")
      .update({ status: "failed", last_error: msg })
      .eq("id", requestId);
    return { status: "failed", error: msg };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { sessionId, email: postedEmail } = await req.json();
    if (!sessionId) {
      return json({ error: "sessionId required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: session, error: fetchError } = await supabase
      .from("quiz_sessions")
      .select(
        "email, first_name, last_name, funnel_status, guzzler_score, guzzler_report, upload_outdoor, upload_breaker, upload_thermostat, upload_air_handler, upload_bill",
      )
      .eq("id", sessionId)
      .single();

    if (fetchError || !session) {
      return json({ error: "Session not found" }, 404);
    }

    // Server-side GOLD guard — the guarantee the client-side redirect can't give.
    if (!reachedGold(session as SessionRow)) {
      return json(
        { status: "not_gold", error: "Report unlocks only after all five photos are uploaded." },
        403,
      );
    }

    // Recipient: the freshly-submitted email if valid, else the quiz-gate email.
    const trimmed = typeof postedEmail === "string" ? postedEmail.trim() : "";
    const email = EMAIL_RE.test(trimmed)
      ? trimmed
      : session.email && EMAIL_RE.test(session.email)
        ? session.email
        : null;
    if (!email) {
      return json({ error: "A valid email is required." }, 400);
    }

    // Idempotency: one handoff per session. Already sent → report it; mid-render
    // → don't stomp it. A 'failed'/'generated' row is allowed to re-run.
    const { data: existing } = await supabase
      .from("report_requests")
      .select("status")
      .eq("quiz_session_id", sessionId)
      .maybeSingle();

    if (existing?.status === "sent") {
      return json({ status: "already_sent", email });
    }
    if (existing?.status === "rendering") {
      return json({ status: "in_progress", email });
    }

    // Record (or re-request) the handoff. onConflict keeps it to one row.
    const { data: request, error: upsertError } = await supabase
      .from("report_requests")
      .upsert(
        { quiz_session_id: sessionId, email, status: "rendering" },
        { onConflict: "quiz_session_id" },
      )
      .select("id")
      .single();

    if (upsertError || !request) {
      console.error("send-report: failed to record request:", upsertError?.message);
      return json({ error: "Failed to record report request" }, 500);
    }

    // Preserve the existing funnel marker + pin the report email on the session.
    await supabase
      .from("quiz_sessions")
      .update({ email, funnel_status: "report_requested" })
      .eq("id", sessionId);

    const outcome = await renderAndSendReport(
      supabase,
      request.id as string,
      sessionId,
      session as SessionRow,
      email,
    );

    if (outcome.status === "failed") {
      return json({ status: "failed", error: outcome.error }, 502);
    }
    return json({ status: outcome.status, email });
  } catch (e) {
    console.error("send-report error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
