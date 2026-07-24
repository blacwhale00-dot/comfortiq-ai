# KICKOFF — Cora Rebate Clearinghouse Engine (Phase 10)

**Date:** 2026-07-23 · **For:** Claude Code Fable 5 (plan/review gate) · **Approved by:** Will
**Companion spec:** `ADDENDUM-2-REBATE-ENGINE.md` (§1-§9 — full context + Will's field law)

---

You are Fable 5: the plan/review gate. K3 implements after your plan is approved.

## Repo (start here)
GitHub: https://github.com/blacwhale00-dot/comfortiq-ai.git
Pull latest `main` — all canonical docs are synced in `/docs`.

## Read order (mandatory, in this sequence)
1. `docs/ADDENDUM-2-REBATE-ENGINE.md` — YOUR BUILD SPEC. §1-§9. Contains Will's field law (solar playbook §7, payment-timing guardrails §8, architecture decision §9).
2. `docs/PLAN-CORA-SPEED-TO-LEAD-APPROVED.md` — the integration surface. This engine slots as Phase 10 and must NOT disturb Phases 1-9 (speed-to-lead is K3's active build).
3. `docs/CORA.md` — voice law + guardrails. The rebate engine speaks through Cora; every disclosure rule in here applies to rebate copy.
4. `docs/HANDOFF-TANZEEL-2026-07-23.md` — merge order (PR #4 → phase-3 renumbered → K3 builds) still gates everything. Verify Tanzeel's sequence completed first.

## WHY this is transformative (the context Will gave — internalize it)

The HVAC industry is fragmented on incentives. At thousands of kitchen tables, homeowners ask "do you know of any rebates through Georgia Power?" — and sales reps have NO clue. Neither do the homeowners. And even when a rebate is found, the paperwork to claim it is so cumbersome most money goes unclaimed.

Zero Homes (Denver) proved the demand: "we apply every rebate you qualify for first, which brings the total down, then finance the rest" — they expanded statewide on that pitch alone. We do it better: Cora doesn't just FIND rebates, she FILES them — pre-filled from quiz data, one-tap e-sign, submission-tracked. The paperwork service is the moat. Nobody in the industry does the DOING.

From the solar industry: virtual reps only sold in the most-incentivized states because the savings sold the system. HVAC has never done incentive-driven market selection. The rebate registry doubles as our expansion map (Incentive-Density Index, spec §7) — this is the engine that makes LeadAvatar licensable nationwide.

This is not a feature. It is the difference between Cora being a chatbot and Cora being the most capable sales entity in the HVAC industry: score interpreter, educator, scheduler, rebate clearinghouse, and paperwork filer — one voice.

## Architecture (LOCKED — spec §9, do not re-litigate)

Baked INTO Cora as tools. Built as separate BACKEND SERVICES. No new app surface, no new persona. Cora gets four new tools:
`rebate_lookup(zip, equipment)` · `rebate_stack(session_id)` · `rebate_apply(program_id)` · `rebate_status(application_id)`
Backend: rebate_registry DB + scraper crons + eligibility engine + staleness/verification layer + per-market state packs. Fits the approved plan's edge-function + `_shared/` pattern.

## Build sequence (proposed — you scope the phases)

1. **RESEARCH SPIKE** (data-only, no UI — safe to run PARALLEL to Phases 1-9): DSIRE API access + Metro ATL territory mapping (Georgia Power + 40 EMCs + munis) + program inventory → registry seed. Atlanta-only proof first.
2. **rebate_registry schema:** keyed by zip/territory + equipment; amount, type (instant | post-install | tax-credit), expiration, stacking rules, source URL, verified_at, confidence, status (active|expiring|expired).
3. **Scraper crons + staleness framework + human verification queue.** LAW: a stale rebate displays as "check at proposal," NEVER as fact.
4. **Eligibility engine:** zip → utility territory, equipment match, income flags.
5. **Calculator "Your Incentive Stack" panel** (integration point: repair-vs-replace results screen — coordinate with K3's merge sequence; VisualAuditPage rebase is K3's).
6. **Cora's four tools** + conversational rebate answers.
7. **Auto-application v1:** pre-filled PDF + e-sign for top-3 programs by dollar value.
8. **Submission tracking + outcome feedback loop** (approved/denied/amount → registry confidence — closed-loop intelligence nobody else has).
9. **State-pack framework + Incentive-Density Index** (LeadAvatar expansion map).

## Will's field law (NON-NEGOTIABLE — spec §8)

- **PAYMENT TIMING:** every incentive is INSTANT / POST-INSTALL / TAX-CREDIT. Post-install money (e.g., Lennox $1,000 = ~4 weeks AFTER install) must ALWAYS display as "price today $Y, money back later $X" — never one collapsed net figure. Cora discloses timing at quote AND application, then sends the post-install "your check's coming" touch. The wait becomes a trust moment, not a dispute.
- **LIVE STATUS:** 25C ($2,000 heat pump credit) is TERMINATED after 12/31/2025. Registry status fields are load-bearing: expired rows are never presented; expiring rows get deadline framing. A WRONG rebate number is worse than none.
- **ESTIMATED UNTIL VERIFIED:** all amounts "estimated — verified at your proposal."
- Stacking rules enforced by the engine, never guessed. Tax credits: Cora provides documentation, never tax advice.

## Inbound credentials (Will delivers 2026-07-24 — plan around them)

- **DSIRE API key** → the research spike + registry seed (THIS BUILD)
- **Zoom S2S app credentials** → Phase 5 (speed-to-lead, separate)
- **SendGrid API key** → Tanzeel's dynamic GOLD Guzzler Score PDF rail (NOT this build — do not wire email sending into the rebate engine; rebate notifications reuse whatever rail Tanzeel ships)

## Guardrails (carry-over from CORA.md)

AI disclosure first message · TCPA consent-gating · claims filter (potential/typical/results vary) · Cora never quotes equipment prices · full audit trail in `cora_conversations` · service-role-only RLS on all new tables (Amendment pattern from the approved plan).

## Deliverable (your job NOW)

Produce the implementation plan: phased build order per the sequence above, file-by-file changes, registry schema + migrations, DSIRE integration approach, scraper/cron design with the staleness framework, eligibility engine logic, the calculator panel integration point (flag merge-order coordination with K3's active build), Cora tool definitions, and the state-pack format. Include a "keys checklist" section so the Phase-1 spike starts the moment Will drops the DSIRE key.

NO production code until Will approves your plan. Plan first, gate, then K3 builds.
