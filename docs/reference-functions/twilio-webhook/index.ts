import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Twilio webhook — two jobs, one endpoint (it's set as both the incoming-SMS
// webhook on the number and the StatusCallback on every outbound message):
//
//   Inbound SMS:
//     STOP/UNSUBSCRIBE → lead.opted_out, cancel sequences, Slack 🛑
//     anything else    → save to inbound_messages, pause the sequence, Slack 💬
//                        (Will takes over personally)
//   Status callback:
//     record delivery status on the message; failed/undelivered → Slack ⚠️
//     (error 30034 called out as an A2P 10DLC registration issue)
//
// verify_jwt is OFF (Twilio can't send a Supabase JWT); authenticity is
// enforced by validating the X-Twilio-Signature header against
// TWILIO_AUTH_TOKEN instead.

const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);

function digits(phone: string): string {
  return phone.replace(/\D/g, "");
}

async function slackPing(text: string): Promise<void> {
  const hook = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!hook) return;
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    console.error("slack ping failed:", e);
  }
}

// Twilio request validation: base64(HMAC-SHA1(url + concat(sorted key+value))).
async function isValidTwilioSignature(req: Request, params: URLSearchParams): Promise<boolean> {
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const signature = req.headers.get("X-Twilio-Signature");
  if (!authToken || !signature) return false;

  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-webhook`;
  const sortedKeys = [...params.keys()].sort();
  const payload = url + sortedKeys.map((k) => k + (params.get(k) ?? "")).join("");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === signature;
}

const twiml = () =>
  new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { "Content-Type": "text/xml" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  try {
    const raw = await req.text();
    const params = new URLSearchParams(raw);

    if (!(await isValidTwilioSignature(req, params))) {
      console.error("twilio-webhook: invalid signature");
      return new Response("Forbidden", { status: 403 });
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const messageStatus = params.get("MessageStatus") ?? params.get("SmsStatus");
    const body = params.get("Body");
    const from = params.get("From");
    const sid = params.get("MessageSid") ?? params.get("SmsSid");

    // ---- Delivery status callback (no Body, has a status) ----
    if (messageStatus && !body) {
      if (sid) {
        const errorCode = params.get("ErrorCode");
        const isFailure = messageStatus === "failed" || messageStatus === "undelivered";
        const { data: updated } = await db
          .from("follow_up_messages")
          .update({
            twilio_status: messageStatus,
            twilio_error_code: errorCode,
            ...(isFailure ? { status: "failed", last_error: `delivery ${messageStatus} (code ${errorCode ?? "?"})` } : {}),
          })
          .eq("twilio_sid", sid)
          .select("id, step, sequence_id")
          .maybeSingle();

        if (isFailure && updated) {
          const a2p = errorCode === "30034"
            ? " — error 30034: A2P 10DLC registration issue, check the Twilio console"
            : "";
          await slackPing(`⚠️ Delivery ${messageStatus} for follow-up step ${updated.step}${a2p}`);
        }
      }
      return twiml();
    }

    // ---- Inbound SMS ----
    if (from && body != null) {
      const fromDigits = digits(from);
      // Match on the last 10 digits so +1 prefixes never break the lookup.
      const { data: leads } = await db
        .from("field_leads")
        .select("id, customer_name, phone_normalized")
        .like("phone_normalized", `%${fromDigits.slice(-10)}`);
      const lead = leads?.[0] ?? null;

      const isStop = STOP_WORDS.has(body.trim().toUpperCase());

      if (isStop) {
        if (lead) {
          await db.from("field_leads").update({ opted_out: true }).eq("id", lead.id);
          await db
            .from("follow_up_sequences")
            .update({ status: "cancelled", next_action_at: null, paused_reason: "opted out (STOP)" })
            .eq("lead_id", lead.id)
            .in("status", ["active", "paused"]);
        }
        await slackPing(`🛑 Opt-out: ${lead?.customer_name ?? from} replied STOP — sequence cancelled.`);
        return twiml();
      }

      await db.from("inbound_messages").insert({
        lead_id: lead?.id ?? null,
        from_phone: from,
        body,
        twilio_sid: sid,
      });
      if (lead) {
        await db
          .from("follow_up_sequences")
          .update({ status: "paused", next_action_at: null, paused_reason: "customer replied" })
          .eq("lead_id", lead.id)
          .eq("status", "active");
      }
      await slackPing(`💬 ${lead?.customer_name ?? from} replied: "${body}" — sequence paused, take it from here.`);
      return twiml();
    }

    return twiml();
  } catch (e) {
    console.error("twilio-webhook error:", e);
    // Return 200 TwiML anyway so Twilio doesn't hammer retries.
    return twiml();
  }
});
