# Pending migrations — authored, reviewed, NOT applied

These SQL files are **deliberately outside `supabase/migrations/`** so that
`supabase db push` cannot pick them up. Nothing here has run against any
database.

## Why they're staged rather than applied

1. **The approved plan doc is missing.** The 2026-08-17 brief says to build to
   `docs/PLAN-CORA-SPEED-TO-LEAD-APPROVED.md` and calls it canonical. That file
   is not in this repo. The closest thing is
   [`../../docs/HANDOFF-FABLE5-CORA-SPEED-TO-LEAD.md`](../../docs/HANDOFF-FABLE5-CORA-SPEED-TO-LEAD.md),
   which is explicitly a *pre-plan* (`no code written by Hermes`, status
   `READY FOR FABLE REVIEW`). These files are built from its §2 schema sketch.
   The approved plan may differ.

2. **Standing rule: signature-probe project verification before any migration.**
   This database is shared with D.A.V.E and its migration ledger has drifted in
   both directions, so the live catalog — not `schema_migrations` — is the only
   trustworthy source. That probe has not been run for these tables.

3. **One deliberate deviation from the handoff, needs sign-off.** §2 keys the new
   tables on `lead_id uuid references leads(id)`. **There is no `leads` table in
   this project.** Every ComfortIQ table keys on `quiz_sessions(id)` —
   `consent_records`, `repair_history`, `repair_replace_analysis`,
   `funnel_events`, `cora_reminders` all do. These migrations follow that
   existing convention and use `quiz_session_id`. If the approved plan really
   does introduce a `leads` table, these files change.

## To apply, once unblocked

1. Get the approved plan doc; reconcile the schema against it.
2. Run the signature-probe verification against the live catalog.
3. `git mv` the files into `supabase/migrations/` (their timestamps are already
   in the right sequence).
4. `supabase db push`.

## What depends on them

- `supabase/functions/instant-call-create` — reads `will_availability`, writes `instant_calls`
- `supabase/functions/zoom-webhook` — updates `instant_calls`, writes `cora_conversations`

Both functions are non-functional until these are applied. Neither is called by
any consumer-facing code, by design: *"No dead 'Talk to Will NOW' button, ever."*
