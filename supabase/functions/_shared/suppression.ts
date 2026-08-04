// The single gate every outbound send passes through, on every channel.
//
// Will's §5: "a suppression check runs before *every* send." That rule is only
// as good as its weakest caller, so the check, the write and the address
// normalization all live here — no function is allowed to hand-roll a query
// against suppression_list. Backed by the (channel, address) unique index from
// 20260803010000_suppression_list_channels.sql.
//
// FAIL-CLOSED. If the suppression lookup itself errors (network blip, DB
// unavailable, RLS surprise), isSuppressed returns TRUE and the send is skipped.
// A missed reminder is recoverable; texting someone who pressed STOP because a
// SELECT timed out is a TCPA violation. The previous inline check in
// send-due-reminders discarded the error and fell through to sending — i.e. it
// failed *open* — which this deliberately reverses.

import { toE164 } from "./phone.ts";

export type SuppressionChannel = "sms" | "email";

// Why a row exists. Mirrors the CHECK constraint on suppression_list.reason.
export type SuppressionReason = "optout" | "bounce" | "complaint" | "manual";

// Minimal structural type for the supabase-js client, so this module doesn't
// need to import the SDK just for a type (each function pins its own version).
interface SupabaseLike {
  from(table: string): any;
}

// Same shape as send-report's EMAIL_RE: one @, a domain, a dotted TLD.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Canonical form of an address for its channel — the thing actually stored and
 * compared. SMS becomes E.164; email is trimmed and lowercased so
 * "Bob@Example.COM " and "bob@example.com" can never both slip past the list.
 *
 * @returns the normalized address, or null if it can't be trusted as valid.
 */
export function normalizeAddress(
  channel: SuppressionChannel,
  raw: string | null | undefined,
): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  if (channel === "sms") return toE164(value);

  const email = value.toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

/**
 * Is this address opted out? Call before EVERY send, no exceptions.
 *
 * An address that can't be normalized is reported as suppressed: we can't
 * meaningfully check it, so we don't send to it.
 */
export async function isSuppressed(
  supabase: SupabaseLike,
  channel: SuppressionChannel,
  rawAddress: string | null | undefined,
): Promise<boolean> {
  const address = normalizeAddress(channel, rawAddress);
  if (!address) return true;

  const { data, error } = await supabase
    .from("suppression_list")
    .select("id")
    .eq("channel", channel)
    .eq("address", address)
    .maybeSingle();

  if (error) {
    // Fail closed — see the module header.
    console.error(
      `suppression: lookup failed for ${channel}, treating as suppressed:`,
      error.message,
    );
    return true;
  }

  return !!data;
}

/**
 * Record an opt-out. Idempotent — re-texting STOP just refreshes the row.
 *
 * @returns true if the row was written; false if the address was unusable or
 *          the write failed (logged, never thrown — callers are on a send path
 *          and must not crash because the audit write hiccuped).
 */
export async function suppress(
  supabase: SupabaseLike,
  args: {
    channel: SuppressionChannel;
    address: string | null | undefined;
    reason?: SuppressionReason;
    source: string; // which function recorded it, for the audit trail
    lastInbound?: string | null; // raw message body that triggered it, if any
  },
): Promise<boolean> {
  const address = normalizeAddress(args.channel, args.address);
  if (!address) {
    console.warn(`suppression: refusing to store unnormalizable ${args.channel} address`);
    return false;
  }

  const { error } = await supabase.from("suppression_list").upsert(
    {
      channel: args.channel,
      address,
      reason: args.reason ?? "optout",
      source: args.source,
      last_inbound: args.lastInbound ? args.lastInbound.slice(0, 500) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "channel,address" },
  );

  if (error) {
    console.error("suppression: upsert failed:", error.message);
    return false;
  }
  return true;
}

/**
 * Remove an opt-out (START / resubscribe). Silent no-op if not present.
 */
export async function unsuppress(
  supabase: SupabaseLike,
  channel: SuppressionChannel,
  rawAddress: string | null | undefined,
): Promise<boolean> {
  const address = normalizeAddress(channel, rawAddress);
  if (!address) return false;

  const { error } = await supabase
    .from("suppression_list")
    .delete()
    .eq("channel", channel)
    .eq("address", address);

  if (error) {
    console.error("suppression: delete failed:", error.message);
    return false;
  }
  return true;
}
