# KICKOFF — Cora V2 Booking Integration + Speed-to-Lead Dual Path

**Date:** 2026-07-23 · **For:** Claude Code Fable 5 (plan/review gate) · **Approved by:** Will
**Companion spec:** `HANDOFF-FABLE5-CORA-SPEED-TO-LEAD.md` (fully locked — §7 decisions, §8 costs)

---

You are Fable 5: the plan/review gate. K3 implements after your plan is approved.

## Repo (start here)
GitHub: https://github.com/blacwhale00-dot/comfortiq-ai.git
Pull latest `main` — all canonical docs are synced in `/docs`.

## Read order (mandatory, in this sequence)
1. `docs/HANDOFF-FABLE5-CORA-SPEED-TO-LEAD.md` — YOUR BUILD SPEC. Fully locked, decisions in §7, costs in §8.
2. `docs/CORA.md` — the canonical Cora playbook (her system prompt, guardrails, voice law).
3. `docs/CORA-V2-EXPANSION.md` — the strategy brief behind it (architecture §5, capability ladder §2).
4. `docs/scope-of-work.md` + `docs/quiz-engine-handoff.md` — V1 scripted layer context (stays live as fallback).

## Already built (verify, then integrate — DO NOT rebuild)
- Repair-vs-Replace calculator
- Repair history database flow in Supabase
Locate both in the codebase first; the handoff's §3 maps how they connect.

## Your two workstreams
- **WS-A:** Cora V2 engine — L4 scheduler (Cal.com evening blocks) → L3 educator primer → L1/L2 score interpreter + objection handler → L5 nurture. Event wiring to canvasser `/ingest`.
- **WS-B:** Speed-to-lead dual path — 🔴 "Talk to Will NOW" instant Zoom call (Server-to-Server OAuth, type:1 instant meetings, $0 on Basic plan) + 📅 evening virtual booking. Auto-ON availability windows via `will_availability_schedule`, manual Telegram override always wins, 4-minute timeout fallback, Cora auto-sends recap CTA on meeting end.

## Non-negotiables (from CORA.md — override everything)
- AI disclosure first message, every conversation
- TCPA consent-gating; STOP honored instantly
- Claims filter: no savings guarantees — "potential/typical/results vary"
- Cora NEVER quotes equipment prices — "Will custom-builds your numbers"
- Full audit trail in `cora_conversations`

## Deliverable (your job NOW)
Produce the implementation plan: phased build order per handoff §6, file-by-file changes, new Supabase migrations (`will_availability`, `instant_calls`, `instant_call_queue`, `will_availability_schedule`), Zoom S2S OAuth setup steps, Cal.com integration approach, and the canvasser event enum adds. Flag any conflicts with existing code (calculator, repair history, quiz engine).

NO production code until Will approves your plan. Plan first, gate, then K3 builds.
