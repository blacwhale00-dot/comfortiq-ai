-- Adds the indoor air-handler photo slot to the visual-audit upload flow.
-- Mirrors the existing upload_* columns on quiz_sessions (public URL of the
-- uploaded photo, null until the homeowner uploads it).
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS upload_air_handler TEXT;
