// Minimal Telegram sender for Will's operator pings.
//
// ⚠️ UNCONFIGURED AS OF 2026-08-17. There is no Telegram rail in this repo yet —
// the July handoff assigned `/available` `/busy` and the operator bot to Hermes.
// This helper exists so instant-call-create has one place to notify Will, and so
// the day the bot token lands the only change is `supabase secrets set`.
//
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WILL_CHAT_ID.
//
// Deliberately best-effort: a failed ping must never deny the homeowner the
// meeting room they already have a link to. Callers record whether it landed
// (instant_calls.will_notified_at) so the timeout fallback can catch the gap.

export interface TelegramResult {
  sent: boolean;
  reason?: string;
}

export async function sendTelegramMessage(
  env: (key: string) => string | undefined,
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TelegramResult> {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_WILL_CHAT_ID");
  if (!token || !chatId) return { sent: false, reason: "telegram_not_configured" };

  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) return { sent: false, reason: `telegram_http_${res.status}` };
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: `telegram_error: ${(err as Error).message}` };
  }
}

export interface LeadContextCard {
  firstName: string | null;
  score: number | null;
  band: string | null;
  verdict: string | null;
  repairSummary: string | null;
  startUrl: string;
}

/**
 * The lean context card, per the 17-08 brief: "name, score, verdict, repair
 * summary, one-tap join — deep details stay behind the authenticated dashboard."
 * Keep it lean deliberately — Telegram is not an authenticated surface, so no
 * phone number, no address, no email goes in here.
 */
export function buildContextCard(card: LeadContextCard): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lines = [
    "🔴 <b>Instant call requested</b>",
    `👤 ${esc(card.firstName ?? "Homeowner")}`,
    card.score != null
      ? `📊 Guzzler ${card.score}${card.band ? ` · ${esc(card.band)}` : ""}`
      : "📊 Score pending",
  ];
  if (card.verdict) lines.push(`🔧 Verdict: ${esc(card.verdict)}`);
  if (card.repairSummary) lines.push(`🧾 ${esc(card.repairSummary)}`);
  lines.push(`\n▶️ <a href="${esc(card.startUrl)}">Join now</a>`);
  return lines.join("\n");
}
