# Handoff — July 10 build session (Claude + Will)

> Audience: Tanzeel. Everything below is on branch `crm-command-center` (PR #4)
> unless marked **already live in prod**.

---

## 1. What shipped today, and where it lives

### D.A.V.E. CRM Command Center — `/command-center` (internal-only route)
- Page: `src/pages/CommandCenterPage.tsx` (route added in `src/App.tsx`; deliberately NOT linked from any consumer UI — brand rule: consumers only ever see GuzzlerScore)
- Analytics engine (pure functions, unit-tested): `src/lib/command-center.ts` — `stageRank` (funnel_status → milestone rank), `buildFunnelSteps` (cumulative reach + per-step drop-off), `buildRecoveryQueue` (48h-window stalls, most-urgent first), `buildDailyStats` (today's KPIs), `buildSourceBreakdown` (per-seller / per-campaign conversion)
- Tests: `src/test/command-center.test.ts` (15 cases; suite total 27 green)

### Touchpoint event log
- Migration **(already live in prod)**: `supabase/migrations/20260710000000_funnel_events.sql` — append-only, no PII, anon INSERT + SELECT
- Client lib: `src/lib/funnel-events.ts` — fire-and-forget `trackFunnelEvent`, same never-break-the-funnel contract as `persistEntryIntent`
- Instrumented call sites: `IntentGate.tsx` (door choice), `QuizPage.tsx` (start / each answer / gate / contact / score reveal), `useAuditUpload.ts` (per-photo + GOLD), `IncompletePage.tsx` (expired view)

### Lead-source attribution
- Migration **(already live in prod)**: `supabase/migrations/20260710010000_lead_source.sql` — `lead_source`, `utm_source/medium/campaign`, `referrer` on `quiz_sessions`
- Classifier: `src/lib/lead-source.ts` — first-touch, localStorage-persisted; paid (UTM mediums) / partner (`?src=oncore` short links or partner mediums) / organic (search referrers) / direct. `ref=guzzlerscore_landing` is an internal marker, never a partner.
- **Gotcha that cost us a bug**: `captureLeadSource()` runs in `src/main.tsx` BEFORE the router mounts — `/assess` redirects strip the query string before any effect can read it. Don't move it into the tree.
- Stamped from all three session-creation paths: `QuizPage.saveSession`, `QuizPage.handleGateSubmit`, `ExpressAuditGate`.

### guzzlerscore.com landing page tie-in
- The landing page (built ~June 26, previously loose at `~/projects/comfortiq/guzzlerscore-landing.html`) is now versioned at `landing/index.html`
- Added a pass-through script at the bottom: forwards `utm_*`, `src`, `ref`, `gclid`, `fbclid` from the landing URL onto every `app.guzzlerscore.com` link, so cross-domain attribution survives
- App side: new `/assess` → `/quiz` redirect (`src/App.tsx`) so the landing CTAs (`app.guzzlerscore.com/assess?ref=guzzlerscore_landing`) resolve
- Founder-video placeholder still awaits Will's ~90s video (drop-in instructions are inline in the HTML)

---

## 2. Production state (done tonight via psql + supabase CLI — no action needed)

- **Migrations applied**: `funnel_events`, `lead_source`, and `_pending_redesign/20260623000000_upload_air_handler.sql` — that last one was a **live bug**: the app writes `upload_air_handler` on every air-handler upload and the column didn't exist, so those updates were failing silently.
- **Cora SMS pipeline is fully operational**: pg_cron (`send-due-reminders`, `*/5`) was already scheduled but Vault was empty → both Vault secrets now set (`cora_reminders_function_url`, `cora_reminders_service_key`). `TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM` set as edge-function secrets. Both functions (`send-due-reminders`, `analyze-audit`) deployed from this repo.
- **Twilio**: funded account, number **+1 (470) 600-8742** ("GuzzlerScore Cora SMS").
- **E2E test result**: worker → `{"processed":1,"sent":1}`, Twilio accepted, **carrier blocked with error 30034** (US A2P 10DLC unregistered). The pipeline is code-complete; **A2P brand/campaign registration is the sole delivery blocker** (Will is on it with the Twilio rep).
- ⚠️ **`analyze-audit` is broken in prod as written**: it requires `LOVABLE_API_KEY` (Lovable AI gateway) which is NOT among the project's edge secrets (we have `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `FIRECRAWL_API_KEY`). With a real `sessionId` it returns "AI API key not configured". Either add the Lovable key or port it to the Anthropic/Gemini key that's already there.

## 3. Known security debt (deliberate, needs a follow-up PR)
`quiz_sessions` RLS allows public SELECT (pre-existing pattern), which the command center currently relies on — meaning lead PII is readable with the anon key. Plan: add operator auth (Supabase Auth), tighten `quiz_sessions`/`funnel_events` SELECT to authenticated operators, and gate `/command-center` behind login before contractor demos.

---

## 4. Gap analysis: the verified post-upload score + dynamic PDF (Will's next priority)

Will's spec: after the photos, an **8-subset weighted verified score** combining quiz answers + photo evidence → total cost of ownership, load calculation (under/over/right-sized verdict), unit age, cost-to-keep-the-guzzler, plus a health explanation of the existing system → delivered as a **FREE dynamic PDF** (GOLD tier only).

### What already exists
| Piece | Where | State |
|---|---|---|
| Weighted category engine (4 categories: Equipment 30% / Efficiency 25% / Envelope 25% / Maintenance 20%, per-question weights, waste drivers, dollar waste, JSON report) | `~/comfortiq/guzzler_score.py` (1,391 lines, v1.3.0) | **Reference implementation, NOT integrated** — the app ships a simpler 4-factor TS engine (`src/lib/guzzler-score.ts` + `guzzler-reveal.ts`) |
| Power Tax math (SEER-by-age, Atlanta cooling hours, duct heat gain, SEER gap) | `blueprint-logic-engine.md` Parts 1–3 (in this repo) | Spec only, no code |
| `calculate_power_tax()` SQL function | `supabase-schema.sql` (repo root) | Designed, never applied |
| PDF spec (3-page report; GOLD-only delivery rule) | `blueprint-logic-engine.md` Part 7 + `~/comfortiq/the-mechanics-of-comfort-iq-with-cora.md` §9 | Spec only |
| Post-upload analysis | `supabase/functions/analyze-audit/index.ts` → `VisualAuditPage` | **Thin generic stub**: AI writes a summary/insights/savings guess from pain scores + photo *counts*. It never reads the photos. Plus the broken-key issue above. |
| Trophy hand-off | `TrophyPage.tsx` | Records completion; comment literally says "PDF/email backend can pick it up later" — **no PDF backend exists** |

### What does NOT exist anywhere (the actual build)
1. **Photo intelligence** — nothing reads the uploads. No vision extraction of model/serial/SEER/tonnage/age from the data plate, no thermostat/breaker/bill parsing. (The designed-but-unapplied `photos` table in `supabase-schema.sql` has `ai_analysis` / `extracted_*` columns ready for exactly this.)
2. **Load calculation** — no Manual-J-style sizing verdict (needs sqft + envelope answers + extracted tonnage). Blueprint Part 1.5 has the duct-gain math to seed it.
3. **8-subset verified score** — both existing engines use **4** categories. The 8-subset structure needs defining with Will; natural candidates: the 4 quiz categories + 4 photo-verified subsets (Sizing/Load, True Cost of Ownership, Equipment Age & Health, Bill-verified Power Tax).
4. **Dynamic PDF generation + email delivery** — nothing built. GOLD-trigger rule is specced in mechanics doc §9.

### Suggested build order
1. Define the 8 subsets + weights with Will (30-min conversation, then freeze as config like `guzzler_score.py` does)
2. Vision pass on the 5 uploads (Anthropic key is already in the project secrets) → write `photos`-style extraction columns
3. Verified-score engine (port `guzzler_score.py` weighting + Power Tax math to TS or an edge function; inputs = 12 answers + extractions)
4. Load-calc verdict (sqft + envelope + tonnage → under/over/right-sized)
5. PDF renderer (edge function; react-pdf or Typst/weasyprint-style HTML→PDF) + email delivery on GOLD, per mechanics §9
6. Surface the verified score in TrophyPage + the PDF link, and mirror it into the command center

---

*Full session context: PR #4 description, and the July 10 commits on this branch.*
