# APPROVED PLAN — Cora V2 Booking + Speed-to-Lead Dual Path

**Status: LOCKED.** Approved by Will 2026-07-23 with five amendments (§A, integrated below as requirements).
**Gate:** Fable 5 (planned + reviews) · **Implementer:** K3 · **Spec:** `HANDOFF-FABLE5-CORA-SPEED-TO-LEAD.md` · **Playbook:** `CORA.md` (canonical)
This document is self-contained: K3 builds from this file + the handoff + CORA.md without needing the planning conversation.

---

## A. WILL'S AMENDMENTS (locked 2026-07-23 — these are requirements, not suggestions)

1. **Timezone on schedule windows.** `will_availability_schedule.timezone text not null default 'America/New_York'`. pg_cron runs UTC — every window evaluation converts via the row's timezone (`now() at time zone tz`), so DST flips never shift Will's commute window. Add a unit/SQL test that a 7–9am ET window resolves correctly in both January and July.
2. **Queue expiry.** `instant_call_queue.expires_at timestamptz not null default now() + interval '24 hours'`. The toggle-flip notifier skips expired rows **silently** (status → `expired`, no message). A stale "Will's free now!" reads as spam.
3. **Zoom meeting settings on create:** `settings: { waiting_room: true, join_before_host: false }` on every `type:1` instant meeting. The waiting room IS the 4-minute UX — consumer waits in Zoom's own room, never alone in a started meeting, never bounced by a locked one.
4. **Service-role-only RLS on ALL five new tables** (`will_availability`, `will_availability_schedule`, `instant_calls`, `instant_call_queue`, `cora_conversations`). No anon policies at all — every read/write goes through edge functions with the service role. `instant_calls` carries meeting URLs + lead linkage; the queue is a hot-lead list. Client UI gets state via edge function responses only.
   - **Plus:** at the merge (Phase 0), run a **migration-history repair** (`supabase migration repair` / manual insert into `supabase_migrations.schema_migrations`) so the renumbered phase-3 file and the psql-applied 07-23 migrations are all recorded and `db push` never chokes.
5. **Lean Telegram context card:** name · verified score · calculator verdict · one-line repair summary · one-tap join button. Nothing else in the message body. A "Full lead file →" link goes to the authenticated command-center view (`/command-center` lead detail).

## B. CONFLICTS TO RESOLVE FIRST (Phase 0 hard gate)

- **C1:** PR #4 (`crm-command-center`) is unmerged — calculator, repair history, funnel_events, attribution live there. **Merge PR #4 first.**
- **C2:** Migration version collision: `20260723000000_repair_replace.sql` (PR #4) vs `20260723000000_guzzler_report_pdf.sql` (phase-3). **Rename the phase-3 file to `20260723020000_guzzler_report_pdf.sql`** (file rename only; both already applied to live DB). Then run the migration-history repair (Amendment 4).
- **C3:** `cora_conversations` does NOT exist in the live DB (docs assumed it did). It is created in Phase 1.
- **C4:** `VisualAuditPage`/trophy region is touched by PR #4 (repair chat), phase-3 (GOLD PDF), and this build (dual-path card). **Merge order: PR #4 → phase-3 (renumbered) → this build**, rebasing the dual-path card last.
- **Dependency flags:** A2P 10DLC unapproved → all SMS-carried features ship code-complete but dark behind the existing worker pattern; web/in-app/email ship live. Canvasser enum change is a separate-repo PR + deploy.

## C. GATE DECISIONS (Fable, approved)

1. **Canvasser events:** reuse `call_booked`/`call_held` with `payload.channel: "instant"|"evening"`; add only `instant_call_requested` + `instant_call_timeout` to the closed enum (canvasser-repo PR updates `WEBHOOK_CONTRACT.md` + zod enum).
2. **Runtime:** Supabase edge functions for v1 (webhooks/cron/secrets native; $0 new infra). Deviation from expansion §5 "Orgo runtime target" — approved. Brain call isolated in `_shared/brain.ts` for a clean Orgo lift later.
3. **Playbook loading:** `CORA.md` synced to Supabase Storage; `cora-chat` reads it at runtime with a 5-min cache → Will edits change behavior with no deploy. Repo copy stays canonical.
4. **Timeout authority:** client 4:00 countdown (UX) + 1-minute pg_cron sweeper over `instant_calls` (authority). Both fire the same fallback.
5. **FK adaptation:** all new tables anchor `quiz_session_id → quiz_sessions(id)` (the `leads` table is an empty blueprint) + nullable `canvasser_lead_id text` for cross-system joins.

## D. PHASES (each independently shippable)

**Phase 0 — Unblock:** C1–C4 merge sequence + history repair. Will: create Zoom S2S app (§F) and Cal.com account + "Evening Virtual" event type. Secrets set: `ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET / ZOOM_WEBHOOK_SECRET / CALCOM_API_KEY / TELEGRAM_BOT_TOKEN / WILL_TELEGRAM_CHAT_ID / KIMI_API_KEY / AVAILABILITY_API_SECRET`.

**Phase 1 — Migrations** (unique new versions; apply with the ref + `quiz_sessions.guzzler_score` signature probe; ProRevenue `vcegmtzurebdndmrsqsv` never):
- `will_availability` (latest-row-wins: `is_live, source ('telegram'|'admin_ui'|'auto_schedule'), toggled_at`)
- `will_availability_schedule` (`name, days_of_week int[], start_time, end_time, timezone` **[Amendment 1]**, `enabled`)
- `instant_calls` (`quiz_session_id FK, canvasser_lead_id, meeting_url, meeting_provider, status ('requested'|'will_joined'|'held'|'timed_out'|'converted_to_booking'), requested_at, joined_at, ended_at, timeout_offered`)
- `instant_call_queue` (`quiz_session_id FK, created_at, notified_at, status ('waiting'|'notified'|'expired'), expires_at default now()+'24 hours'` **[Amendment 2]**)
- `cora_conversations` (`thread_id, quiz_session_id FK, direction, channel ('web'|'sms'|'email'), body, compliance_flags jsonb, handoff_trigger, created_at`)
- **RLS: service-role only on all five — zero anon policies [Amendment 4].**
- Canvasser repo PR: 2 enum adds + contract doc update.

**Phase 2 — Availability service:** edge fn `availability` — GET effective state (manual-override-wins: `/busy` inside a window suppresses auto-ON until the next window; `/available` outside windows goes live now), POST toggle (bearer `AVAILABILITY_API_SECRET`; this is the API Hermes' Telegram commands call). Per-minute pg_cron window evaluator (timezone-aware per Amendment 1) writes `source='auto_schedule'` rows. Command-center card: live state + today's windows + manual toggle.

**Phase 3 — Path B (L4 minimal):** edge fn `calcom-book` — read Evening Virtual slots (Cal.com API v2), book, confirm. pg_cron reminder sweeps: T-24h, T-2h, T+15min no-show one-tap rebook (SMS dark until A2P; email/in-app live). Events → `/ingest` `call_booked{channel:"evening"}`.

**Phase 4 — Dual-path card:** `DualPathCard.tsx` on score-reveal + calculator-results screens. Path A rendered **only** when availability=ON (state fetched via `availability` GET — never a dead door). REPLACE verdict + live → Path A leads visually. Choices → `funnel_events` + `cora_conversations`.

**Phase 5 — Path A core:** edge fn `instant-call`: availability check → S2S token → `POST /users/me/meetings` `{type:1, settings:{waiting_room:true, join_before_host:false}}` **[Amendment 3]** → insert `instant_calls` → lean Telegram card **[Amendment 5]** → return join URL. Edge fn `zoom-webhook` (URL-validation challenge implemented): `participant_joined` → `will_joined`; `meeting.ended` → `held` + **auto-recap** (three-outcome frame + next-step CTA, through the compliance filter, logged) per handoff §7.4. Events: `instant_call_requested`, `call_held{channel:"instant"}`.

**Phase 6 — Timeout + queue:** sweeper marks `timed_out` at 4 min → Cora fallback (evening slot | "text me when he's free" → queue). Toggle-flip notifier drains **non-expired** queue rows [Amendment 2]: Telegram to Will always; consumer SMS dark until A2P (in-app/email live). Event: `instant_call_timeout`.

**Phase 7 — Cora engine v1:** edge fn `cora-chat` — context builder (session, subscores when live, quiz answers, photos, repair history, calculator verdict, stage, thread history) + K3 brain (`_shared/brain.ts`) + playbook-from-storage + **deterministic server-side compliance filter after generation, before send** (AI disclosure present, claims language, price-refusal, STOP → suppression) + handoff triggers → Telegram. Channel 1: web chat (reuse `ComfortAIChat` shell). All messages → `cora_conversations`.

**Phase 8 — L3 → L1/L2 → L5:** educator primer (conditional proposal, Site Condition Schedule, include-&-remove, three-outcome close) → score interpreter + objection library (CORA.md §7) → nurture flows (abandoners, photo stallers, T+72h winback, seasonal). All playbook-data-driven, cron-triggered.

**Phase 9 — Dashboard:** command-center adds — **score_revealed→human-contact minutes (north star)**, Path A take rate, timeout rate (>20% alarm), per-path conversion chain, calculator-verdict→contact rate, containment rate.

## E. FILE MAP (K3)

New: 5 migrations · edge fns `availability`, `instant-call`, `zoom-webhook`, `calcom-book`, `cora-chat` · `supabase/functions/_shared/{zoom,calcom,telegram,compliance,brain,cora-context}.ts` · `src/components/DualPathCard.tsx` · `src/components/cora/CoraChatPanel.tsx` · `src/lib/dual-path.ts` · command-center availability + metrics cards · canvasser-repo enum PR.
Modified: score-reveal screen + `RepairReplaceResults` (mount card) · `VisualAuditPage` (post-merge rebase) · `src/lib/funnel-events.ts` · `types.ts` (5 tables).

## F. ZOOM S2S SETUP (Will, ~10 min, $0 on Basic)

marketplace.zoom.us → Develop → Server-to-Server OAuth app "ComfortIQ Instant Calls" → scopes `meeting:write:meeting:admin`, `meeting:read:meeting:admin` → copy Account ID / Client ID / Client Secret → Event Subscriptions: `meeting.participant_joined`, `meeting.ended` → endpoint = deployed `zoom-webhook` URL → copy Webhook Secret Token. 40-min Basic cap never binds a ~10-min call.

## G. GUARDRAILS (carry-over, non-negotiable)

AI disclosure first message (the instant call is with **Will, a human** — Cora frames it as such) · TCPA consent-gating, STOP instant → suppression · claims filter (potential/typical/results vary; $900 discount may be named, savings projections may not) · Cora never quotes prices ("Will custom-builds your numbers") · no competitor talk · full audit trail in `cora_conversations` · Will's manual override always wins · availability OFF outside Will-defined windows · 4-minute fallback is a hard requirement.

## H. COST

$0/mo new infra (Zoom Basic, Cal.com free, Telegram). K3 brain: pennies/conversation. SMS: existing Twilio usage, gated on A2P.

---
*Filed by Fable 5 per file-first workflow. K3: read this + the handoff + CORA.md, then build Phase 0→9 in order. Return to Fable 5 for review at each phase gate.*
