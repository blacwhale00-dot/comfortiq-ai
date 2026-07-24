# CORA V2 — From Scripted Guide to Selling Agent

**Date:** 2026-07-21 · **Owner:** Will · **Author:** Hermes (co-founder strategy) · **Implementer:** Claude Code (K3)
**Supersedes/extends:** `scope-of-work.md` §4.5, `quiz-engine-handoff.md`, `handoff-tanzil-june26.md` — wherever Cora is defined.

---

## 0. Who Cora is today (V1 — keep everything, it's the foundation)

- Scripted in-quiz companion: reacts/acknowledges between the 12 assessment questions (the "Cora walked me through my system" rhythm)
- Scripted photo-set encouragement ($325 → $900 unlock beats)
- 3 scripted SMS touches: PDF-delivered, day-of reminder (T-2h), post-call thank-you
- One static T+72h winback template
- `cora_conversations` table exists in schema
- **She is not an AI yet. She is a script.** V2 gives her a brain while KEEPING the scripted beats that already work.

---

## 1. V2 Mission Statement

> **Cora owns the middle of the funnel: everything between "score revealed" and "appointment held."** Will's calendar stays full; Will only spends closing hours on pre-sold, pre-framed homeowners. She is the reason one man can run a Virtual Sales Organization.

The funnel math she changes: `assessment_completed → appointment_booked` is the leakiest joint in the pipeline. V1 leaves it to a static SMS. V2 makes it a conversation with a closer's playbook behind it.

---

## 2. The Capability Ladder (5 levels, in build order)

### L1 — Score Interpreter
Conversational breakdown of THEIR verified score, per homeowner:
- Pulls their 8 subscores, quiz answers, photo/Vision OCR data, bill data, permit year, subdivision pattern
- Explains what each number means for THEIR home and THEIR July bill
- Voice: educational, zero pressure, trust-first. All $ figures carry "potential/typical/results vary"

### L2 — Objection Handler / FAQ Engine
Trained on Will's 20 years of kitchen-table objections:
- "Is this a sales call?" / "How much does a system cost?" / "Can't I just repair it?" / "Is this a scam?" / "Who are you people?"
- Every answer is honest, educational, and ends with a soft advance toward booking
- Objection library lives in versioned markdown (Will edits it directly — it's HIS scar tissue)

### L3 — Educator / Frame-Setter (the VSO unlock)
Delivers the pre-appointment primer BEFORE Will ever appears:
- What a conditional proposal is, what the Site Condition Schedule (price menu) means
- The "include & remove" concept: your price can only go DOWN
- The three-outcome close: confirmed / adjusted / walk-away with full deposit refund
- **By the time Will joins the call, the homeowner already understands the model. Will's hour is pure closing.** This is how one closer runs 10-15 appointments/week — the frame is pre-built.

### L4 — Scheduler (owns the calendar)
- Reads Will's Cal.com availability (evening virtual blocks)
- Books, reschedules, confirms; sends T-24h and T-2h reminders
- No-show recovery: T+15min "we missed you — everything okay?" flow with one-tap rebook
- Writes every transition to the canvasser event stream (`appointment_booked`, `appointment_held`)

### L5 — Nurture / Reactivation
Stalled-lead sequences keyed to canvasser stages:
- Assessment abandoners → "finish where you left off" resume link (existing token system)
- Photo stallers → picks up the $-unlock beat where they stopped
- Score-revealed non-bookers → conversational T+72h winback (upgrades the V1 static template)
- Post-verification nurture (keeps adjusted deals warm)
- Seasonal reactivation: "your system just turned 18" / heat-dome triggers (NOAA 95°+ cron)

---

## 3. The Handoff Protocol (when Cora stops and Will starts)

Escalation triggers → **instant Telegram ping to Will** with conversation link:

| Trigger | Cora's line |
|---|---|
| Asks for a specific price/quote | "That's exactly what Will custom-builds on your call — want me to grab you a slot?" |
| Buying signals: timeline ("before August"), financing questions, asks about Will | Immediate alert + she offers next 3 open slots |
| Frustration, complaint, anything legal-adjacent | Alert + graceful de-escalation |
| Requests a human | Immediate handoff |

**Hard rules:** she never quotes equipment prices. Never promises savings figures beyond potential/typical/results-vary framing. Never negotiates. Never discusses competitors by name. **She books, educates, and frames — Will prices, closes, and owns the relationship.**

---

## 4. Guardrails (non-negotiable, bake in)

1. **AI disclosure** in the first message of every conversation: "I'm Cora, Will's virtual assistant"
2. **TCPA:** only contacts consent-on-file leads (consent jsonb already in schema); A2P 10DLC registered sender before any SMS; STOP honored instantly + logged to `suppression_list` (reason `optout`)
3. **Claims filter:** every outbound message passes a compliance check — no income/savings guarantees, required disclaimers present
4. **Full audit trail:** every message in `cora_conversations` (auditable; doubles as objection-mining data for the content engine)
5. **Human override:** Will can jump into any thread from Telegram at any time; Cora goes silent the moment he types

---

## 5. Architecture (Claude Code implements)

```
Homeowner (SMS / email / web chat on guzzlerscore.com)
        │
        ▼
┌─────────────────────────────────────────────┐
│ CORA ENGINE                                  │
│  ├─ Brain: Kimi K3 (cheap, high-volume)      │
│  ├─ System prompt = CORA PLAYBOOK (CORA.md)  │
│  ├─ Context builder: homeowner row (quiz     │
│  │   answers, 8 subscores, photos+OCR, bill),│
│  │   property (permit year, subdivision),    │
│  │   lead stage, conversation history        │
│  ├─ Compliance filter (claims, disclosure)   │
│  └─ Tools: calendar_read, calendar_book,     │
│      send_sms, send_email, alert_will(TG),   │
│      log_event(canvasser /ingest)            │
└─────────────────────────────────────────────┘
        │                    │               │
   Twilio SMS          Cal.com API      Telegram → Will
        │
        ▼
canvasser lead_events (stage transitions)
```

- **Brain:** Kimi K3 via PAYGO/OpenRouter — Cora is high-volume, low-stakes-per-message; K3 costs pennies per conversation
- **Playbook as data:** `CORA.md` = persona, voice, objection library, scripts, rules — versioned markdown Will can edit without touching code
- **Calendar:** Cal.com API (open source; self-host on Orgo later)
- **Event wiring:** every Cora action POSTs to canvasser `/ingest` (the webhook contract already exists)
- **Runtime target:** Orgo cloud (prod agents doctrine) — 24/7, not the dev Mac

---

## 6. The Compounding Loop

Cora's conversation logs → objection mining → new FAQ content for the content engine + playbook updates → she gets sharper weekly. Her logs are ALSO the training set for human closer #2 when the VSO hires. Every conversation is an asset; nothing evaporates (the anti-Canton principle).

## 7. Success Metrics (dashboard adds)

- **score→booked conversion rate** (north star — the joint she owns)
- Booking rate per Cora conversation
- No-show rate (pre/post reminder flows)
- Containment rate (% of conversations handled without Will)
- Stalled-lead reactivation rate
- Cost per booked appointment (Cora + infra ÷ bookings — feeds wave_funnel_metrics)

---

## 8. Build order (each independently shippable)

1. `CORA.md` playbook doc (persona, voice, objection library v1 from Will, guardrails)
2. Cora engine: context builder + K3 brain + compliance filter, SMS channel only
3. L4 scheduler + Cal.com + reminders + no-show recovery
4. L3 educator sequences (pre-appointment primer)
5. L1/L2 conversational score interpreter + objection handler
6. L5 nurture flows + canvasser event wiring + dashboard metrics
7. Web chat widget (same brain, second channel)
