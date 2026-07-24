import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { toE164 } from "../_shared/phone.ts";
import {
  classifyInbound,
  OPT_IN_CONFIRMATION,
  OPT_OUT_CONFIRMATION,
} from "../_shared/opt-out.ts";
import { isValidTwilioSignature } from "../_shared/twilio-signature.ts";

// Twilio inbound-SMS webhook. Set this function's URL as the "A MESSAGE COMES
// IN" webhook (HTTP POST) on the Twilio number. Twilio POSTs
// application/x-www-form-urlencoded with From, To, Body, MessageSid, …
//
// Responsibilities (Will §5 — the app-level source of truth for opt-outs):
//   opt-out phrasing → upsert suppression_list(reason='optout') + one confirmation
//   opt-in  phrasing → remove suppression + one confirmation
//   anything else     → no reply (future: hand off to cora-chat)
//
// Deploy notes:
//   • Disable Twilio's Advanced Opt-Out on this number so this single
//     confirmation is the only reply and suppression_list stays authoritative.
//     (send-due-reminders still records a carrier 21610 as a fallback.)
//   • Deployed with verify_jwt = false (see config.toml) — Twilio can't send a
//     Supabase JWT, so auth is the Twilio signature check below instead.
//   • Secrets used: TWILIO_AUTH_TOKEN (signature), SUPABASE_URL,
//     SUPABASE_SERVICE_ROLE_KEY. Optional: SMS_INBOUND_URL (override the URL used
//     to compute the signature base if a proxy/custom domain rewrites req.url).

function twiml(message?: string): Response {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new Response(body, { headers: { "Content-Type": "text/xml" } });
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!authToken) {
    console.error("sms-inbound: TWILIO_AUTH_TOKEN not configured");
    return new Response("misconfigured", { status: 500 });
  }

  // Twilio sends form-encoded params; collect them for both signature + logic.
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = typeof v === "string" ? v : "";

  // Auth: verify the request genuinely came from Twilio.
  const signatureUrl = Deno.env.get("SMS_INBOUND_URL") ?? req.url;
  const valid = await isValidTwilioSignature(
    authToken,
    signatureUrl,
    params,
    req.headers.get("X-Twilio-Signature"),
  );
  if (!valid) {
    console.warn("sms-inbound: rejected request with invalid Twilio signature");
    return new Response("invalid signature", { status: 403 });
  }

  const from = toE164(params["From"] ?? "");
  const body = params["Body"] ?? "";
  if (!from) return twiml(); // can't act on a number we can't normalize

  const intent = classifyInbound(body);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (intent === "opt_out") {
    const { error } = await supabase.from("suppression_list").upsert(
      {
        phone: from,
        reason: "optout",
        source: "sms-inbound",
        last_inbound: body.slice(0, 500),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "phone" },
    );
    if (error) console.error("sms-inbound: suppression upsert failed:", error.message);
    return twiml(OPT_OUT_CONFIRMATION);
  }

  if (intent === "opt_in") {
    const { error } = await supabase.from("suppression_list").delete().eq("phone", from);
    if (error) console.error("sms-inbound: suppression delete failed:", error.message);
    return twiml(OPT_IN_CONFIRMATION);
  }

  // Other inbound — no automated reply yet (cora-chat handoff lands later).
  return twiml();
});
