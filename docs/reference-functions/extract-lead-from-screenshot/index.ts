import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Screenshot → structured lead. The client uploads Successware screenshots to
// the private `lead-screenshots` bucket, then invokes this function with the
// storage paths. We download the images, send them to the Anthropic Messages
// API, and return strict-schema JSON for the review-and-confirm form. Nothing
// is written to the database here — the operator's confirm step does that.
//
// Auth: verify_jwt is ON for this function, and we additionally check that
// every requested path lives under the caller's own uid/ folder, mirroring the
// bucket's RLS.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const MAX_IMAGES = 4;

// Anthropic vision accepts these; HEIC is converted to JPEG client-side
// before upload (see NewLeadsPage), so it should never reach us.
const MEDIA_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

interface EquipmentItem {
  type: string | null;
  brand: string | null;
  model: string | null;
  serial: string | null;
  install_year: number | null;
}

interface ExtractedLead {
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  job_number: string | null;
  job_type: string | null;
  equipment: EquipmentItem[];
  notes_visible: string | null;
}

const LEAD_FIELDS: (keyof ExtractedLead)[] = [
  "customer_name", "phone", "email", "street_address", "city", "state", "zip",
  "job_number", "job_type", "equipment", "notes_visible",
];

const EXTRACTION_PROMPT = `You are extracting customer data from screenshots of Successware (HVAC dispatch software) customer-detail screens. Multiple screenshots may cover one customer record across two screens.

Return STRICT JSON only — no markdown fences, no commentary, no explanations. Exactly this shape:

{
  "lead": {
    "customer_name": "", "phone": "", "email": "",
    "street_address": "", "city": "", "state": "", "zip": "",
    "job_number": "", "job_type": "",
    "equipment": [{ "type": "", "brand": "", "model": "", "serial": "", "install_year": null }],
    "notes_visible": ""
  },
  "low_confidence_fields": []
}

Rules:
- Use null for any field not clearly visible in the screenshots. Never guess.
- equipment: one entry per unit visible (furnace, AC, heat pump, water heater...); empty array if none shown.
- install_year: 4-digit integer or null.
- notes_visible: any technician/dispatch notes text visible, verbatim, else null.
- low_confidence_fields: names of any lead fields whose value is blurry, cut off, or ambiguous (e.g. ["phone", "zip"]). Empty array if everything read cleanly.`;

function toStringOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return null;
}

// Coerce whatever the model returned into the exact schema, so the client can
// rely on every key existing with the right type.
function normalizeLead(raw: Record<string, unknown>): ExtractedLead {
  const equipmentRaw = Array.isArray(raw.equipment) ? raw.equipment : [];
  const equipment: EquipmentItem[] = equipmentRaw.map((e) => {
    const item = (e ?? {}) as Record<string, unknown>;
    const year = Number(item.install_year);
    return {
      type: toStringOrNull(item.type),
      brand: toStringOrNull(item.brand),
      model: toStringOrNull(item.model),
      serial: toStringOrNull(item.serial),
      install_year: Number.isInteger(year) && year > 1900 && year < 2100 ? year : null,
    };
  });
  return {
    customer_name: toStringOrNull(raw.customer_name),
    phone: toStringOrNull(raw.phone),
    email: toStringOrNull(raw.email),
    street_address: toStringOrNull(raw.street_address),
    city: toStringOrNull(raw.city),
    state: toStringOrNull(raw.state),
    zip: toStringOrNull(raw.zip),
    job_number: toStringOrNull(raw.job_number),
    job_type: toStringOrNull(raw.job_type),
    equipment,
    notes_visible: toStringOrNull(raw.notes_visible),
  };
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
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
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Resolve the caller from their JWT so path ownership can be enforced.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const uid = userData.user.id;

    const { paths } = await req.json().catch(() => ({ paths: null }));
    if (!Array.isArray(paths) || paths.length === 0 || paths.length > MAX_IMAGES ||
        !paths.every((p) => typeof p === "string")) {
      return json({ error: `Provide 1-${MAX_IMAGES} storage paths` }, 400);
    }
    if (!paths.every((p: string) => p.startsWith(`${uid}/`))) {
      return json({ error: "Paths must be under your own folder" }, 403);
    }

    // Download + encode each screenshot.
    const imageBlocks = [];
    for (const path of paths as string[]) {
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      const mediaType = MEDIA_TYPES[ext];
      if (!mediaType) {
        return json({ error: `Unsupported image type ".${ext}" — upload PNG or JPG` }, 400);
      }
      const { data: blob, error: dlError } = await serviceClient.storage
        .from("lead-screenshots")
        .download(path);
      if (dlError || !blob) {
        return json({ error: `Could not read ${path}: ${dlError?.message ?? "not found"}` }, 400);
      }
      imageBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64Encode(new Uint8Array(await blob.arrayBuffer())),
        },
      });
    }

    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1500,
        messages: [
          { role: "user", content: [...imageBlocks, { type: "text", text: EXTRACTION_PROMPT }] },
        ],
      }),
    });

    if (!anthropicResp.ok) {
      const detail = await anthropicResp.text().catch(() => "");
      console.error("anthropic error:", anthropicResp.status, detail.slice(0, 500));
      return json({ error: `Extraction service error (${anthropicResp.status})` }, 502);
    }

    const payload = await anthropicResp.json();
    const text: string = payload?.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";

    // Strip markdown fences if the model added them despite instructions.
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

    let parsed: { lead?: Record<string, unknown>; low_confidence_fields?: unknown };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("extract: model returned non-JSON:", cleaned.slice(0, 300));
      return json({ error: "Extraction returned unparseable output — try clearer screenshots" }, 422);
    }

    const rawLead = (parsed.lead ?? parsed) as Record<string, unknown>;
    const lead = normalizeLead(rawLead);
    const lowConfidence = Array.isArray(parsed.low_confidence_fields)
      ? parsed.low_confidence_fields.filter(
          (f): f is string => typeof f === "string" && (LEAD_FIELDS as string[]).includes(f),
        )
      : [];

    return json({ lead, low_confidence_fields: lowConfidence, model: ANTHROPIC_MODEL });
  } catch (e) {
    console.error("extract-lead-from-screenshot error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
