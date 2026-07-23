# Phase 0 — Why the follow-up engine never fires

**Date:** 2026-07-15 · **Project:** ComfortIQ/D.A.V.E (`hlzgdlomdwblxalzwurt`) · investigated live via Supabase management API.

Three independent failures are stacked on top of each other. Any one of them alone
would have killed the pipeline; all three were present.

## Root cause 1 — Scheduler ran with missing Vault secrets (June 30 → July 10)

The `send-due-reminders` pg_cron job (every 5 min) **does exist** and is active
(`cron.job` jobid 1). But it reads the function URL and service-role key from
Supabase Vault, and those two secrets (`cora_reminders_function_url`,
`cora_reminders_service_key`) were **never set when the job was created on June 30**.
Every run failed with:

```
ERROR: null value in column "url" of relation "http_request_queue" violates not-null constraint
```

**2,944 consecutive failed runs** from 2026-06-30 10:30 UTC until 2026-07-10 15:45 UTC,
when someone set the Vault secrets. Since then every run succeeds; the last ~1,370
runs invoked the function fine.

## Root cause 2 — Zero reminder rows can ever be created (STILL BROKEN — the active root cause)

The function's due-row filter (`status = 'pending' AND send_at <= now()`) is
correct and matches the schema. It returns **0 rows because `cora_reminders`
has never contained a single row** — every invocation returns
`{"processed":0,"sent":0,"skipped":0,"failed":0}` (HTTP 200).

Why no rows: the frontend persists the 5 reminders at quiz completion via

```ts
supabase.from("cora_reminders").upsert(rows, { onConflict: "quiz_session_id,milestone", ignoreDuplicates: true })
```

PostgREST turns that into `INSERT … ON CONFLICT (…) DO NOTHING`. The table's RLS
has an **INSERT-only policy** (deliberately no SELECT — rows hold phone numbers),
and the ON CONFLICT arbitration path requires row visibility the anon role
doesn't have. **Verified live:** a plain `INSERT` as `anon` succeeds; the exact
upsert shape fails with `42501 new row violates row-level security policy`
(test row rolled back/deleted). The client then swallows the error with
`console.warn` — so the failure has been completely silent since day one.

## Root cause 3 — There is no Slack integration at all

Zero Slack code exists anywhere: no webhook call in the repo, no edge function,
no migration, nothing. The "earliest point where a Slack ping should fire"
doesn't exist — that's why Will sees no Slack activity. The webhook connected
at the workspace level is never called by the app. (Being built in Phases 1–2.)

## Twilio — configured correctly, one thing Will must verify

- Env names in code (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`)
  match the configured function secrets — proven because the deployed function
  passes its secrets guard (it would 500 with "Twilio secrets not configured"
  otherwise) and returns the summary JSON.
- The code handles Twilio errors properly: records `last_error`, treats 21610
  (STOP) as terminal. It does **not** register delivery-status callbacks —
  added in Phase 2.
- ⚠️ **Will:** verify A2P 10DLC registration status of the from-number in the
  Twilio console — invisible from code, and unregistered numbers get error
  30034 on US carriers.

## Other findings

- **Stale project ref:** `supabase/config.toml` says `project_id = "suacudduadcxzpyxetct"`,
  but the live/linked project is `hlzgdlomdwblxalzwurt`. Deploy foot-gun; fixing.
- **Data volume:** only 2 quiz sessions exist in total (1 completed, and it went
  GOLD — already resolved). Even with everything fixed, there was ~nothing to send.
  All CRM tables (`leads`, `appointments`, `closed_deals`, `messages`, …) are empty.
- **KPI dashboard bug (the "every so often" one):** `CommandCenterPage` freezes
  `now` at first mount (`useMemo(() => new Date(), [])`) while data refetches
  every 60 s. Leave the dashboard open into the next day and "today" tiles count
  the wrong day and recovery `hoursLeft` drifts. Also `goldToday` uses
  `updated_at` as a proxy, so any edit to an old GOLD row re-counts it as today's.
- **Secrets hygiene:** grep for hardcoded keys across repo = clean. Nothing to rotate.

## Fix list

1. ✅ (this commit) Client persist: plain `insert` tolerating duplicate-key `23505`
   instead of RLS-blocked upsert. RLS stays tight.
2. ✅ (this commit) `config.toml` project_id → `hlzgdlomdwblxalzwurt`.
3. ✅ (this commit) Dashboard clock: recompute `now` per refresh. (`goldToday`
   stays an `updated_at` approximation until funnel_events are actually logged —
   documented in code.)
4. Phase 1/2 rebuild everything else on solid ground (enrollment moves
   server-side via Postgres trigger — client-side inserts were the fragile link).
5. **Will:** verify A2P 10DLC in Twilio console; provide `ANTHROPIC_API_KEY` and
   `SLACK_WEBHOOK_URL` as Supabase function secrets (`supabase secrets set`).
