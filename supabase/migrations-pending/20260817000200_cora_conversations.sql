-- Speed-to-lead, part 3: Cora's audit trail.
--
-- ⚠️ UNAPPLIED — see README.md in this directory before running this.
--
-- The July handoff §3 lists `cora_conversations` under "what Claude Code already
-- built". It does not exist — the table was never created on this project.
-- Both new Zoom functions are required to log to it (17-08 brief: "log to
-- cora_conversations"), so it is created here.
--
-- CORA.md non-negotiable: "full audit trail in cora_conversations". Every
-- automated touch is recorded — this is the objection-mining fuel and the
-- compliance evidence, so it is append-only.

CREATE TABLE IF NOT EXISTS public.cora_conversations (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,

  -- 'system' covers machine-generated lifecycle entries (the Zoom events);
  -- inbound/outbound are the actual homeowner conversation.
  direction    TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'system')),
  channel      TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'web', 'zoom', 'telegram')),
  -- Free-form event/message kind, e.g. 'instant_call_joined', 'auto_recap'.
  message_type TEXT NOT NULL,
  body         TEXT,

  -- Which compliance pass the body went through before it left the building.
  -- NULL for inbound and system rows, which are never sent to anyone.
  compliance_filter_version TEXT,

  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cora_conversations_session
  ON public.cora_conversations (quiz_session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cora_conversations_type
  ON public.cora_conversations (message_type, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS: service-role only, no anon access (17-08 brief, explicit).
--
-- Stricter than consent_records, which grants anon INSERT so the browser can
-- log its own consent. Nothing here is written from a browser — every writer is
-- an edge function holding the service role — so anon gets no grant at all.
-- Rows can quote the homeowner verbatim; this is not enumerable data.
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.cora_conversations FROM anon, authenticated;
ALTER TABLE public.cora_conversations ENABLE ROW LEVEL SECURITY;
