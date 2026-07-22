// Email delivery for the GOLD report, provider-agnostic. Whichever key is set
// wins — RESEND_API_KEY takes precedence, then SENDGRID_API_KEY. If neither is
// configured, `configured` comes back false so the caller can still treat the
// PDF as generated-and-stored (email pending) instead of a hard failure. Swapping
// or adding a provider is a local change here; nothing else in the function moves.

export interface EmailArgs {
  to: string;
  from: string; // verified sender, e.g. "Cora <cora@comfortiq.ai>"
  subject: string;
  html: string;
  pdf: Uint8Array;
  filename: string;
}

export interface EmailResult {
  configured: boolean; // was any provider key present?
  ok: boolean; // did the send succeed?
  id?: string; // provider message id
  provider?: "resend" | "sendgrid";
  error?: string;
}

// Base64-encode in chunks — String.fromCharCode(...bytes) on a large PDF would
// blow the call-stack argument limit.
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function sendViaResend(key: string, args: EmailArgs): Promise<EmailResult> {
  if (!args.from) {
    return { configured: true, ok: false, provider: "resend", error: "REPORT_FROM_EMAIL not set" };
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: args.from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      attachments: [{ filename: args.filename, content: toBase64(args.pdf) }],
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (resp.ok) return { configured: true, ok: true, id: data.id, provider: "resend" };
  return {
    configured: true,
    ok: false,
    provider: "resend",
    error: `resend ${resp.status}: ${data.message ?? "unknown error"}`,
  };
}

async function sendViaSendgrid(key: string, args: EmailArgs): Promise<EmailResult> {
  if (!args.from) {
    return { configured: true, ok: false, provider: "sendgrid", error: "REPORT_FROM_EMAIL not set" };
  }
  const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: args.to }] }],
      from: { email: args.from, name: "ComfortIQ" },
      subject: args.subject,
      content: [{ type: "text/html", value: args.html }],
      attachments: [
        {
          content: toBase64(args.pdf),
          filename: args.filename,
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    }),
  });
  if (resp.ok) {
    return { configured: true, ok: true, id: resp.headers.get("x-message-id") ?? undefined, provider: "sendgrid" };
  }
  const body = await resp.text().catch(() => "");
  return {
    configured: true,
    ok: false,
    provider: "sendgrid",
    error: `sendgrid ${resp.status}: ${body.slice(0, 200)}`,
  };
}

export async function sendReportEmail(args: EmailArgs): Promise<EmailResult> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) return await sendViaResend(resendKey, args);

  const sendgridKey = Deno.env.get("SENDGRID_API_KEY");
  if (sendgridKey) return await sendViaSendgrid(sendgridKey, args);

  // No provider configured yet — the caller records the PDF as generated/stored.
  return { configured: false, ok: false };
}

// The HTML body of the delivery email. Emoji are fine here (unlike the PDF).
export function buildReportEmailHtml(name: string, score: number, grade: string, auditUrl: string): string {
  const greeting = name && name !== "there" ? `Hi ${name}` : "Hi there";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c2126;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#0d7377;border-radius:16px 16px 0 0;padding:24px;">
        <div style="color:#fff;font-size:20px;font-weight:800;">ComfortIQ</div>
        <div style="color:#d7efef;font-size:11px;letter-spacing:2px;margin-top:4px;">GUZZLER SCORE REPORT</div>
      </div>
      <div style="background:#fff;border-radius:0 0 16px 16px;padding:24px;">
        <p style="font-size:15px;margin:0 0 12px;">${greeting} — your full Guzzler Score report is attached. 💚</p>
        <p style="font-size:15px;margin:0 0 16px;">
          You scored <strong>${score}/100</strong> (grade <strong>${grade}</strong>). The attached PDF breaks down
          exactly where your system is wasting money and what to do about it.
        </p>
        <a href="${auditUrl}" style="display:inline-block;background:#0d7377;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;">
          Book Your Free 15-Minute Audit
        </a>
        <p style="font-size:13px;color:#6b7280;margin:20px 0 0;">
          No pressure, no obligation — just a straight answer on repair vs. replace.
        </p>
        <p style="font-size:14px;margin:20px 0 0;">— Cora, your ComfortIQ guide 💚</p>
      </div>
      <p style="font-size:11px;color:#9aa2ab;text-align:center;margin:16px 0 0;">
        ComfortIQ · You're receiving this because you requested your Guzzler Score report.
      </p>
    </div>
  </body>
</html>`;
}
