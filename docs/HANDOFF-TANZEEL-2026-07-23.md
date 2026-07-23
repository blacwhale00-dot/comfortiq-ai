# HANDOFF — Tanzeel: Where You Stand + Your Next 15 Minutes

**Date:** 2026-07-23 · **From:** Fable 5 (via Will) · **To:** Tanzeel
**Context docs:** `PLAN-CORA-SPEED-TO-LEAD-APPROVED.md` (locked), `HANDOFF-FABLE5-CORA-SPEED-TO-LEAD.md`, `CORA.md`
**Purpose:** You're mid-integration on Twilio and deep in phase-3. This doc exists so nothing that happened today surprises you tomorrow.

---

## 1. What Landed (today, confirmed)

- **Repair-vs-Replace calculator + repair history capture: LIVE in prod.** The code rides on **PR #4** (`crm-command-center` branch) — your calculator, repair history, `funnel_events`, and attribution all live there.
- **Rebate realism corrections** applied (Addendum 1 — data + logic only, no new features). If any rebate copy or numbers look different than you remember, that's why. Intentional.

## 2. What's Coming (approved + locked today)

The **Cora V2 booking + speed-to-lead dual path** plan was gated, amended by Will (5 amendments), and locked. K3 is the implementer. Full spec: `docs/PLAN-CORA-SPEED-TO-LEAD-APPROVED.md`.

In one paragraph: after score reveal / calculator results, the consumer gets two doors — **"Talk to Will NOW"** (instant Zoom call, shown only when Will's availability is live) or **book an evening virtual appointment** (Cal.com). Plus availability auto-windows, a 4-minute timeout fallback, and Cora auto-sending the post-call recap.

## 3. Your Exact 15 Minutes (do these in order)

1. **Merge PR #4** (`crm-command-center` → main). Everything downstream gates on this.
2. **Rename your phase-3 migration** — there's a version collision:
   - `20260723000000_repair_replace.sql` (PR #4) vs `20260723000000_guzzler_report_pdf.sql` (phase-3)
   - Rename yours to **`20260723020000_guzzler_report_pdf.sql`** — file rename ONLY. Both are already applied to the live DB; do not re-run anything.
3. **Migration-history repair** — run `supabase migration repair` (or manual insert into `supabase_migrations.schema_migrations`) so the renumbered phase-3 file and the psql-applied 07-23 migrations are all recorded and `db push` never chokes.
4. **Merge your GOLD PDF work** (phase-3 → main, renumbered).

**Merge order is contractual:** PR #4 → phase-3 (renumbered) → K3's build. Don't reorder.

## 4. ⚠️ Courtesy Flag — `leads` Public-Read Removal

The anon/public read policy on `leads` is being removed. **Anything you built that reads `leads` through the anon client will break** — and it will break silently until it 401s in front of a user.

**Do now:** grep your code for anon-client reads of `leads` and flag every hit back to Fable/Will. A scoped policy will be written for legitimate reads — but only if we know where they are. Flag it this week, not when you're debugging a mystery 401 next week.

## 5. Your Twilio Work Is Now a Contract

Perfect timing — you're mid-integration, so read this before you wire another line. Your SMS rail now carries **four traffic types:**

1. **Appointment reminders** (T-24h, T-2h) — Phase 3
2. **No-show recovery** (T+15min, one-tap rebook) — Phase 3
3. **Queue notifications** ("Will's free now" to waiting consumers) — Phase 6
4. **Conversational Cora** (two-way SMS) — Phase 7

### The four rules (locked, no exceptions on any path)

1. **A2P-gated go-live.** No SMS goes live until A2P 10DLC is approved. Everything SMS-carried ships code-complete but **dark** behind the existing worker pattern — web/in-app/email ship live in the meantime.
2. **Instant STOP → `suppression_list`.** Any opt-out phrasing honored immediately, confirmed politely once, logged with reason `optout`. No "are you sure?" follow-up. Ever.
3. **Consent-checked sends.** Every send checks consent-on-file (consent jsonb) before dispatch. No consent row, no send.
4. **Deterministic compliance filter — server-side, after generation, before send.** No SMS path bypasses it. Not reminders, not Cora, not anything. Claims language, disclosure, price-refusal — the filter is the last door.

### 🎯 The one thing we need FROM YOU (this week)

**Your A2P 10DLC registration status + expected approval date.**

That single answer sets the go-live dates for **Phases 3, 6, and 7**. It is the only external dependency on the entire board. Everything else is our code.

## 6. Heads-Up: VisualAuditPage Rebase — NOT Your Problem

`VisualAuditPage`/trophy region is touched by PR #4 (repair chat), phase-3 (GOLD PDF), and K3's build (dual-path card). The post-merge rebase of that page is **K3's job** — don't spend a minute reconciling it yourself. If you see conflicts there after the merges, park them and flag K3.

---

## Your Checklist

- [ ] Merge PR #4
- [ ] Rename phase-3 migration → `20260723020000_guzzler_report_pdf.sql`
- [ ] Migration-history repair
- [ ] Merge phase-3 (GOLD PDF)
- [ ] Flag any anon-client `leads` reads (§4)
- [ ] Report A2P 10DLC status + expected approval date (§5)
- [ ] Keep wiring Twilio — under the four rules

Questions → Will or Fable. You're unblocked; the board is clean.

---

*Filed by Hermes 2026-07-23, reconstructed from Fable 5's handoff summary relayed by Will. If Fable's full original exists in the planning session, diff against this and reconcile — the merge order, the four SMS rules, and the A2P ask are the load-bearing parts.*
