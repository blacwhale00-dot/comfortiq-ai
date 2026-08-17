-- Speed-to-lead, part 1: is Will on right now?
--
-- ⚠️ UNAPPLIED — see README.md in this directory before running this.
--
-- Source: docs/HANDOFF-FABLE5-CORA-SPEED-TO-LEAD.md §2 + §7.3 (decisions locked
-- by Will 2026-07-23): auto-ON scheduled windows plus a manual Telegram
-- override, where the manual override always wins.
--
-- These two tables are the ONLY thing that may enable the "Talk to Will NOW"
-- button. Will's rule: no dead button, ever — the consumer UI renders it only
-- when the server says he's live.

-- ---------------------------------------------------------------------------
-- will_availability: append-only state log, latest row wins.
--
-- Append-only rather than a single mutable row on purpose. "Was Will actually
-- marked live when this homeowner was offered an instant call?" is a question
-- we will need to answer when the timeout rate gets reviewed (success metric:
-- >20% timeouts means the toggle UX is wrong), and an UPDATE-in-place row
-- destroys exactly that evidence.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.will_availability (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_live    BOOLEAN NOT NULL,
  -- Which mechanism flipped it. 'telegram' and 'admin_ui' are manual and
  -- override 'auto_schedule' per §7.3.
  source     TEXT NOT NULL DEFAULT 'telegram'
               CHECK (source IN ('telegram', 'admin_ui', 'auto_schedule')),
  -- Set when a manual /busy should suppress auto-ON until the next window.
  suppress_auto_until TIMESTAMP WITH TIME ZONE,
  note       TEXT,
  toggled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- The hot read is "latest row" on every instant-call request.
CREATE INDEX IF NOT EXISTS idx_will_availability_latest
  ON public.will_availability (toggled_at DESC);

-- ---------------------------------------------------------------------------
-- will_availability_schedule: the windows auto-ON is allowed to fire inside.
--
-- Guardrail #4 (amended, §7.3): default state is OFF *unless inside a window
-- Will explicitly defined*. This table is that explicit definition — it exists
-- to protect his RS Andrews appointments from an auto-ON that fires during one.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.will_availability_schedule (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,             -- 'commute_am', 'lunch', 'commute_pm'
  days_of_week INT[] NOT NULL,            -- ISO: 1 = Monday … 7 = Sunday
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  -- Windows are wall-clock in Will's market, not UTC. Stored explicitly so a
  -- DST shift can't silently move his lunch window an hour.
  timezone     TEXT NOT NULL DEFAULT 'America/New_York',
  enabled      BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT will_availability_schedule_window CHECK (end_time > start_time)
);

-- ---------------------------------------------------------------------------
-- RLS: service-role only, no anon access (17-08 brief, explicit).
--
-- RLS is enabled with ZERO policies, which denies anon and authenticated
-- outright; the service role bypasses RLS and is the only reader/writer. The
-- REVOKE is the other half of the lock — a policy-less table with a lingering
-- grant is still half open (see 20260806000100 for how that bit us before).
--
-- Consequence by design: the browser can NEVER read Will's availability
-- directly. The consumer button's gate has to come from an edge function.
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.will_availability          FROM anon, authenticated;
REVOKE ALL ON TABLE public.will_availability_schedule FROM anon, authenticated;

ALTER TABLE public.will_availability          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.will_availability_schedule ENABLE ROW LEVEL SECURITY;
