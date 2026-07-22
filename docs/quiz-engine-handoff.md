# Comfort IQ Quiz Engine — Developer Handoff
## 12 Questions → Cora Conversations → 8 Subscores → Guzzler Score

**To:** Tanzil  
**From:** Will + D.A.V.E. (Hermes)  
**Date:** June 16, 2026  
**Purpose:** Replaces Phase 2 of scope-of-work.md with full conversational + algorithmic spec

---

## ⚠️ Cora V2 Note (read first)

The Cora in **this document** — the scripted between-question reactions, opening/closing script, and photo-pipeline encouragement — is **layer 1 of the larger Cora** defined canonically in **CORA.md** (per the strategy brief `CORA-V2-EXPANSION.md`). **Same persona, two contexts:**

- **Layer 1 (this doc):** the scripted in-quiz companion. Fixed lines, conversational rhythm, always on.
- **Layer 2 (CORA.md):** the conversational V2 engine — score interpreter, objection handler, educator, scheduler, nurture — that owns the funnel from "score revealed" to "appointment held."

Everything in this document remains accurate and in force: the scripted beats below ship first and stay live forever as the **fallback layer** under the V2 brain. Persona, voice, and tone must match CORA.md §2 — if a line here ever conflicts with the playbook, CORA.md wins and this doc gets updated.

---

## 0. The Critical Design Rule

**Between every single question, Cora must pause and deliver a conversational response.** This is NOT a form where questions stack on top of each other. It is a guided conversation:

```
Question appears → Homeowner answers → Cora acknowledges/reacts → PAUSE → Next question
```

The pause is the difference between "I filled out a quiz" and "Cora walked me through my system." Every Cora response should feel like she's thinking about their specific answer, not like a generic "next question" button.

**Implementation:** After answer selection, wait 1.5–2 seconds, Cora's text response fades in (typewriter effect if possible, but not required for V1), then next question appears. This timing creates conversational rhythm.

---

## 1. The 12 Questions — Full Spec

### Question-Answer Mapping Convention
Each question feeds one or more subscores. Each answer has:
- **Value** (0.0–1.0): the raw score contribution
- **Cora response**: exact text appearing after the homeowner selects this answer
- **Subscore target**: which of the 8 subscores this feeds

---

### Q1: "Let's start simple — how old is your air conditioner or heat pump?"

| Answer | Value | Cora Response |
|--------|-------|---------------|
| 0–5 years | 0.00 | "Still in its prime! That's great news. Let's see how the rest is holding up." |
| 6–9 years | 0.25 | "Middle age for an HVAC system. You're in the sweet spot where maintenance really matters." |
| 10–14 years | 0.60 | "Starting to get into the zone where systems typically show their age. Keep going — this gets interesting." |
| 15–19 years | 0.85 | "Past typical life expectancy. You're on borrowed time — but that's exactly why you're here." |
| 20+ years | 1.00 | "Wow — that system has served you well, but it's running on fumes. Every extra year is a gift at this point." |
| I don't know | 0.50 | "No worries — your data plate knows. We'll get the real number when you upload your photos." |

**Feeds:** Subscore 1 — Age Factor (weight 0.22)

---

### Q2: "Have your energy bills gone up noticeably during cooling season?"

| Answer | Value | Cora Response |
|--------|-------|---------------|
| No, bills are consistent | 0.00 | "Steady bills — always a good sign. Your system's holding its efficiency." |
| Slight increase | 0.30 | "Even small increases add up over a Georgia summer. A few degrees of efficiency loss can mean real dollars." |
| Noticeable increase | 0.65 | "That spike isn't just inflation — it's your system working harder to deliver less cooling. Classic sign of declining efficiency." |
| Dramatic spike | 1.00 | "That's not a bill — that's a cry for help. Your system is burning cash every time it cycles on." |
| I don't track | 0.40 | "Most people don't! Your electric bill photo will give us the real numbers later." |

**Feeds:** Subscore 2 — Energy Drain (weight 0.20), combined with Q11

---

### Q3: "How many repairs have you had in the last 2 years?"

| Answer | Value | Cora Response |
|--------|-------|---------------|
| None | 0.00 | "Knock on wood — no repairs is what we love to hear." |
| 1 | 0.25 | "One repair happens. Sometimes it's just bad luck. Let's see if there's a pattern." |
| 2–3 | 0.60 | "Two to three repairs in two years — that's the beginning of a pattern. Repair costs tend to cluster as systems age." |
| 4–5 | 0.85 | "Four or five repairs means you're nursing this system along. At some point, repairs stop being the cheaper option." |
| 6+ | 1.00 | "Six-plus repairs — you've been through it. At this point you're not maintaining a system, you're funding its retirement." |

**Feeds:** Subscore 3 — Repair Bloodloss (weight 0.20), combined with Q4

---

### Q4: "Roughly how much have you spent on those repairs?"

| Answer | Value | Cora Response |
|--------|-------|---------------|
| $0 | 0.00 | "Zero dollars in repairs — your wallet thanks you." |
| Under $500 | 0.20 | "Minor stuff. Routine maintenance-level costs." |
| $500–$1,500 | 0.50 | "That's starting to be real money — the kind that makes you wonder if it's worth it." |
| $1,500–$3,000 | 0.75 | "Now we're talking serious investment in a dying asset. Every dollar you spend on repairs is a dollar you could've put toward a system that doesn't break." |
| Over $3,000 | 1.00 | "Over three thousand dollars — that's a down payment on a new system you already made... just without getting the new system." |

**Feeds:** Subscore 3 — Repair Bloodloss. **Formula:** `(Q3 × 0.40) + (Q4 × 0.60)`. Dollar amount carries more weight than repair count — a single $3,500 compressor replacement hurts more than three $200 capacitor swaps.

---

### Q5: "Do you have rooms that are consistently too hot or too cold?"

| Answer | Value | Cora Response |
|--------|-------|---------------|
| No, even temperature throughout | 0.00 | "Perfect — your ductwork and system are balanced. That's rarer than you'd think." |
| 1 room with issues | 0.25 | "One problem room — could be ductwork, could be sizing. Worth looking at." |
| 2–3 rooms with issues | 0.60 | "Multiple rooms struggling means something systemic is going on. Duct leaks, wrong-sized unit, poor design — could be any of them." |
| Most of the house | 0.85 | "If most rooms are uncomfortable, your system is fundamentally mismatched to your home. That's not a repair problem — that's a redesign." |
| Whole house struggles | 1.00 | "Your system can't keep up anywhere. That's the definition of the wrong equipment for the job." |

**Feeds:** Subscore 5 — Comfort Fail (weight 0.10), combined with Q6

---

### Q6: "How's the humidity in your home — sticky, clammy, or just right?"

| Answer | Value | Cora Response |
|--------|-------|---------------|
| No humidity issues | 0.00 | "Comfortable humidity levels — your system's doing its job on the latent cooling side too." |
| Slightly uncomfortable sometimes | 0.30 | "Intermittent humidity usually means your system is cooling the air but not removing enough moisture. Oversized equipment does exactly that." |
| Noticeable — sticky in summer | 0.65 | "Sticky air in summer is a classic oversized-system symptom. It cools too fast and never runs long enough to pull moisture out." |
| Major humidity problems year-round | 1.00 | "That level of humidity means your system has basically stopped dehumidifying. You're cool-but-clammy — the worst of both worlds." |

**Feeds:** Subscore 5 — Comfort Fail. **Formula:** `(Q5 × 0.55) + (Q6 × 0.45)`. Temperature complaints slightly outweigh humidity because they're the primary discomfort trigger.

---

### Q7: "Any strange noises, smells, or ice on the outdoor unit?"

| Answer | Value | Cora Response |
|--------|-------|---------------|
| None, runs smooth | 0.00 | "Smooth and quiet — that's what we want." |
| Occasional noise | 0.25 | "The occasional rattle or hum — could be minor, but noises don't fix themselves." |
| Regular noises or smells | 0.55 | "Regular noises or smells mean something is wearing down. Bearings, belts, compressor — something's complaining." |
| Ice on coils, burning smell, grinding | 1.00 | "Ice on coils or burning smells — those are STOP signs. Grinding = metal on metal = catastrophic failure coming." |

**Feeds:** Subscore 6 — Noise & Behavior (weight 0.06), combined with Q8

---

### Q8: "Does your system turn on and off rapidly — what we call short cycling?"

| Answer | Value | Cora Response |
|--------|-------|---------------|
| No, runs normal cycles | 0.00 | "Normal cycles — your system is breathing right." |
| Sometimes seems fast | 0.35 | "Occasional short cycles could be a thermostat issue, or the beginning of a sizing problem." |
| Yes, frequently turns on/off | 0.70 | "Frequent short cycling murders equipment. It's like starting and stopping your car engine every 30 seconds — premature wear, higher bills, shorter life." |
| Constantly cycling, never settles | 1.00 | "Constant cycling means your system is fighting itself. Probably oversized — cooling the house too fast, then kicking back on minutes later. This is one of the most expensive problems to ignore." |
| I haven't noticed | 0.30 | "Fair enough — listen for it. If your system kicks on and off within 10 minutes, that's short cycling." |

**Feeds:** Subscore 6 — Noise & Behavior. **Formula:** `(Q7 × 0.55) + (Q8 × 0.45)`. Physical symptoms slightly outweigh behavioral patterns.

---

### Q9: "How often do you change your air filter?"

| Answer | Value | Cora Response |
|--------|-------|---------------|
| Every 1–3 months | 0.00 | "Perfect filter discipline. That alone extends equipment life by years." |
| Every 4–6 months | 0.25 | "Not bad — slightly stretching it in peak season, but not hurting anything." |
| Once a year | 0.55 | "Once a year means your system is breathing through a dirty filter for months. Restricted airflow = higher bills + harder-working equipment." |
| Rarely / when I remember | 0.80 | "'When I remember' is usually 'when I notice.' By that point the filter's been choking your system for a while." |
| There's a filter? | 1.00 | "No judgment — a shocking number of people don't know. But now you do, and that's an easy fix that changes everything." |

**Feeds:** Subscore 7 — Maintenance Neglect (weight 0.05), combined with Q10

---

### Q10: "When was your last professional HVAC tune-up?"

| Answer | Value | Cora Response |
|--------|-------|---------------|
| Within the last year | 0.00 | "Yearly tune-ups — that's the standard. Your system's been looked after." |
| 1–2 years ago | 0.30 | "A little behind schedule. Systems that go two years without a professional eye tend to have surprises." |
| 3+ years ago | 0.60 | "Three-plus years without a tune-up means small problems have had time to become big ones. Things degrade silently." |
| Never / bought the house with it | 0.85 | "Never tuned up — you don't know what you don't know about that system. Could be fine. Could be a time bomb. The data plate will tell us." |
| I don't remember | 0.50 | "If you can't remember, it's been too long. That's usually 2+ years in 'homeowner time.'" |

**Feeds:** Subscore 7 — Maintenance Neglect. **Formula:** `(Q9 × 0.35) + (Q10 × 0.65)`. Professional tune-up neglect is weighted heavier — pros catch things homeowners miss.

---

### Q11: "Do you know your system's SEER efficiency rating?"

| Answer | Value | Cora Response |
|--------|-------|---------------|
| Yes, SEER 18+ | 0.00 | "SEER 18+ is high efficiency. Your system isn't wasting energy — even if other things are going wrong." |
| Yes, SEER 14–17 | 0.30 | "Mid-range efficiency. Decent, but you're leaving some savings on the table compared to modern 20+ SEER systems." |
| Yes, SEER 10–13 | 0.60 | "SEER 10–13 is the old standard. Minimum legal today is 14–15 SEER depending on region. You're running at yesterday's efficiency with today's electricity rates." |
| Yes, below SEER 10 | 1.00 | "Below SEER 10 — that system was inefficient the day it was installed. You're paying double or triple what a modern system costs to run." |
| I don't know | 0.50 | "Most homeowners don't. Your data plate photo will give us the exact SEER — we'll update your score when we verify it." |

**Feeds:** Subscore 2 — Energy Drain. **Formula:** `(Q2 × 0.40) + (Q11 × 0.60)`. Known SEER is weighted heavier — it's objective data; bill trends can have other causes.

---

### Q12: "Are you considering replacing your HVAC system in the next 12 months?"

| Answer | Value | Cora Response |
|--------|-------|---------------|
| Yes, actively planning | 1.00 | "You're already thinking ahead — that's the right mindset. The Guzzler Score is about to give you the data to make the smartest decision possible." |
| Maybe, if the price is right | 0.60 | "Open to it if the numbers make sense — that's exactly what we're about to show you. The Guzzler Score makes the financial case clear." |
| Only if it breaks | 0.30 | "The 'run it till it dies' strategy. Problem is, it always dies on the hottest day of the year — when everyone else's just died too, and contractors can name their price. Let's see if waiting actually saves you money." |
| No, just curious | 0.00 | "Curiosity is a great reason to be here. Let's see what your system is actually telling us — no pressure, just data." |

**Feeds:** Subscore 8 — Homeowner Readiness (weight 0.02). Smallest weight — readiness amplifies the score, it doesn't create it. A "just curious" homeowner with a terrible system will still score high.

---

## 2. Cora's Opening & Closing Script

### Opening (before Q1)
> "Hey there! I'm Cora — your Comfort IQ guide. In the next few minutes, I'm going to help you understand exactly what your HVAC system is costing you. Not in some vague 'maybe you should replace it' way — in actual numbers. Ready? Let's go."

### Closing (after Q12 → transitions to score reveal)
> "Alright — I've got everything I need for your preliminary Guzzler Score. Remember: this is based on what you told me. Your actual equipment might tell a different story — and honestly, it usually does. Let's see where you land..."

### After Score Reveal → Photo Pipeline Transition
> "XX/100 — [TIER LABEL]. Here's what's driving that number..."
>
> [Subscore breakdown displayed]
>
> "But here's the thing — that score is only as accurate as your memory. Your data plate, your electric bill, your actual equipment... they know things you don't. Want to find out your TRUE Guzzler Score and unlock $900 in savings? It takes about 3 minutes with your phone camera."

---

## 3. Algorithmic Architecture — Complete

### 3.1 The Master Formula

```
Guzzler Score = Σ (subscore_i × weight_i) × 100

Where:
  Guzzler Score ∈ [0, 100]
  subscore_i ∈ [0.0, 1.0]
  weight_i ∈ [0.02, 0.22]
  Σ weights = 1.00
```

### 3.2 Subscore Calculations

| # | Subscore | Inputs | Formula |
|---|----------|--------|---------|
| 1 | **Age Factor** | Q1 | `Q1 × 1.0` |
| 2 | **Energy Drain** | Q2, Q11 | `(Q2 × 0.40) + (Q11 × 0.60)` |
| 3 | **Repair Bloodloss** | Q3, Q4 | `(Q3 × 0.40) + (Q4 × 0.60)` |
| 4 | **Sizing Mismatch** | EDS | EDS load calc value; defaults to 0.50 if unavailable |
| 5 | **Comfort Fail** | Q5, Q6 | `(Q5 × 0.55) + (Q6 × 0.45)` |
| 6 | **Noise & Behavior** | Q7, Q8 | `(Q7 × 0.55) + (Q8 × 0.45)` |
| 7 | **Maintenance Neglect** | Q9, Q10 | `(Q9 × 0.35) + (Q10 × 0.65)` |
| 8 | **Homeowner Readiness** | Q12 | `Q12 × 1.0` |

### 3.3 Weight Distribution

```
Age Factor:        0.22  ← Biggest — past life expectancy = time bomb
Energy Drain:      0.20  ← Ongoing monthly bleed compounds over time
Repair Bloodloss:  0.20  ← Sunk cost predicts future sink cost
Sizing Mismatch:   0.15  ← Objective data from EDS load calc
Comfort Fail:      0.10  ← Quality of life — why they're here
Noise & Behavior:  0.06  ← Physical symptoms of failure
Maintenance:       0.05  ← Fixable, but still a signal
Readiness:         0.02  ← Intent — smallest because it's not system health
─────────────────────────
TOTAL:             1.00
```

### 3.4 Tier Mapping

| Score Range | Tier Label | Color |
|-------------|-----------|-------|
| 0–49 | LOW GUZZLER | 🟡 Yellow |
| 50–75 | HIGH GUZZLER | 🟠 Orange |
| 76–100 | CRITICAL GUZZLER | 🔴 Red |

### 3.5 External Weight Config (JSON)

Weights MUST be externalized — not hardcoded. Store in Supabase `config` table or a config file the edge function reads:

```json
{
  "weights": {
    "age_factor": 0.22,
    "energy_drain": 0.20,
    "repair_bloodloss": 0.20,
    "sizing_mismatch": 0.15,
    "comfort_fail": 0.10,
    "noise_behavior": 0.06,
    "maintenance_neglect": 0.05,
    "homeowner_readiness": 0.02
  },
  "subscore_formulas": {
    "energy_drain": { "q2": 0.40, "q11": 0.60 },
    "repair_bloodloss": { "q3": 0.40, "q4": 0.60 },
    "comfort_fail": { "q5": 0.55, "q6": 0.45 },
    "noise_behavior": { "q7": 0.55, "q8": 0.45 },
    "maintenance_neglect": { "q9": 0.35, "q10": 0.65 }
  },
  "tiers": [
    { "min": 0, "max": 49, "label": "LOW GUZZLER", "color": "yellow" },
    { "min": 50, "max": 75, "label": "HIGH GUZZLER", "color": "orange" },
    { "min": 76, "max": 100, "label": "CRITICAL GUZZLER", "color": "red" }
  ],
  "sizing_default": 0.50
}
```

This means we can run a V2 with different weights next month without touching code. Just update the config and every score recalibrates.

---

## 4. API Contract — Edge Function: `calculate-guzzler-score`

### Request
```json
POST /api/calculate-score
Content-Type: application/json

{
  "quiz_id": "uuid",
  "answers": [
    { "question": 1,  "value": 0.85, "text": "15-19 years" },
    { "question": 2,  "value": 0.65, "text": "Noticeable increase" },
    { "question": 3,  "value": 0.85, "text": "4-5 repairs" },
    { "question": 4,  "value": 0.75, "text": "$1,500–$3,000" },
    { "question": 5,  "value": 0.60, "text": "2-3 rooms with issues" },
    { "question": 6,  "value": 0.65, "text": "Noticeable — sticky in summer" },
    { "question": 7,  "value": 0.55, "text": "Regular noises or smells" },
    { "question": 8,  "value": 0.70, "text": "Yes, frequently turns on/off" },
    { "question": 9,  "value": 0.55, "text": "Once a year" },
    { "question": 10, "value": 0.60, "text": "3+ years ago" },
    { "question": 11, "value": 0.60, "text": "SEER 10-13" },
    { "question": 12, "value": 0.60, "text": "Maybe, if the price is right" }
  ]
}
```

### Response
```json
{
  "quiz_id": "uuid",
  "score": 74,
  "tier": "orange",
  "label": "HIGH GUZZLER",
  "score_type": "preliminary",
  "subscores": {
    "age_factor":        { "raw": 0.85, "weighted": 18.7, "weight": 0.22, "source": "Q1" },
    "energy_drain":      { "raw": 0.62, "weighted": 12.4, "weight": 0.20, "source": "Q2+Q11" },
    "repair_bloodloss":  { "raw": 0.79, "weighted": 15.8, "weight": 0.20, "source": "Q3+Q4" },
    "sizing_mismatch":   { "raw": 0.50, "weighted": 7.5,  "weight": 0.15, "source": "default — no EDS" },
    "comfort_fail":      { "raw": 0.62, "weighted": 6.2,  "weight": 0.10, "source": "Q5+Q6" },
    "noise_behavior":    { "raw": 0.62, "weighted": 3.7,  "weight": 0.06, "source": "Q7+Q8" },
    "maintenance_neglect": { "raw": 0.58, "weighted": 2.9, "weight": 0.05, "source": "Q9+Q10" },
    "homeowner_readiness": { "raw": 0.60, "weighted": 1.2,  "weight": 0.02, "source": "Q12" }
  },
  "total_weighted_sum": 68.4,
  "score_breakdown_text": "Age (18.7) + Energy (12.4) + Repairs (15.8) + Sizing (7.5) + Comfort (6.2) + Noise (3.7) + Maintenance (2.9) + Readiness (1.2) = 68.4 → rounded to 68/100 HIGH GUZZLER"
}
```

---

## 5. Frontend Implementation Notes

### 5.1 Question Display Pattern
```
┌─────────────────────────────┐
│  Question X of 12            │
│  ████████░░░░  progress bar  │
│                              │
│  Question text here...       │
│                              │
│  ○ Answer option 1           │
│  ○ Answer option 2           │
│  ○ Answer option 3           │
│  ○ Answer option 4           │
│  ○ Answer option 5           │
│                              │
└─────────────────────────────┘

[After selection — 1.5 sec delay]

┌─────────────────────────────┐
│  🤖 Cora                     │
│  "Cora's response text..."   │
│                              │
│         [ Next → ]           │
└─────────────────────────────┘
```

### 5.2 Answer Storage
- Store each answer to `quiz_answers` immediately on selection — no bulk submit
- This prevents data loss on abandonment
- `quiz_answers` row: `quiz_id, question_number, answer_value, answer_text, created_at`

### 5.3 Cora Response Timing
- 1.5–2 seconds after answer selection before Cora text appears
- Typewriter effect: nice-to-have, not required for V1
- Cora text fades in, then "Next" button appears below it
- Homeowner taps Next to advance (gives them control of the pace)

### 5.4 Mobile-First
- This is a PHONE experience. Design for 375px–414px width
- Single column, no side panels, no desktop layouts until proven necessary
- Touch targets: minimum 44px tap area on answer options
- Progress bar at top, fixed position

---

## 6. Scoring Engine Implementation Notes

### 6.1 Edge Function Location
- Supabase Edge Function: `calculate-guzzler-score`
- Deployed via Supabase CLI: `supabase functions deploy calculate-guzzler-score`
- Environment variables: none required (reads weights from config or hardcoded fallback)

### 6.2 Weight Override Capability
The weight config JSON is the single source of truth. When we learn from real data and want to adjust:
1. Update the config in Supabase
2. All future score calculations use new weights
3. Existing scores are NOT retroactively recalculated (we store the weights used at calculation time in `guzzler_scores.weights_snapshot`)

### 6.3 Sizing Subscore Default
When EDS data is unavailable (which is the case for preliminary scores), sizing defaults to 0.50. This is a neutral value — it neither inflates nor deflates the preliminary score. The verified score replaces this with actual EDS data.

### 6.4 Validation
- Edge function must validate exactly 12 answers received
- Missing answers → 400 error with `missing_questions` array
- Invalid values (outside 0.0–1.0) → 400 error

---

## 7. Example: Full Calculation Walkthrough

**Scenario:** 19-year-old system, SEER 10, $2,500 in repairs, 2–3 hot rooms, sticky humidity, short cycling, neglected maintenance, homeowner willing to consider replacement.

| Question | Answer | Value |
|----------|--------|-------|
| Q1 | 15–19 years | 0.85 |
| Q2 | Noticeable bill increase | 0.65 |
| Q3 | 2–3 repairs | 0.60 |
| Q4 | $1,500–$3,000 spent | 0.75 |
| Q5 | 2–3 rooms with issues | 0.60 |
| Q6 | Noticeable humidity | 0.65 |
| Q7 | Noises/smells | 0.55 |
| Q8 | Frequent short cycling | 0.70 |
| Q9 | Filter once a year | 0.55 |
| Q10 | Tune-up 3+ years ago | 0.60 |
| Q11 | SEER 10–13 | 0.60 |
| Q12 | Maybe if price right | 0.60 |

**Calculations:**

```
Subscore 1 (Age):            0.85 × 0.22 = 0.187
Subscore 2 (Energy):         (0.65×0.40 + 0.60×0.60) = 0.62 × 0.20 = 0.124
Subscore 3 (Repairs):        (0.60×0.40 + 0.75×0.60) = 0.69 × 0.20 = 0.138
Subscore 4 (Sizing):         0.50 × 0.15 = 0.075 (default)
Subscore 5 (Comfort):        (0.60×0.55 + 0.65×0.45) = 0.6225 × 0.10 = 0.062
Subscore 6 (Noise):          (0.55×0.55 + 0.70×0.45) = 0.6175 × 0.06 = 0.037
Subscore 7 (Maintenance):    (0.55×0.35 + 0.60×0.65) = 0.5825 × 0.05 = 0.029
Subscore 8 (Readiness):      0.60 × 0.02 = 0.012

Total weighted sum: 0.187 + 0.124 + 0.138 + 0.075 + 0.062 + 0.037 + 0.029 + 0.012 = 0.664

Guzzler Score: 0.664 × 100 = 66 → HIGH GUZZLER (Orange) 🟠
```

---

## 8. What Tanzil Needs to Build

### Frontend (Lovable)
- [ ] Quiz container component with progress bar
- [ ] Question component with answer options
- [ ] Cora response component with fade-in animation
- [ ] 1.5–2 second delay between answer selection and Cora response
- [ ] "Next" button at bottom of Cora response
- [ ] Answer storage: POST to Supabase on each selection
- [ ] Score reveal screen with gauge bar and subscore breakdown
- [ ] Photo pipeline transition CTA

### Backend (Supabase)
- [ ] `quiz_answers` table (already in schema — see scope-of-work.md §1.1)
- [ ] Edge function `calculate-guzzler-score` (contract in §4 above)
- [ ] Weight config storage (Supabase `config` table or env vars)
- [ ] `guzzler_scores` table write (store `score_type = 'preliminary'`, `weights_snapshot`)

### No Changes Needed From Phase 1 Schema
The existing `quiz_answers`, `guzzler_scores`, and `cora_conversations` tables already support this design. No schema migration required.

---

## 9. CRITICAL: What Makes This Different From a Standard Quiz

1. **Cora is the experience.** The pauses between questions are not loading states — they are the core UX. Without Cora's conversational responses, this is just another 12-field form. With them, it's a guided diagnostic.

2. **The algorithm is visible.** Homeowners see which factors drove their score and by how much. The "black box score" is what makes ScoreApp and competitors feel gimmicky. Transparency = trust.

3. **Weights are adjustable from day one.** V1 weights are an educated guess. We WILL change them. The architecture must support weight changes without code deploys.

4. **Preliminary is not final.** Every score communication primes the homeowner for the verified score. The gap between preliminary and verified is a conversion engine, not a bug.

---

*Questions → Will or D.A.V.E. on Telegram. This document replaces Phase 2 of scope-of-work.md for the quiz engine component.*
