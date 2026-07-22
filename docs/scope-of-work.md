# Comfort IQ — Scope of Work
## Single-App Build: Guzzler Score Quiz + Lead Pipeline + Newsletter

**Prepared for:** Tanzil  
**Prepared by:** Will Macon + Hermes (D.A.V.E.)  
**Date:** June 14, 2026  
**Contract:** $1,500 total | $500 deposit paid | Balance: $1,000 on completion

---

## 0. Project Overview

Comfort IQ is a **single Lovable application** on a **single Supabase database**. No multi-app architecture. No API bridges. No data sync.

**Two sections, one app:**

- **Public (no auth):** Homeowners take a 12-question quiz → upload 7 equipment photos → receive a verified Guzzler Score (0–100) → unlock a $900 discount → book a virtual consultation → get a free dynamic PDF audit report → opt into The Guzzler Score newsletter (beehiiv).
- **Authenticated (Will only):** Will manages the lead pipeline — views leads by tier, tracks Guzzler Scores, logs which leads were sold to which contractors, and manages pricing. This replaces the old "D.A.V.E. CRM" as a separate app — it's now just the `/dashboard` section of Comfort IQ.

**Business model: Paper leads only.** No leasing. No rent-to-own. No contractor retainers. Will sells qualified leads outright to HVAC contractors. The app is a lead-generation and lead-management tool for a single operator.

The platform is currently scaffolded in **Lovable** (frontend) with **Supabase** (backend). This SoW covers the end-to-end build of all components, integrations, and automations within one codebase.

---

## 1. Tech Stack Summary

| Layer | Tool / Service | Purpose | Status |
|-------|---------------|---------|--------|
| **Frontend** | Lovable (lovable.dev) | Hosted React app, visual builder, MCP server | ✅ Pro plan active ($20/mo) |
| **Backend / Database** | Supabase | Postgres DB, Auth, Storage, Edge Functions, Realtime, RLS | ✅ Provisioned via Stripe Projects |
| **Scoring Algorithm** | Custom JS/Edge Function | 12 inputs + 7 photos + EDS → 8 weighted subscores → Guzzler Score 0–100 | 🔨 To build |
| **Load Calculation** | EDS (Energy Design Systems) API | Manual J load calc — sizing mismatch subscore | 🔨 To integrate |
| **Photo OCR** | Google Vision API | Extract SEER, tonnage, manufacture date from data plate photos; kWh/rate from electric bills | 🔨 To integrate |
| **SMS** | Twilio | Abandoned funnel recovery, Cora follow-up, contractor lead alerts | 🔨 To integrate |
| **Email** | SendGrid or Supabase Email | PDF delivery, Cora nurture sequences | 🔨 To integrate |
| **Newsletter** | beehiiv | Quiz → newsletter opt-in via API. Hosts The Guzzler Score newsletter (email capture, video embeds, image ads). Drives traffic back to quiz. | 🔨 To integrate |
| **PDF Generation** | Supabase Edge Function + Puppeteer/Playwright or API (PDFMonkey/Doctly) | Dynamic 4-page Guzzler Audit report per homeowner | 🔨 To build |
| **Calendar** | Calendly or Cal.com | Virtual consultation booking → webhook triggers PDF delivery | 🔨 To integrate |
| **Permit Data** | Shovels API | Pull historical HVAC permits by ZIP code for Guzzler Map | 🔜 Phase 2 |
| **Web Scraping** | Firecrawl | County tax assessor records for property enrichment | 🔜 Phase 2 |
| **AI Research** | Perplexity API | ZIP-level demographics, utility rates, income data | 🔜 Phase 2 |
| **Payments** | Stripe | Out-of-network $14.99 PDF purchases, contractor lead payments | 🔨 To integrate |
| **Video** | HyperFrames | HTML/CSS/JS → MP4 ads for Guzzler Score social content | ✅ Working (separate project) |
| **Orchestration** | Hermes Agent (D.A.V.E.) | Agent-driven automation, CRM intelligence, daily content generation (newsletter, video), contractor alerts | ✅ Active |

---

## 2. Build Phases — Sequenced

### PHASE 1: Foundation — Supabase Schema + Auth + Lovable Wiring
**Estimated effort:** Days 1–4

#### 1.1 Supabase Schema Design

Build the following tables with Row Level Security (RLS) policies:

**Core Tables:**
- `homeowners` — id, email, phone, name, address, zip_code, service_area (in/out network), created_at
- `quizzes` — id, homeowner_id, status (started/completed/abandoned), preliminary_score, started_at, completed_at
- `quiz_answers` — id, quiz_id, question_number (1–12), answer_value, answer_text, created_at
- `photo_uploads` — id, quiz_id, photo_type (enum), photo_set (1–4), dollar_value, storage_path, upload_status (uploaded/skipped/processing/processed), created_at
- `vision_results` — id, photo_id, extracted_data (JSONB), confidence_score, created_at
- `guzzler_scores` — id, quiz_id, score_type (preliminary/verified), total_score, subscores (JSONB), calculated_at
- `appointments` — id, quiz_id, homeowner_id, calendly_event_id, scheduled_at, status (booked/completed/cancelled/no_show), created_at
- `pdf_reports` — id, quiz_id, storage_path, generated_at, delivered_at, delivery_method (email/sms)
- `leads` — id, quiz_id, tier (yellow/orange/red/green), tier_price, ttt_multiplier, final_price, sold_to (contractor name), sold_price, sold_at, status (available/sold/lost)
- `beehiiv_subscriptions` — id, homeowner_id, beehiiv_subscriber_id, subscribed_at, unsubscribed_at, source (quiz_optin/manual)
- `cora_conversations` — id, homeowner_id, message_log (JSONB), last_message_at — in V1 this logs the scripted touches below; in V2 it is the full audit trail for the conversational Cora engine (every inbound/outbound message — see **CORA.md** §5 guardrail 6 and `CORA-V2-EXPANSION.md` §5)
- `sms_log` — id, homeowner_id, twilio_sid, direction (inbound/outbound), message_body, sent_at
- `funnel_events` — id, homeowner_id, event_type (enum), event_data (JSONB), created_at

**RLS Policies:**
- B2C consumers can only read/write their own data
- Admin (Will) has full read/write across all tables
- Electric bill photos: separate storage bucket with restricted access policy
- No contractor roles — Will is the sole operator. Lead sales tracked via `leads.sold_to` field.

#### 1.2 Lovable ↔ Supabase Wiring
- Connect Lovable project to Supabase via MCP server
- Configure environment variables in Lovable: SUPABASE_URL, SUPABASE_ANON_KEY
- Set up Lovable's database query tools to point at Supabase tables

#### 1.3 Authentication
- Supabase Auth for homeowners (email + magic link OR phone OTP)
- RLS policies tied to auth roles
- Will accesses `/dashboard` via a single admin account (Supabase Auth with admin RLS role)

**Tools needed:** Supabase, Lovable, Stripe Projects (for Supabase provisioning)

---

### PHASE 2: The Quiz Engine — 12 Questions → Preliminary Score
**Estimated effort:** Days 4–7

#### 2.1 Quiz Frontend (Lovable)
- 12-question flow, one question per screen, progress bar
- Mobile-first design (this is a phone experience)
- Each answer stored to `quiz_answers` on selection (no bulk submit — prevents data loss on abandonment)
- Question 12: "Considering replacement?" is the last question

#### 2.2 Scoring Engine (Supabase Edge Function)
- Edge function: `calculate-guzzler-score`
- Input: quiz_id
- Process: fetch all 12 answers → map to subscore values → apply weights → compute total
- Output: preliminary score (0–100), subscore breakdown (JSONB), tier color
- Stored to `guzzler_scores` with `score_type = 'preliminary'`

**Scoring weights (configurable, not hardcoded):**
```
Age Factor:        0.22  (Q1)
Energy Drain:      0.20  (Q2, Q11)
Repair Bloodloss:  0.20  (Q3, Q4)
Sizing Mismatch:   0.15  (EDS — defaults to 0.50 if unavailable)
Comfort Fail:      0.10  (Q5, Q6)
Noise & Behavior:  0.06  (Q7, Q8)
Maintenance:       0.05  (Q9, Q10)
Readiness:         0.02  (Q12)
```

**Tier color output:**
- 0–49 → Yellow (Low Guzzler)
- 50–75 → Orange (High Guzzler)
- 76–100 → Red (Critical Guzzler)
- Green = Will manually marks as "Virtual Conditional Proposal Signed" (Phase 5)

#### 2.3 Preliminary Score Reveal Screen
- Large score number + color-coded gauge bar
- Subscore breakdown: each subscore shown with contribution and label
- CTA: "Get your TRUE verified score — upload 7 photos, unlock $900" (transitions to Phase 3)
- If homeowner leaves here → funnel event logged: `preliminary_score_viewed`

**Tools needed:** Lovable, Supabase Edge Functions

---

### PHASE 3: Photo Verification Pipeline — 7 Photos → Verified Score
**Estimated effort:** Days 7–12

#### 3.1 Gamified Photo Upload Flow (Lovable)
- 4 sets, 7 photos total, sequential, cannot skip sets
- Dollar unlock progress bar: 0% → 43% → 57% → 71% → 100%

| Set | Photos | Dollar Value | Cumulative |
|-----|--------|-------------|------------|
| Set 1: Outdoor Unit | 3 photos (stand-back, close-up, data plate) | $325 | $325 |
| Set 2: Breaker Panel | 2 photos (panel closed, open box) | $100 | $425 |
| Set 3: Thermostat | 1 photo | $75 | $500 |
| Set 4: Electric Bill | 1 photo | $500 | **$900** |

#### 3.2 Cora AI Between Sets (Text Prompts)
Cora is NOT a real-time AI here — she's scripted encouragement between photo sets:
- After Set 1: "$325 unlocked! Now the easy stuff — two quick shots of your breaker panel."
- After Set 2: "$425 and counting. Just one shot of your thermostat."
- After Set 3: "$500 down. Grab your electric bill — this one's worth $500."
- After Set 4: 🎉 Confetti + "$900 unlocked! Here's your verified score..."

#### 3.3 Safety Disclaimer (MANDATORY before Sets 1 & 2)
"Only upload photos that are easy and safe to take. Please don't open electrical panels if you're uncomfortable, move equipment, enter crawlspaces or attics, or touch anything electrical."

#### 3.4 Photo Upload → Supabase Storage
- Each photo uploaded to Supabase Storage bucket: `photo-verification`
- Separate bucket for electric bills: `electric-bills` (restricted RLS)
- Row written to `photo_uploads` with upload_status = `uploaded`

#### 3.5 Google Vision OCR (Supabase Edge Function)
- Edge function: `process-photo-ocr`
- Triggered on new row in `photo_uploads` where upload_status = `uploaded`
- Sends photo to Google Vision API
- Extracts:
  - **Data plate photo:** SEER rating, tonnage, manufacture date, refrigerant type, model number
  - **Electric bill photo:** kWh usage, monthly cost, rate tier, billing period
- Results written to `vision_results`
- `photo_uploads.upload_status` updated to `processed`

#### 3.6 Verified Score Calculation
- After all 7 photos processed (or skipped): edge function `calculate-verified-score`
- Google Vision data OVERRIDES self-reported quiz answers where confidence is high:
  - Actual manufacture date → replaces Q1 (age)
  - Actual SEER → replaces Q11
  - Actual energy usage → replaces Q2
- EDS load calc integrated for Sizing subscore
- Output: verified score, updated subscores, stored to `guzzler_scores` with `score_type = 'verified'`

#### 3.7 Skip Handling
- Any photo can be skipped (do NOT block progress)
- Skipped photos: `upload_status = 'skipped'`
- Missing data flagged in lead record for Will's consultation
- Score calculates with available data; missing inputs use preliminary quiz values

**Tools needed:** Lovable, Supabase Storage, Supabase Edge Functions, Google Vision API, EDS API

---

### PHASE 4: The Funnel — Score → PDF → Calendar → Cora
**Estimated effort:** Days 12–17

#### 4.1 Verified Score Result Screen
- Full verified Guzzler Score with subscore breakdown
- Color-coded gauge bar
- Messaging: "Normally this engineering audit costs $99. Because you completed the assessment, it's FREE when you book your 20-minute Virtual Conditional Approval call."
- CTA: "Book Your Call — Claim Your $900 Discount + Free Audit Report"

#### 4.2 ZIP Code Service Area Check
- Before showing booking/paywall options, check homeowner ZIP against `service_areas` table
- **In-Network:** PDF = FREE with call booking
- **Out-of-Network:** "We don't have a certified team in your area yet. Download your Guzzler Audit for $14.99 to hand to your local contractor."

#### 4.3 Calendar Booking Integration
- Calendly (or Cal.com) embedded or redirected
- Webhook on booking confirmed → Supabase Edge Function triggers:
  1. Write to `appointments` table
  2. Generate PDF (Phase 4.4)
  3. Email PDF to homeowner + CC Will
  4. Create lead record in `leads` table with tier color from score

#### 4.4 Dynamic PDF Generation
- Edge function: `generate-guzzler-pdf`
- 4-page report template populated with:
  - Page 1: Guzzler Score + gauge + "HIGH/MODERATE/LOW GUZZLER" label
  - Page 2: Subscore breakdown with explanations
  - Page 3: EDS load calc summary + sizing analysis
  - Page 4: Recommended next steps + $900 discount confirmation
- Generated as PDF, stored to Supabase Storage bucket `pdf-reports`
- Emailed to homeowner via SendGrid

#### 4.5 Cora SMS Follow-Up (Twilio)

> **⚠️ Canonical reference: CORA.md.** Cora's persona, voice, guardrails, handoff protocol, and objection library are defined in **CORA.md** (the Cora playbook), per the strategy brief `CORA-V2-EXPANSION.md`. This section documents only the **V1 scripted beats**, which remain in force as the **scripted fallback layer** under the V2 conversational engine. Do not delete them — if the V2 engine is down, unreachable, or a message fails the compliance filter, these scripted touches still fire. A homeowner in an active sequence is never left in silence.
>
> **The V2 capability ladder** (build order, each independently shippable — full spec in `CORA-V2-EXPANSION.md` §2):
> - **L1 — Score Interpreter:** conversational breakdown of the homeowner's verified score and 8 subscores
> - **L2 — Objection Handler / FAQ:** Will's 20 years of kitchen-table objections (library lives in CORA.md §7)
> - **L3 — Educator / Frame-Setter:** pre-appointment primer (conditional proposal, Site Condition Schedule, three-outcome close)
> - **L4 — Scheduler:** owns Will's Cal.com calendar — books, reschedules, T-24h/T-2h reminders, no-show recovery
> - **L5 — Nurture / Reactivation:** stalled-lead sequences, conversational T+72h winback (upgrades the static V1 template below), seasonal triggers
>
> **V1 scripted beats (fallback layer — keep, always on):**
> - After PDF delivered: Cora sends SMS "Hi [Name], your Guzzler Audit is in your inbox! Looking forward to our call on [date]. Reply STOP to opt out."
> - Day-of reminder: SMS 2 hours before scheduled call
> - Post-call follow-up: SMS thanking them, with Will's direct contact
> - Static T+72h winback template (see §6.3) — upgraded to a conversational winback by L5, retained as fallback

#### 4.6 beehiiv Newsletter Opt-In
- After verified score reveal (regardless of booking), display newsletter CTA:
  "Want weekly tips to keep your HVAC from guzzling cash? Join The Guzzler Score newsletter — free."
- Checkbox: pre-checked, homeowner can uncheck (GDPR/CCPA compliant)
- On opt-in → Supabase Edge Function `subscribe-to-beehiiv`:
  - POST to beehiiv API: `POST /publications/{pubId}/subscriptions`
  - Body: `{ email, utm_source: "guzzler_quiz", custom_fields: { guzzler_score, tier, zip_code } }`
  - Write to `beehiiv_subscriptions` table
  - Store `beehiiv_subscriber_id` for future unsubscribe handling
- Newsletter strategy (handled by Will + Hermes, NOT Tanzil):
  - Hermes sub-agents generate daily newsletter content (The Guzzler Score)
  - beehiiv hosts video embeds (B-roll reels, YouTube long-form), image ads
  - Low-cost Facebook/IG ads ($1–2/day) → drive traffic to newsletter → newsletter links to quiz
  - **Growth flywheel:** Ads → Newsletter → Quiz → Lead capture → Revenue → More ads

#### 4.7 Out-of-Network Payment Flow
- Stripe Checkout for $14.99 one-time payment
- On payment success: generate and deliver PDF (no call booking)
- Lead NOT created in marketplace (out of service area)

**Tools needed:** Lovable, Supabase Edge Functions, Calendly API, SendGrid, Twilio, Stripe, PDF generation service

---

### PHASE 5: Lead Pipeline Dashboard — Will's Internal Tool
**Estimated effort:** Days 17–22

#### 5.1 Lead Creation & Tiering
- On verified score completion → auto-create lead in `leads` table
- Tier assignment based on Guzzler Score + TTT multiplier:

| Tier | Color | Score Range | Base Price |
|------|-------|------------|-------------|
| Tier 1 — Service | 🟡 Yellow | 0–49 | $200 |
| Tier 2 — Replacement | 🟠 Orange | 50–75 | $400 |
| Tier 3 — Pre-Sold | 🔴 Red | 76–100 | $550 |
| Tier 4 — Virtual Prop | 🟢 Green | Any (Will-signed) | $600+ |

#### 5.2 Time-to-Talk (TTT) Multiplier
Question at end of quiz: "When are you looking to address this?"

| Timeline | Multiplier | Badge |
|----------|-----------|-------|
| ASAP / Emergency | 1.5× | 🔥 SURGE |
| 1–2 Weeks | 1.0× | Standard |
| Within 30 Days | 0.75× | Warm Pipeline |
| 3+ Months | 0.50× | Nurture |

Final Lead Price = Base Tier Price × TTT Multiplier

#### 5.3 Lead Pipeline Dashboard (Lovable, Auth-Gated)
Will's internal dashboard at `/dashboard`:
- **Lead list** organized by tier (Green → Red → Orange → Yellow)
- Each lead card shows:
  - Guzzler Score + tier color + TTT badge
  - Homeowner name, city, ZIP
  - System specs (age, SEER, tonnage)
  - Call status (booked/completed/not booked)
  - Current price + mark as sold button
- **Filters:** tier, score range, ZIP, TTT urgency, call status
- **Lead detail view:** full quiz answers, all 7 photos, Google Vision OCR data, subscores, Cora conversation log, appointment history
- **Sales log:** mark lead as sold → enter contractor name, sale price, date → moves to "sold" status

#### 5.4 Green Tier Workflow
- Will completes virtual conditional proposal → manually marks lead as "Green" in dashboard
- Will sells Green lead to specific contractor (manual — no contractor portal)
- Lead logged as `sold` with contractor name and final price
- No revenue share tracking in V1 — Will sets the price

#### 5.5 Notifications (Twilio)
- ASAP 🔥 SURGE leads: highlighted at top of dashboard (no SMS needed — Will checks dashboard)
- Optional: daily digest SMS to Will summarizing new leads and SURGE leads

**Tools needed:** Lovable, Supabase, Twilio

---

### PHASE 6: Funnel Recovery — Abandoned Lead Re-engagement
**Estimated effort:** Days 22–26

#### 6.1 Funnel Event Tracking
Log every step to `funnel_events` table:

```
Event Types:
- quiz_started
- quiz_q1–q12 (per question answered)
- quiz_completed
- preliminary_score_viewed
- photo_set_1_started/completed
- photo_set_2_started/completed
- photo_set_3_started/completed
- photo_set_4_started/completed
- verified_score_viewed
- calendar_viewed
- appointment_booked
- pdf_delivered
- funnel_abandoned (with last_event field)
```

#### 6.2 Abandonment Detection
- Define abandonment: no new funnel_event for [X] minutes after last event
- Different thresholds per funnel stage:
  - Mid-quiz: 30 minutes
  - Post-quiz (no photos): 2 hours
  - Mid-photos: 4 hours
  - Post-verification (didn't book): 24 hours

#### 6.3 Twilio SMS Recovery Sequences

**Drop-off during quiz (no phone captured yet):**
- Send email if email was captured early
- No SMS possible — no phone number

**Drop-off after quiz complete but before photos:**
- T+1 hour: "Hey [Name], your preliminary Guzzler Score is XX/100 — but the real number is on your data plate. Upload 7 quick photos and unlock your $900 discount: [link]"
- T+24 hours: "Still curious about your TRUE Guzzler Score? Your $900 discount is waiting: [link]"
- T+72 hours: Final nudge, then move to cold nurture

**Drop-off mid-photos:**
- T+2 hours: "You're halfway to your $900 discount! Just [X] more photos: [link]"
- T+24 hours: Reminder with dollar amount unlocked so far

**Drop-off after verification (didn't book call):**
- T+1 hour: "Your system is a [Score]/100 — [Tier]. Book your free 20-min call and get your full audit report + $900 discount: [calendar link]"
- T+24 hours: "The $900 Guzzler Discount is time-sensitive. Grab a slot this week: [link]"
- T+72 hours: Cora personal message: "Hi [Name], Cora here. I crunched your numbers and your [age]-year-old [SEER] system is costing you more than it should. Will has a few slots open this week — want me to grab one for you?"

#### 6.4 Cross-Device Recognition
- Use Supabase `homeowner_id` (tied to email/phone) to recognize returning users
- If homeowner resumes on desktop after abandoning on phone: do NOT send recovery SMS
- Check `funnel_events` for recent activity before triggering any recovery message

#### 6.5 Cora AI Integration (Future Enhancement)
- Cora as conversational SMS agent using Twilio webhooks
- Responds to homeowner replies in recovery sequences
- Routes complex questions to Will
- This is Phase 6.5 — not required for MVP but architected now

**Tools needed:** Supabase (funnel_events table + triggers), Twilio SMS, SendGrid email

---

### PHASE 7: Data Engine — Guzzler Map (Post-MVP)
**Estimated effort:** Days 28+ (Phase 2 build)

#### 7.1 Shovels API Integration
- Query historical HVAC permits: 2008–2014 date range
- Filter: single-family residential, target ZIP codes
- Output: address list with installation year, jurisdiction, permit type

#### 7.2 Firecrawl Enrichment
- Batch scrape county tax assessor records for priority addresses
- Extract: homeowner name, square footage, year built, assessed value

#### 7.3 Perplexity ZIP-Level Data
- Demographics, utility rates, income bands per ZIP code
- Used for prioritization, not per-address

#### 7.4 Guzzler Map Dashboard
- Internal dashboard color-coding enriched properties
- Filterable by ZIP, score range, system age
- Exportable lead vault for contractor pitches

**Tools needed:** Shovels API, Firecrawl, Perplexity API

---

## 3. Complete Tools & APIs Reference

| # | Tool / API | Purpose | Key Needed | Documentation |
|---|-----------|---------|-----------|---------------|
| 1 | **Supabase** | Database, Auth, Storage, Edge Functions, RLS | `SUPABASE_ACCESS_TOKEN` (sbp_...) | supabase.com/docs |
| 2 | **Lovable** | Frontend React app, visual builder | `lov_` API key | lovable.dev |
| 3 | **Google Vision API** | OCR on data plates, electric bills | GCP service account key | cloud.google.com/vision |
| 4 | **EDS API** | Manual J load calculations | EDS account credentials | eds.tech |
| 5 | **Twilio** | SMS recovery, Cora follow-up | Account SID + Auth Token | twilio.com/docs |
| 6 | **SendGrid** | Transactional email (PDF delivery, reminders) | API key | sendgrid.com |
| 7 | **Calendly** | Virtual consultation booking | API key + webhook URL | calendly.com/api |
| 8 | **Stripe** | Payments (out-of-network PDF, contractor lead purchases) | Publishable + Secret key | stripe.com/docs |
| 9 | **beehiiv** | Newsletter subscriptions via API | API key (from beehiiv dashboard → Settings → API Keys) | developers.beehiiv.com |
| 10 | **Shovels API** | Historical HVAC permit data | API key | shovels.com |
| 11 | **Firecrawl** | County tax assessor scraping | API key | firecrawl.dev |
| 12 | **Perplexity** | ZIP-level demographic enrichment | API key | perplexity.ai |
| 13 | **PDF Generation** | Dynamic Guzzler Audit reports | Edge Function or service API | TBD (PDFMonkey, Doctly, or Puppeteer) |
| 14 | **Stripe CLI / Projects** | Provision Supabase | stripe CLI installed | stripe.com/cli |

---

## 4. Compliance Requirements (NON-NEGOTIABLE)

### 4.1 TPCO / TCPA Compliance
- Electric bill photos stored in SEPARATE Supabase bucket with restricted RLS
- Compliance disclaimer displayed BEFORE electric bill upload screen
- Homeowner must actively check "I understand my electric bill data will only be shared when I request an in-home estimate"
- All SMS requires express written consent (homeowner texts keyword first OR opts in during quiz)
- Opt-out: reply STOP → immediately halt all SMS to that number
- Document consent timestamps in Supabase

### 4.2 Data Privacy
- CAN-SPAM compliance on all emails: unsubscribe link, physical address
- CCPA/GDPR: homeowners can request data export or deletion
- Soft-delete with audit trail (never hard-delete lead data)
- Homeowner data never shared publicly — only Will (admin) accesses full lead details
- When a lead is sold, Will manually shares relevant data with the purchasing contractor
- Electric bill raw images stored in restricted bucket — analyzed data points only included in lead profile

### 4.3 Safety
- Photo upload disclaimer before breaker panel photos
- "Do not enter crawlspaces or attics" language
- Skip option on every photo — never block progress

---

## 5. Milestones & Deliverables

| Milestone | Deliverable | Est. Day |
|-----------|------------|----------|
| **M1: Foundation** | Supabase schema deployed, Lovable wired, Auth working | Day 3 |
| **M2: Quiz Live** | 12-question flow → preliminary score → score reveal screen | Day 6 |
| **M3: Photo Pipeline** | 7-photo upload → Google Vision OCR → verified score | Day 11 |
| **M4: Funnel Complete** | PDF generation → Calendly booking → beehiiv newsletter opt-in → Cora SMS follow-up | Day 16 |
| **M5: Lead Dashboard** | Will's internal lead pipeline → tier pricing → sales tracking | Day 22 |
| **M6: Funnel Recovery** | Funnel event tracking → abandonment detection → Twilio recovery SMS | Day 26 |
| **M7: Launch** | End-to-end test with real homeowner → lead created → sold | Day 28 |

---

## 6. Communication Cadence

- **Standups:** Every 2 days (per Tanzil's preference)
- **Format:** Quick voice/video — blockers, progress, next steps
- **Async:** Telegram DM between standups for quick questions
- **D.A.V.E. (Hermes):** Available 24/7 for technical questions, schema reference, spec clarification

---

## 7. Success Metrics (Post-Launch)

| Metric | Target |
|--------|--------|
| Quiz completion rate | > 60% of starts |
| Photo verification completion | > 40% of quiz completions |
| Virtual call booking rate | > 25% of verified scores |
| SMS recovery rate (abandoned → returned) | > 15% |
| Newsletter opt-in rate | > 50% of quiz completions |
| Lead sale rate (sold within 7 days) | > 70% |
| Green Tier close rate | > 70% (Will already pre-sold) |

---

*This Scope of Work is a living document. Additions, changes, and clarifications will be tracked through the D.A.V.E. CRM as the build progresses. Questions → Will or D.A.V.E. on Telegram.*
