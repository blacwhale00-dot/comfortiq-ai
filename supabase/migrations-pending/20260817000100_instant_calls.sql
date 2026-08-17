-- Speed-to-lead, part 2: the instant call itself.
--
-- ⚠️ UNAPPLIED — see README.md in this directory before running this.
--
-- Source: docs/HANDOFF-FABLE5-CORA-SPEED-TO-LEAD.md §2, adapted from `lead_id`
-- to `quiz_session_id` (there is no `leads` table in this project — see README).

-- ---------------------------------------------------------------------------
-- instant_calls: one row per "Talk to Will NOW" tap.
--
-- Written by instant-call-create, updated by zoom-webhook. Status is the whole
-- state machine, so the values are constrained rather than free text:
--
--   requested   room created, Will pinged, homeowner in the waiting room
--   will_joined meeting.participant_joined landed
--   held        meeting.ended after a join — the only state that earns a recap
--   timed_out   4 minutes with no join, or ended with no join
--   converted_to_booking  homeowner took the evening slot from the fallback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instant_calls (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_session_id  UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,

  meeting_provider TEXT NOT NULL DEFAULT 'zoom' CHECK (meeting_provider IN ('zoom', 'meet')),
  -- Zoom's numeric meeting id as text. This is the webhook's correlation key,
  -- so it must be unique — two rows sharing one id would make meeting.ended
  -- ambiguous and could close the wrong homeowner's call.
  meeting_id       TEXT,
  -- Homeowner-facing join link ONLY. The Zoom start_url is a host credential
  -- and is deliberately never persisted — it goes straight to Will's Telegram
  -- and is not stored anywhere.
  meeting_url      TEXT,

  status           TEXT NOT NULL DEFAULT 'requested'
                     CHECK (status IN ('requested', 'will_joined', 'held',
                                       'timed_out', 'converted_to_booking')),

  requested_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- NULL means the Telegram ping never landed. The timeout job treats that as
  -- an immediate fallback rather than making the homeowner wait out 4 minutes
  -- for someone who was never told they were needed.
  will_notified_at TIMESTAMP WITH TIME ZONE,
  joined_at        TIMESTAMP WITH TIME ZONE,
  ended_at         TIMESTAMP WITH TIME ZONE,

  -- 4-minute fallback bookkeeping (§1 Path A mechanic 3 — hard requirement).
  timeout_offered  BOOLEAN NOT NULL DEFAULT false,
  -- Set true by the webhook on a held call; the recap sender picks these up and
  -- clears the flag. Kept out-of-band so a slow send can never make Zoom retry
  -- the meeting.ended event.
  recap_pending    BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_instant_calls_meeting_id
  ON public.instant_calls (meeting_id) WHERE meeting_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_instant_calls_session
  ON public.instant_calls (quiz_session_id, requested_at DESC);
-- Drives both the 4-minute timeout sweep and the recap sweep.
CREATE INDEX IF NOT EXISTS idx_instant_calls_open
  ON public.instant_calls (status, requested_at) WHERE status = 'requested';
CREATE INDEX IF NOT EXISTS idx_instant_calls_recap
  ON public.instant_calls (recap_pending) WHERE recap_pending;

-- ---------------------------------------------------------------------------
-- instant_call_queue: "text me when Will's free".
--
-- The other half of the never-a-dead-end rule. When the toggle flips back on,
-- everyone still 'waiting' gets an SMS.
--
-- NOTE: sending from this queue is an outbound marketing-adjacent SMS, so it is
-- subject to the same gates as every other send — quiz_sessions.sms_consent
-- must be true and suppression_list must not hold the number. Reminders are
-- still paused pending consent-flow verification, and A2P 10DLC is still owed;
-- this table can fill up before any of that clears, but nothing may send.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instant_call_queue (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  instant_call_id UUID REFERENCES public.instant_calls(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'notified', 'expired')),
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_at     TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_instant_call_queue_waiting
  ON public.instant_call_queue (created_at) WHERE status = 'waiting';

-- ---------------------------------------------------------------------------
-- RLS: service-role only, no anon access (17-08 brief, explicit).
-- Zero policies + REVOKE = denied to anon and authenticated; service role
-- bypasses RLS. meeting_url is a live room link — it must never be enumerable.
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.instant_calls      FROM anon, authenticated;
REVOKE ALL ON TABLE public.instant_call_queue FROM anon, authenticated;

ALTER TABLE public.instant_calls      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instant_call_queue ENABLE ROW LEVEL SECURITY;
