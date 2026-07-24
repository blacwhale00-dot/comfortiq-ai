---
title: "Cora Rebate Clearinghouse Engine — Master Build Handoff"
aliases: ["Phase 10", "Rebate Engine", "Rebate Clearinghouse"]
type: build-handoff
project: ComfortIQ
component: Cora
phase: 10
status: approved-gated
gate: "Construction opens at speed-to-lead Phase 5 ship + Fable 5 review"
owner: Will
implementer: K3
reviewer: Fable 5
created: 2026-07-23
updated: 2026-07-24
tags: [comfortiq, cora, rebates, build-handoff, phase-10, guzzler-score, hermes-learn]
related:
  - "[[PLAN-REBATE-ENGINE-APPROVED]]"
  - "[[PLAN-CORA-SPEED-TO-LEAD-APPROVED]]"
  - "[[CORA]]"
  - "[[ADDENDUM-2-REBATE-ENGINE]]"
  - "[[HANDOFF-TANZEEL-2026-07-23]]"
---

# Cora Rebate Clearinghouse Engine — Master Build Handoff

> **GM GREEN LIGHT — 2026-07-24.** John Doepker (GM, RS Andrews) approved unlimited self-generated lead activity: automation, postcards, door hangers, technology. The Atlanta pilot is live business, not an experiment. Mail drop is unblocked.

> **SEQUENCING GATE STILL IN FORCE.** GM approval unblocks **go-to-market**, not build order. Amendment 3 stands: **P10-A spike runs now (data only); P10-C→J construction opens only when speed-to-lead Phase 5 ships and passes review.** Mail traffic with no close mechanism behind it is the one failure mode that wastes real postage. Speed-to-lead is now *more* urgent, not less.

---

## 1. What this engine is

Cora stops being an advisor who *mentions* rebates and becomes the entity that **finds, stacks, prepares, tracks, and (where legal) files them**. The industry's failure is universal: homeowners ask "are there rebates?", reps don't know, and even discovered money goes unclaimed because the paperwork is punishing.

**The moat is the doing, not the knowing.** Anyone can list incentives. Nobody in home services pre-fills the packet, tracks the deadline, nags to completion, and reports the payout.

Secondary strategic asset: the registry doubles as the **Incentive-Density Index** — the expansion map telling Lead Avatar which markets to enter next. Solar VSOs only sold in the most-incentivized states because the savings sold the system. HVAC has never done incentive-driven market selection.

## 2. Architecture (LOCKED — do not re-litigate)

Baked **into** Cora as tools. Backend built as **separate services**. No new app surface, no new persona.

**Cora's four tools:** `rebate_lookup(zip, equipment)` · `rebate_stack(session_id)` · `rebate_apply(program_id)` · `rebate_status(application_id)`

**Backend:** registry DB + DSIRE sync + Firecrawl scrapers + staleness/verification layer + eligibility engine + per-market state packs. Edge-function + `_shared/` pattern.

**Single source of truth:** `rebate_programs` **IS** the registry — extended in place. No parallel table. One resolver serves both the calculator and Cora's tools.

## 3. The three laws (non-negotiable)

### Law 1 — Filer of record

Cora may never claim a submission right we don't have.

| Program type | Who files | Platform capability |
|---|---|---|
| GA HEAR | GEFA-participating **contractor** only | `prefill_only` → hand to contractor **(v1: capped at `docs_package` — see Review Finding R1)** |
| Georgia Power HEIP | Homeowner or contractor, **within 60 days of paid invoice** | `prefill_and_submit` |
| Federal tax credits | Homeowner's **tax return** | `docs_package` (documentation, never tax advice) |
| Manufacturer (Lennox et al.) | Homeowner or dealer, post-install | `prefill_and_submit` |

Schema carries `filer_of_record` (`homeowner|contractor|either|tax_return`) and `platform_capability` (`prefill_and_submit|prefill_only|docs_package|info_only`).

**Enforcement is structural, not prompted:** the `rebate_applications` status vocabulary physically cannot reach `submitted_by_platform` unless capability allows it, and the deterministic compliance filter blocks any "I filed it" phrasing unless the application row proves it. Approved framings: *"your packet's pre-filled and ready"* · *"your contractor submits this one — I've prepped everything they need"* · *"this one goes on your tax return; here's your documentation folder."*

### Law 2 — Payment timing

Every incentive is `instant | post_install | tax_credit`, and the three **never collapse into one net figure**. Display law: **"price today $Y · money back later $X · on your taxes $Z."** Post-install money (e.g. Lennox $1,000 ≈ 4 weeks after install) is disclosed at quote AND at application, then followed by the *"your check's coming"* touch. The wait becomes a trust moment instead of a dispute.

### Law 3 — Estimated until verified

Every amount reads "estimated — verified at your proposal." Stale rows (`last_verified + stale_after_days`) render **"check at proposal," never a dollar-as-fact.** Expired rows never surface — 25C stays seeded as `expired` and serves as a permanent regression test. A wrong rebate number is worse than no rebate number.

> **Amendment 2 — Income PII deferral.** v1 auto-application covers **non-income-qualified programs only** (HEIP, EMC, manufacturer). Income-qualified programs cap at `docs_package`: Cora explains the tier, generates a checklist, flags the lead. **No income document is uploaded, stored, or transmitted anywhere in v1.** `docs_bucket_ref` exists reserved-and-unused so v2 isn't blocked. Unlock requires its own security gate (encryption at rest, retention policy, access audit).

## 4. Data model

**Extend `rebate_programs`:** `payment_timing` · `filer_of_record` · `platform_capability` · `stacking_rules jsonb` · `application_method jsonb` · `payout_window_days int4range` · `confidence_score` · `source` (`manual|dsire|scraper`) · `dsire_program_id` · `stale_after_days` (default 90).

**New tables** (all service-role-only RLS; `rebate_programs` keeps anon SELECT — public rate data, not PII):

- `utility_territories` — zip → utility (Georgia Power + ~40 EMCs + munis), seeded from NREL/OpenEI + manual verification of priority metro-ATL zips
- `rebate_applications` — **the moat.** Status: `identified → docs_ready → prefilled → awaiting_esign → {submitted_by_platform | handed_to_contractor | homeowner_tax_return} → approved/denied → paid`. Carries `deadline_at` (HEIP's 60-day clock), `amount_estimated/actual`, `nag_state jsonb`, reserved `docs_bucket_ref`
- `rebate_verification_queue` — human-in-loop; **no scraped or synced dollar change ever auto-publishes**
- `state_packs` — per-market config + `incentive_density jsonb`

## 5. Build sequence

### RUNS NOW — parallel-safe, data only

- **P10-A Research spike** (fires the moment the DSIRE key lands): DSIRE GA inventory → HVAC/heat-pump filter · metro-ATL territory mapping · Georgia Power + top-6 EMC + top-4 manufacturer program inventory → **seed dataset as files in `/data`. Zero migrations, zero UI, zero edge functions.**
- **P10-B Schema design** — paper only; `PLAN-REBATE-ENGINE-APPROVED` Part 1 is that design.

### HARD-GATED — opens at speed-to-lead Phase 5 ship + review

| Step | Contents |
|---|---|
| P10-C | Migrations (signature-probe ritual: hostname + `quiz_sessions.guzzler_score`) |
| P10-D | Registry seed · `dsire-sync` nightly cron · Firecrawl scrapers · verification queue UI |
| P10-E | Resolver promotion to `_shared/` (consumed by calculator **and** Cora tools) + territory lookup + stacking enforcement |
| P10-F | Four Cora tools as standalone edge functions *(conversational wiring depends on Phase 7's `cora-chat`)* |
| P10-G | Calculator "Your Incentive Stack" panel — **co-gated** on VisualAuditPage merge/rebase settling |
| P10-H | Applications + tap-to-approve e-sign v1 (typed name + timestamp + IP; portal/wet-signature programs fall to `prefill_only` honestly) |
| P10-I | Status tracking + outcome feedback loop → registry confidence (closed-loop intelligence nobody else has) |
| P10-J | State-pack framework + Incentive-Density Index + GA reference pack |

## 6. Integration map

```
Digital Canvasser (permit data, 11 counties, scored clusters)
        ↓ postcards / door hangers — GM APPROVED 7/24
   QR scan → guzzlerscore.com
        ↓
   Cora: AI disclosure → education → photo + bill capture
        ↓
   Guzzler Score (4 bands) + $900 photo-completion unlock
        ↓
   Repair-vs-Replace calculator ← repair history capture  [LIVE IN PROD]
        ↓
   ★ Your Incentive Stack panel  ← THIS BUILD (P10-G)
        ↓
   Speed-to-lead dual path: instant Zoom | evening virtual
        ↓
   Human close (Will) → verification visit → install
        ↓
   Rebate applications tracked to payout ← THIS BUILD (P10-H/I)
        ↓
   D.A.V.E. / Lead Avatar · outcome data → registry confidence
                          · Incentive-Density Index → next market
```

**Content engine** runs alongside as air cover for the ~80% of homeowners who don't know they need replacement.

## 7. Guardrails (carry-over from CORA.md)

AI disclosure first message, every conversation · TCPA consent-gating, STOP honored instantly · claims filter (*potential/typical/results vary*) · **Cora never quotes equipment prices** — "Will custom-builds your numbers" · full audit trail in `cora_conversations` · service-role-only RLS on all new tables · secrets via `supabase secrets set` only, never `VITE_`-prefixed · signature-probe verification before every migration · never touch ProRevenue Hub.

## 8. Keys checklist

- `DSIRE_API_KEY` — Will, 7/24 → fires P10-A same day
- `FIRECRAWL_API_KEY` — ✅ already in project secrets
- NREL/OpenEI key — free instant signup, registered at spike start
- SendGrid — **explicitly not wired here.** Tanzeel's GOLD PDF rail

## 9. Open dependencies

- Tanzeel merge sequence — **partially executed 7/24, see Review Findings**
- A2P 10DLC approval date — gates all SMS-carried rebate notifications
- Zoom S2S + Cal.com setup — Will, 7/24 (speed-to-lead Phase 5, which is this build's gate)

---

## Hermes learning notes

**"AI for leverage, human in the loop for the last mile."** Cora does discovery, education, math, paperwork, and booking. A human closes and a human verifies scope. The engine never quotes a firm price and never claims an authority it lacks.

**Structural honesty over prompted honesty.** Every compliance rule that matters is enforced by schema constraint, state machine, or deterministic filter — never by asking the model nicely. The `rebate_applications` status vocabulary is the reference implementation: it *cannot* express a lie.

**Data over deploys.** Rebate facts, thresholds, and voice rules live in rows and documents Will edits. Program changes (25C repeal, HEAR fuel-switching cutoff) hit production without touching code — a rule that has already paid for itself twice in seven months.

**Sequencing discipline.** Second-best builds wait. The rebate engine is strategically transformative and still yields the runway to speed-to-lead, because instant video calls earn revenue in August and the clearinghouse earns it in market two.

---

# FABLE 5 REVIEW FINDINGS — 2026-07-24

*Filed by the review gate on receipt of this master handoff. R2/R3 are live production defects found while verifying the merge gates; they are not this build's fault and they block other work.*

## R1 — GA HEAR capability conflict (doc vs. Amendment 2) — **resolve before P10-D seeding**

§3 Law 1 lists GA HEAR as `platform_capability = 'prefill_only'`. GA HEAR is **income-qualified**, and Amendment 2 caps income-qualified programs at **`docs_package`** for v1. Both statements are in force and they disagree; K3 seeding registry rows from the Law 1 table would silently violate the income-PII deferral.

**Ruling (stricter constraint wins):** GA HEAR is seeded **`docs_package`** in v1. `prefill_only` is its **post-v2 target state**, reachable only after the income-doc security gate (encryption at rest, retention policy, access audit) passes its own review. Both facts are true at different times; the registry row carries the v1 value and a note naming the v2 target. No income document touches this stack in v1.

## R2 — Three production migrations applied but **unrecorded** in Supabase history → next `db push` breaks

Verified on `hlzgdlomdwblxalzwurt` (ComfortIQ, signature-probed):

| Migration | Schema state | History record |
|---|---|---|
| `20260710000000_funnel_events` | table EXISTS | **missing** |
| `20260710010000_lead_source` | columns EXIST | **missing** |
| `20260723010000_rebate_realism` | columns EXIST | **missing** |

These were applied by direct `psql` during the July 10/23 builds. `supabase db push` will attempt to re-apply all three; `funnel_events` is a bare `CREATE TABLE` and will **abort the push**. (The other two are `IF NOT EXISTS`-guarded and would survive.)

**Fix (Tanzeel, one command):**
```
supabase migration repair --status applied 20260710000000 20260710010000 20260723010000
```

## R3 — `suppression_list` recorded as applied but **the table does not exist** — TCPA-critical, silent

`20260724000000_suppression_list` **is** recorded in `supabase_migrations.schema_migrations`, but the table exists in **no schema** on production. Because history says "applied," `db push` will **skip it permanently** — the table never gets created.

Impact chain: A2P approves → SMS goes live → homeowner texts STOP → the write to `suppression_list` fails → **texts keep sending to someone who opted out.** That is the exact failure the Twilio contract's rule 2 exists to prevent, and the tracking table is currently masking it. The migration's own header states every outbound path MUST check this table before sending.

**Fix (Tanzeel, before any SMS go-live):**
```
supabase migration repair --status reverted 20260724000000
supabase db push          # or apply the file directly, then verify the table exists
```
**Verify after:** the table must exist in `public` AND the version must be recorded. Both, not either.

## Merge-gate status (verified 2026-07-24)

| Gate | Status |
|---|---|
| C1 — PR #4 → main | ✅ merged (`ffa6ed4`) |
| C2 — phase-3 migration renumbered | ✅ `20260723020000_guzzler_report_pdf.sql` |
| C3 — `cora_conversations` | ⬜ does not exist — created in speed-to-lead Phase 1, as planned |
| C4 — VisualAuditPage intact post-merge | ✅ repair chat present, no carnage |
| Migration-history integrity | ❌ **R2 + R3 above** |
| phase-3 → main | ⬜ not yet merged (Tanzeel step 4) |

Tanzeel also shipped opt-out suppression, an E.164 fix, and SMS retry on `phase-3` — the Twilio contract is being executed. R3 is the gap between that work and production reality.

*Filed by Fable 5. K3: R1's ruling is binding at P10-D seeding. R2/R3 are Tanzeel's, and R3 blocks SMS go-live regardless of A2P timing.*
