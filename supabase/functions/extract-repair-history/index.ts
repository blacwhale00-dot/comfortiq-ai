import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Cora's repair-history extractor. Takes one homeowner message + the facts
// already known, returns ONLY newly-extracted structured fields via forced
// tool-use. This function never generates dollar figures or advice — it
// transcribes what the homeowner said into the repair_history shape; all math
// happens in src/lib/repair-replace.ts (spec guardrail: no LLM-invented
// numbers). The client falls back to heuristicExtract() if this errors.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTRACT_TOOL = {
  name: "record_repair_facts",
  description:
    "Record repair-history facts explicitly stated or clearly implied by the homeowner's message. Omit any field the message does not answer. Never guess amounts.",
  input_schema: {
    type: "object",
    properties: {
      repair_within_24mo: { type: "boolean", description: "Only if the message answers whether the system was repaired in the last 2 years." },
      repair_component: {
        type: "string",
        enum: ["compressor", "capacitor", "blower_motor", "refrigerant_leak", "control_board", "evaporator_coil", "thermostat", "unknown"],
        description: "Map plain language ('the fan thing' -> blower_motor). Use 'unknown' only if they describe a repair but can't name it.",
      },
      repair_date_approx: { type: "string", description: "ISO date, month precision (YYYY-MM-01). Resolve relative dates ('last summer') against today's date." },
      repair_cost_usd: { type: "number", description: "Dollars. For a stated range, the midpoint. Omit if not mentioned." },
      was_financed: { type: "boolean" },
      monthly_payment_usd: { type: "number" },
      repair_count_24mo: { type: "integer" },
      still_having_issues: { type: "boolean" },
      contractor_name: { type: "string" },
      safety_issue_mentioned: { type: "boolean", description: "true if cracked heat exchanger, gas smell, CO alarm, sparking, or similar safety hazard is described." },
      notes: { type: "object", additionalProperties: { type: "string" }, description: "Per-field confidence notes for low-confidence mappings, e.g. {\"repair_component\": \"'fan thing' mapped to blower_motor, low confidence\"}" },
    },
    additionalProperties: false,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, knownFacts, step } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "extractor not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const model = Deno.env.get("CORA_EXTRACT_MODEL") ?? "claude-sonnet-5";

    const today = new Date().toISOString().slice(0, 10);
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        system:
          `You extract HVAC repair-history facts from a homeowner's message during Cora's assessment. Today is ${today}. ` +
          `The question currently on the table is: "${step ?? "unknown"}". ` +
          `Facts already captured (do NOT re-extract these): ${JSON.stringify(knownFacts ?? {})}. ` +
          `Extract only what THIS message states. A bare "yes"/"no" answers the question on the table. Never invent numbers.`,
        messages: [{ role: "user", content: message }],
        tools: [EXTRACT_TOOL],
        tool_choice: { type: "tool", name: "record_repair_facts" },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("anthropic error:", resp.status, errText.slice(0, 300));
      return new Response(JSON.stringify({ error: "extraction failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await resp.json();
    const toolCall = result.content?.find(
      (b: { type: string; name?: string }) => b.type === "tool_use" && b.name === "record_repair_facts",
    );
    const extracted = toolCall?.input ?? {};
    const { notes, safety_issue_mentioned, ...fields } = extracted;

    return new Response(
      JSON.stringify({ fields, notes: notes ?? {}, safetyIssue: safety_issue_mentioned === true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("extract-repair-history error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
