# APPROVED PLAN — Cora Rebate Clearinghouse Engine (Phase 10)

**Status: LOCKED.** Approved by Will 2026-07-23 on all four gate asks. Spike starts the moment the DSIRE key lands (expected 2026-07-24).
**Gate:** Fable 5 · **Implementer:** K3 (after speed-to-lead Phase 5 ships + review) · **Spec:** `ADDENDUM-2-REBATE-ENGINE.md` · **Kickoff:** revised kickoff w/ Amendments 1–3 · **Integration surface:** `PLAN-CORA-SPEED-TO-LEAD-APPROVED.md` (Phases 1–9 must not be disturbed)
Self-contained: K3 builds from this file + ADDENDUM-2 + CORA.md.

---

## APPROVED GATE DECISIONS (Will, 2026-07-23)

1. **Extend-don't-duplicate:** `rebate_programs` IS the registry. One resolver, one table, one truth. No parallel `rebate_registry`.
2. **Application status vocabulary = Amendment-1 enforcement by structure:** a program can only reach `submitted_by_platform` if `platform_capability='prefill_and_submit'`. The state machine physically cannot claim a filing right we don't have.
3. **v1 e-sign = tap-to-approve** (typed name + timestamp + IP logged). Programs demanding portal/wet signatures honestly fall to `prefill_only`.
4. **P10-F dependency honest-flagged:** the four rebate tools ship earlier as standalone edge functions; their conversational wiring into Cora lands with speed-to-lead Phase 7 (`cora-chat`).

## AMENDMENTS (law)

- **A1 — Filer-of-record:** `filer_of_record enum('homeowner','contractor','either','tax_return')` + `platform_capability enum('prefill_and_submit','prefill_only','docs_package','info_only')` on every registry row. `rebate_apply` refuses gracefully where capability forbids submission and pivots to what we CAN do. Language law: "I filed it" is BLOCKED by the deterministic compliance filter unless the application row reads `submitted_by_platform`. Approved framings: "I've got your packet pre-filled and ready" / "your contractor submits this one — I've prepped everything they need" / "this one goes on your tax return — here's your documentation folder."
- **A2 — Income-PII deferral:** v1 auto-application = **non-income-qualified programs only** (HEIP, EMC member, manufacturer; top-3-by-dollar within that set). Income-qualified rows cap at `platform_capability='docs_package'`: Cora explains the tier, generates a checklist, flags the lead. **No income-document upload, storage, or transmission anywhere in v1.** Schema reserves `rebate_applications.docs_bucket_ref text null` (unused) so v2 is a row-flip + its own security gate (encryption at rest, retention policy, access audit), not a redesign.
- **A3 — Sequencing gate:** NOW = research spike (P10-A, data files only) + schema design (P10-B, this doc). **Steps P10-C…J do not start until speed-to-lead Phase 5 ships and passes Fable review.** Calculator panel (P10-G) additionally waits for the Tanzeel merge sequence + VisualAuditPage rebase to settle. *(Gate-check note 2026-07-23: merge sequence still unexecuted — it now blocks two builds.)*

## SCHEMA (drafted at gate release; applied only post-gate, with the ref + `quiz_sessions.guzzler_score` signature probe; ProRevenue never)

**`rebate_programs` ADD:** `payment_timing enum('instant','post_install','tax_credit')` · `filer_of_record` · `platform_capability` · `stacking_rules jsonb` · `application_method jsonb` · `payout_window_days int4range` · `confidence_score numeric` · `source enum('manual','dsire','scraper')` · `dsire_program_id text` · `stale_after_days int default 90`. Existing anon-SELECT stays (public rate data).

**New tables (ALL service-role-only RLS):**
- `utility_territories(zip, state, utility_name, utility_type enum('iou','emc','muni'), source, verified_at)` — seed NREL/OpenEI utility-by-zip + manual verification of metro-ATL priority zips before any consumer-facing territory claim.
- `rebate_applications(quiz_session_id FK, program_id FK, status enum('identified','docs_ready','prefilled','awaiting_esign','submitted_by_platform','handed_to_contractor','homeowner_tax_return','approved','denied','paid'), payment_timing_snapshot, amount_estimated, amount_actual, deadline_at, esign jsonb, submitted_at, outcome jsonb, nag_state jsonb, docs_bucket_ref text null /* v2 only */)`. HEIP's 60-day post-invoice deadline is load-bearing → `deadline_at` + nag crons.
- `rebate_verification_queue(program_id, reason enum('scraper_diff','dsire_diff','expired_window','manual_flag'), snapshot jsonb, status enum('pending','verified','corrected','retired'), reviewed_by, reviewed_at)`.
- `state_packs(state, pack jsonb, incentive_density jsonb, version, active)`.

## DATA LAYER

- **DSIRE:** nightly `dsire-sync` edge fn (pg_cron), GA + HVAC/heat-pump filter → staging → diff → **verification queue only; changed amounts never auto-publish.**
- **Scrapers:** Firecrawl (key already in project secrets) — Georgia Power HEIP, Lennox/Carrier/Trane/Goodman, EMC pages; monthly cron + on-demand; diffs → queue.
- **Staleness law:** past `last_verified + stale_after_days` → resolver emits `stale:true` → "check at proposal," never a dollar-as-fact.
- **Verification UI:** command-center queue card (approve/correct/retire) via service-role edge fn.
- **Permanent regression test:** seeded `expired` 25C row asserted never to resolve.

## ELIGIBILITY ENGINE

Promote `resolveRebates` (repair-vs-replace build) to a shared module consumed by calculator (client) and Cora tools (server) — extend with territory lookup, payment-timing classes, filer/capability, staleness, engine-enforced stacking rules. Income = FLAGS only (A2). One resolver forever.

## CORA TOOLS (per locked ADDENDUM-2 §9 — no new surface, no new persona)

`rebate_lookup(zip, equipment)` · `rebate_stack(session_id)` — price-today / money-back-later / tax-credit ALWAYS separated, §8.2 disclosure verbatim, "estimated — verified at your proposal" per line, $900 discount stacked · `rebate_apply(program_id)` — **capability check first** (A1 behavior table) · `rebate_status(application_id)` — incl. the post-install "your check's coming" trust touch.

## CALCULATOR PANEL (P10-G, double-gated)

Third panel "Your Incentive Stack" on `RepairReplaceResults`: itemized, timing-separated, disclosure block, screenshot-worthy. Waits for Phase-5 gate AND merge-order settle.

## STATE PACKS + INCENTIVE-DENSITY INDEX (P10-J)

Pack = {territories_ref, program_filters, stacking_logic_version, disclosure_templates, application_methods}. IDI = Σ(utility $ + manufacturer $ + state/local $ + policy equivalents) − friction score (numeric map of friction_level + platform_capability burden). Deliverable: format + computation fn + GA reference pack.

## SEQUENCE

**NOW:** P10-A spike (DSIRE GA inventory → `/data` files · territory data acquisition · GA Power + top-6 EMC + top-4 manufacturer inventory). P10-B design (this doc). Zero migrations, zero UI, zero edge functions.
**POST-GATE (Phase 5 shipped + reviewed):** P10-C migrations → P10-D seed + sync + scrapers + queue → P10-E resolver promotion + territories → P10-F tools (standalone; Cora wiring with Phase 7) → P10-G calculator panel → P10-H applications + tap-to-approve → P10-I tracking + outcome feedback loop → P10-J packs + IDI.

## KEYS

`DSIRE_API_KEY` ⏳ Will 7/24 (spike trigger) · `FIRECRAWL_API_KEY` ✅ set · NREL/OpenEI key (free; Fable registers at spike start) · SendGrid = Tanzeel's rail, **not wired here** · all via `supabase secrets set`, never in code.

## GUARDRAILS (carry-over)

AI disclosure · TCPA · claims filter (potential/typical/results vary) · no equipment prices · audit trail in `cora_conversations` · service-role RLS on all new tables · estimated-until-verified · stacking engine-enforced · tax documentation never tax advice · expired rows never presented; expiring rows get deadline framing; stale rows say "check at proposal."

---
*Filed by Fable 5 per file-first workflow. K3: after the Phase-5 gate lifts, build P10-C→J in order; return to Fable at each phase gate. Timing note (Will, locked): the 8/10 HEAR fuel-switch window will likely close before this ships end-to-end — do not rush a 2027-harvest funnel for a closing window.*
