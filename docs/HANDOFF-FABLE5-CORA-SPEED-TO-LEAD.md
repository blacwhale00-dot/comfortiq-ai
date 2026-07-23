# HANDOFF — Fable 5: Cora Booking Integration + Speed-to-Lead Dual Path

**Date:** 2026-07-23 · **From:** Hermes (co-founder strategy) · **To:** Claude Code Fable 5 (plan/review gate) → Claude Code K3 (implementation)
**Depends on:** `CORA.md` v2.0 (canonical playbook), `CORA-V2-EXPANSION.md` (strategy brief) — both already in repo `/docs`
**Already built (do not rebuild):** Repair-vs-Replace Calculator + Repair History database flow in Supabase (addendum to the Cora Flow, built 07-22/23 by Claude Code)
**Status:** READY FOR FABLE REVIEW — no code written by Hermes. Fable plans, K3 builds.

---

## 0. Strategic Context (read first — the WHY)

Two market realities changed this week:

1. **Techs now finance repairs in-home.** RS Andrews techs stop turning over replacement leads — they close financed repairs at the kitchen table. Company lead flow is dying nationwide. (Full analysis: `~/Projects/guzzler-score/strategy/repair-financing-shift-2026-07.md`)
2. **This market is now SPEED TO LEAD.** The shop that talks to the homeowner first — while they're hot, while the repair-vs-replace math is on their screen — wins. 80% of the market doesn't know they need replacement; whoever educates them first owns the relationship.

Will can take instant video calls **during his day job** — pull into a parking lot, phone-to-phone Zoom, 10 minutes. That means ComfortIQ can offer live human contact **all day**, not just evenings. This is a structural advantage no competitor with a staffed call center expects from a one-man VSO.

**The funnel math:** `score_revealed → human contact` is where deals are won. Every hour of delay = a tech with a financing tablet getting there first.

---

## 1. Scope — Two Workstreams

### WS-A: Integrate the Cora Sales Flow + Booking (from yesterday's docs push)

Implement the Cora V2 engine per `CORA-V2-EXPANSION.md` §5 architecture and `CORA.md` playbook, with build order:

1. **L4 Scheduler** — Cal.com integration: read Will's evening virtual blocks, book/reschedule/confirm, T-24h + T-2h reminders, T+15min no-show recovery with one-tap rebook
2. **L3 Educator** — pre-appointment primer sequence (conditional proposal, Site Condition Schedule, include-&-remove, three-outcome close)
3. **L1/L2** — score interpreter + objection handler (objection library in CORA.md §7)
4. **L5 Nurture** — stalled-lead reactivation flows

**Non-negotiables from CORA.md:** AI disclosure first message, TCPA consent-gating, claims filter (potential/typical/results vary), full audit trail in `cora_conversations`, Will's Telegram override, she NEVER quotes equipment prices.

**Event wiring:** every transition POSTs to canvasser `/ingest` (contract exists): `appointment_booked`, `appointment_held`, no-show, rebook.

### WS-B: NEW — Speed-to-Lead Dual-Path Booking Flow

After `score_revealed` (and after any repair-vs-replace calculator completion), the consumer gets **two paths, their choice:**

```
┌─────────────────────────────────────────────────────┐
│  "Your numbers are ready. Want to talk them through?"│
│                                                       │
│  🔴 PATH A: TALK TO WILL NOW                         │
│     "Will's available right now — hop on a quick      │
│      video call, ask him anything. ~10 minutes."      │
│     (shown ONLY when Will's availability toggle = ON) │
│                                                       │
│  📅 PATH B: BOOK AN EVENING VIRTUAL APPOINTMENT       │
│     "Pick a slot that works for you — evenings,       │
│      from your couch, no pressure."                   │
│     (always shown — Cal.com evening blocks)           │
└─────────────────────────────────────────────────────┘
```

#### Path A mechanics — "Zoom Now" instant call

1. **Will's availability toggle** — a simple on/off state Will controls:
   - Primary: Telegram command to Hermes (`/available` / `/busy`) — Hermes flips the flag via API
   - Fallback: manual toggle in an admin view
   - Stored: `will_availability` table (or app config row) — `is_live boolean, toggled_at, source`
2. **Consumer flow:**
   - Taps "Talk to Will now" → instant meeting link generated → consumer joins waiting room
   - Simultaneously: **Telegram ping to Will** with one-tap join link + lead context card:
     - Name, verified Guzzler Score, system age, repair history summary (from the new repair history DB), calculator result if completed, photos
   - Will joins from his phone. Parking lot. Done.
3. **Timeout fallback (critical — never a dead end):**
   - If Will hasn't joined in **4 minutes**, Cora messages the consumer gracefully: *"Will got grabbed on a job — want to grab an evening slot instead, or I can have him text you the moment he's free?"*
   - Consumer picks: evening slot (Path B) OR "text me when free" (queues a Telegram reminder to Will + SMS to consumer when toggle flips ON)
4. **Meeting provider:** decide in Fable plan — options:
   - **Zoom instant meeting via API** (Server-to-Server OAuth, `POST /users/me/meetings` type=1 instant) — matches Will's "Zoom" language, phone-to-phone native
   - **Google Meet via Cal.com** — already the booking rail, one less vendor
   - **Static Zoom PMI** — zero API, but same link for every consumer (privacy/serial-caller risk)
   - *Hermes recommendation: Zoom API instant meetings — clean links, per-consumer rooms, and Will already thinks of it as "a Zoom call."*

#### Path B mechanics — evening virtual (existing plan)

- Cal.com evening virtual blocks as spec'd in CORA-V2-EXPANSION.md §2 L4 — no changes, just ensure it's offered alongside Path A, not after it.

#### Cora's conversational role in the dual path

Cora offers the choice naturally in conversation (not just a UI card):

> *"Your score's ready — 82, which puts your system in the guzzler zone. Want to talk it through with Will? He's actually free right now if you want to hop on a quick video call, or I can grab you an evening slot — totally your call, no pressure either way."*

- If Will's toggle = OFF, she only offers evening slots (never show a dead "now" option)
- After a repair-vs-replace calculator completion showing REPLACE wins: this is the **hottest moment in the entire funnel** — Cora leads with Path A if available
- She uses repair history context: *"I see the two repairs in the last 3 years on a 16-year system — that's exactly the math Will can walk you through."*

---

## 2. Data Model Adds (new migrations)

```sql
-- Will's live availability state (single-row or latest-row-wins)
will_availability (id uuid pk default gen_random_uuid(),
                   is_live boolean not null,
                   source text,            -- telegram | admin_ui | auto_schedule
                   toggled_at timestamptz default now())

-- Instant call sessions
instant_calls (id uuid pk default gen_random_uuid(),
               lead_id uuid references leads(id),
               meeting_url text, meeting_provider text,   -- zoom | meet
               status text,              -- requested | will_joined | held | timed_out | converted_to_booking
               requested_at timestamptz default now(),
               joined_at timestamptz, ended_at timestamptz,
               timeout_offered boolean default false)

-- "Text me when Will's free" queue
instant_call_queue (id uuid pk default gen_random_uuid(),
                    lead_id uuid references leads(id),
                    created_at timestamptz default now(),
                    notified_at timestamptz, status text)  -- waiting | notified | expired
```

**Event types to add to the canvasser enum:** `instant_call_requested`, `instant_call_held`, `instant_call_timeout`, `evening_appointment_booked` (or reuse `call_booked` with payload.channel = instant|evening — Fable's call, keep the event stream clean).

---

## 3. Integration with What Claude Code Already Built

| Existing piece | How WS-A/WS-B connect |
|---|---|
| Repair-vs-Replace calculator | Result screen CTA = dual-path card. REPLACE verdict + Will live = push Path A hard. Store verdict on lead record for Cora context |
| Repair history DB (Supabase) | Cora context builder pulls repair history per lead (count, recency, spend vs. $5,000 rule). Included in Will's Telegram context card before he joins |
| `cora_conversations` table | All dual-path offers/choices logged — auditable, objection-mining fuel |
| Canvasser `/ingest` webhook | New event types flow through existing contract |
| Cal.com (planned) | Path B rail; Path A bypasses Cal.com (instant = no scheduling) |

---

## 4. Guardrails (carry over, non-negotiable)

1. AI disclosure stays first-message — the instant call is with **Will (human)**, Cora frames it as such
2. Cora never quotes prices on the path to the call — "Will custom-builds your numbers"
3. The 4-minute timeout fallback is a hard requirement — a consumer left hanging in an empty meeting room is a trust-killer worse than no instant option
4. Will's toggle defaults to OFF on app restart / new day — he opts INTO live availability deliberately (protects him during RS Andrews appointments)
5. All claims language rules apply to calculator + Cora copy around it ("potential/typical/results vary")

---

## 5. Success Metrics (add to dashboard)

- **score_revealed → human contact time** (the speed-to-lead north star — target: minutes, not days)
- Path A take rate vs Path B (validates the instant-call thesis)
- Instant call timeout rate (if >20%, the toggle UX needs work)
- Instant call → evening booking → held → closed conversion per path
- Calculator completions → contact rate (is the REPLACE verdict the hottest trigger?)

---

## 6. Build Order (each independently shippable)

1. Migrations: `will_availability`, `instant_calls`, `instant_call_queue` + event enum adds
2. Availability toggle API + Telegram `/available` `/busy` wiring via Hermes
3. Path B: L4 scheduler (Cal.com evening blocks) — the always-on baseline
4. Dual-path offer card on score-reveal + calculator-result screens
5. Path A: Zoom instant meeting creation + Will Telegram ping with context card
6. Timeout fallback + "text me when free" queue
7. Cora conversational offering of the dual path (playbook update in CORA.md — Hermes drafts, Will approves)
8. L3 educator primer → L1/L2 → L5 nurture (per WS-A order)
9. Dashboard metrics

---

## 7. Open Questions for Will (Fable — confirm before K3 builds)

1. **Zoom API vs Google Meet vs static PMI** for instant calls? (Hermes rec: Zoom API) — **PRICING ANSWERED 07-23, see §8**
2. 4-minute timeout — right number? (Alternatives: 3 or 5)
3. Should the availability toggle have a scheduled auto-ON window (e.g., known commute/lunch windows) or manual-only?
4. After a held instant call, does Cora auto-send the three-outcome-close recap + next-step CTA, or does Will trigger it manually from Telegram?

---

## 8. Zoom API Cost Research (2026-07-23 — resolves §7 Q1)

**The Zoom Meetings API itself is FREE — there is no separate API key fee.** You create a Server-to-Server OAuth app on the Zoom Marketplace at any plan level, including the free Basic plan. The only cost is the Zoom plan underneath:

| Plan | Cost | Meeting cap | Verdict for us |
|---|---|---|---|
| **Basic (free)** | **$0** | 40 min/meeting | ✅ **Start here** — Will's parking-lot calls are ~10 min; 40-min cap never binds |
| Pro | ~$13.33/user/mo (annual) / ~$15.99 monthly | 30 hrs | Upgrade only if calls run long or we want cloud recording |
| Business | ~$18.33/user/mo | 30 hrs + admin features | Not needed at 1 seat |

**API specifics:**
- Server-to-Server OAuth app: free on any plan, `POST /users/me/meetings` with `type:1` creates instant meetings — exactly the Path A mechanic
- Rate limits are per-account and far above our volume (a handful of instant meetings/day)
- ⚠️ Don't confuse with **Zoom Build Platform / Video SDK** (pay-as-you-go credits) — that's for embedding white-label Zoom video INSIDE our own app. Not needed for v1 (we send links); revisit later if we want in-app video without the Zoom client

**Comparison:** Google Meet links via Cal.com = also $0, but requires Google Workspace rail and doesn't match Will's "hop on a Zoom" mental model. Zoom free Basic + API is the cheapest path that matches the playbook language.

**Decision input for Will:** $0 to start (Zoom Basic + free S2S OAuth app). Total new monthly cost for Path A = **$0**.

---

*Filed by Hermes per file-first workflow. Awaiting Will's answers to §7, then Fable 5 review, then K3 implementation.*
