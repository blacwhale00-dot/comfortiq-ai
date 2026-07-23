# ADDENDUM 2 — Cora Rebate & Incentive Engine ("The Rebate Clearinghouse")

**Date:** 2026-07-23 · **Origin:** Will — Zero Homes (Denver) teardown + 20 years of kitchen-table pain
**Status:** STRATEGY LOCKED BY WILL — filed for Fable 5 scoping. Slots AFTER speed-to-lead phases (does NOT disrupt K3's current build). Likely Phase 10 or a parallel research spike.
**Related:** `PLAN-CORA-SPEED-TO-LEAD-APPROVED.md`, `CORA.md`, repair-vs-replace calculator (the integration surface)

---

## 1. The Insight (Will's words, sharpened)

The HVAC industry is **fragmented on incentives** — utility rebates, manufacturer rebates, state/local programs, federal credits — and NOBODY at the kitchen table knows them. Not the homeowner, not the sales rep.

Will's lived reality: *"I can't begin to tell you how many homes I've been in where consumers ask 'do you know of any rebates through Georgia Power?' — and we as sales reps have no clue, and neither do they. What's more cumbersome is actually applying and filling out the paperwork."*

**Zero Homes (Denver) proved the model:** "We apply every rebate you qualify for first, which brings the total down, then finance the rest." They're expanding statewide off that pitch alone.

**We do it better** because Cora + Guzzler Score + the VSO is a bigger machine than a quote tool: the rebate engine plugs into a funnel that already diagnoses, scores, educates, books, and closes.

## 2. Why This Is the $100M Wedge

1. **Answers the #1 kitchen-table question with DATA, not "I don't know."** Instant trust. The rep who knows rebates nobody else knows wins the deal.
2. **Drops the effective price WITHOUT discounting.** "$14,200 − $2,050 in rebates we found and filed for you = $12,150." The margin stays; the homeowner saves. The $900 Guzzler Discount stacks on a verified rebate stack — killer combo.
3. **The paperwork service is the moat.** Zero Homes *applies* rebates. Cora hands the homeowner a **completed, filed application** — pre-filled from quiz data, e-signed, submission-tracked. Zero effort. Nobody in the industry does the DOING.
4. **Sharpens the repair-vs-replace math.** A $4,000 financed repair vs. a replacement that's $3,000 cheaper after rebates — the calculator verdict flips more often, and it's TRUE.
5. **LeadAvatar licensing gold.** "We bring the rebate engine for YOUR market" — every licensed contractor gets incentive intelligence their reps never had. This alone justifies the platform fee.
6. **Content engine fuel.** "Georgia Power will literally pay you $X to replace your AC and nobody tells you" — contrarian, educational, empowering. Rule 6 compliant: the facts do the work.

## 3. Can It Be Done? YES — The Architecture

```
DATA SOURCES                          REGISTRY                    DELIVERY
┌─────────────────────────┐    ┌──────────────────────┐    ┌────────────────────────┐
│ DSIRE API (canonical     │    │ rebate_registry       │    │ Cora / calculator:      │
│  free DB: fed/state/     │───▶│ (Supabase)            │───▶│ "You qualify for ~$X"  │
│  local/utility, all 50)  │    │ keyed by:             │    │ net-price display       │
│ ENERGY STAR Rebate       │    │ • zip → utility terr. │    │                         │
│  Finder (zip-keyed)      │───▶│ • equipment type      │───▶│ Auto-application:       │
│ Utility pages (Ga Power, │    │ • amount + type       │    │ pre-filled from quiz    │
│  EMCs, muni)             │───▶│ • expiration          │    │ data → e-sign → submit  │
│ Manufacturer programs    │    │ • stackability rules  │    │ → status tracking       │
│  (Carrier/Trane/Lennox/  │───▶│ • verification        │    │                         │
│  Goodman/Daikin)         │    │   timestamp + source  │───▶│ Contractor payout       │
│ Federal: IRA 25C credit  │    │ • confidence score    │    │ paperwork (point-of-    │
│  (30% up to $2k HP),     │───▶│                        │    │ sale where supported)   │
│  HEAR (up to $14k,       │    │ Refresh: scraper cron │    │                         │
│  income-qualified)       │    │ + verification queue  │    │                         │
└─────────────────────────┘    └──────────────────────┘    └────────────────────────┘
```

### Layer 1 — Rebate Registry (the database)
Supabase table, every incentive keyed by: zip/utility-territory, equipment type, amount, type (instant / post-purchase / tax credit), expiration, stacking rules, application method, source URL, `verified_at` timestamp, confidence score.

**Start narrow:** Georgia Power + Metro ATL EMCs + federal IRA + top-4 manufacturers. That's 90% of Metro ATL value with 10% of the surface area. Expand per market as LeadAvatar licensees come online (each new market = a registry seeding run).

### Layer 2 — Scraper + Refresh Agents
- **DSIRE API** does the heavy lifting (it IS the canonical database — free, maintained by NC Clean Energy Technology Center)
- Apify actors / Firecrawl for utility + manufacturer pages (structured extraction → registry rows)
- pg_cron refresh cadence + **staleness flags** (a rebate showing past its `verified_at` window displays as "check at proposal," never as fact)
- Human-in-loop verification queue for anything the scraper flags as changed — rebates change quarterly; a WRONG rebate number is a trust-killer worse than no number

### Layer 3 — Eligibility Engine
Zip → utility territory mapping (GA has 40+ EMCs + Georgia Power + munis — territory data exists), equipment match (AHRI-rated combos), income-qualifier flags for HEAR-type programs. Output: the homeowner's personal rebate stack.

### Layer 4 — Quote-Time Integration (the money moment)
Repair-vs-replace calculator gets a third panel: **"Your Incentive Stack"** — itemized, estimated-until-verified, net price computed live. This is the screen the homeowner screenshots and sends their spouse.

### Layer 5 — Auto-Application (the moat)
- Quiz already captured: name, address, equipment, photos, AHRI data, installer info
- Cora generates pre-filled applications (PDF fill or web-form submission), homeowner e-signs in one tap, Cora submits + tracks status
- Where utilities allow contractor-submitted instant rebates: point-of-sale deduction at proposal time
- Every submission logged — the outcome data (approved/denied/amount) feeds back into registry confidence scores. **Closed-loop rebate intelligence nobody else has.**

## 4. Compliance Guardrails (non-negotiable, same law as everything Cora)

1. **Estimated until verified.** All amounts display as "estimated — verified at your proposal." No rebate promise becomes a claim. ("Potential/typical/results vary" rides along.)
2. **Stacking rules enforced by the engine, not guessed.** Some utility rebates void manufacturer promos and vice versa; IRA credits interact with point-of-sale rebates. The registry stores the rules; Cora never freelances.
3. **Tax credits ≠ rebates.** 25C is claimed on THEIR taxes — Cora provides documentation, never files or implies tax advice.
4. **Income-qualified programs** (HEAR etc.) — Cora identifies eligibility and routes the application; she never asks for or stores income docs beyond what the program portal requires.

## 5. Build Order (proposed — Fable scopes)

1. **Research spike** (cheap, fast): DSIRE API access + Metro ATL territory mapping + Georgia Power program inventory → registry seed (Atlanta-only proof)
2. Registry schema + scraper cron + staleness framework
3. Eligibility engine + calculator "Incentive Stack" panel
4. Cora conversational rebate answers ("Do you know of any Georgia Power rebates?" → her best party trick)
5. Auto-application v1: pre-filled PDF generation + e-sign for the top 3 programs by dollar value
6. Submission tracking + outcome feedback loop
7. Multi-market seeding playbook (LeadAvatar licensing asset)

## 6. The LeadAvatar Multiplier

Per licensed market: one registry seeding run + territory map = the contractor's reps instantly know more than every competitor in their city. **"The rebate engine for YOUR market" is a platform-fee justification all by itself** — and every licensee's application outcomes flow back into the shared registry, compounding the data moat (the anti-Canton principle applied to incentives).

---

*Filed by Hermes per file-first workflow. No build action taken. Awaiting Will's go-ahead → Fable 5 scoping → K3 sequencing after speed-to-lead phases.*
