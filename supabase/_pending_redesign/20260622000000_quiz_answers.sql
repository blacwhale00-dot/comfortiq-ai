-- Per-answer storage for the 12-question quiz. Each answer is written the moment
-- it's selected (no bulk submit), so an abandoned quiz still retains every answer.
-- One row per (quiz_id, question_number); re-answering upserts in place.
CREATE TABLE public.quiz_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_id TEXT,
  answer_value NUMERIC,
  answer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, question_number)
);

CREATE INDEX idx_quiz_answers_quiz_id ON public.quiz_answers (quiz_id);

-- Enable RLS — mirrors quiz_sessions: anonymous funnel, no auth required.
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a quiz answer"
  ON public.quiz_answers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read quiz answers"
  ON public.quiz_answers FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update quiz answers"
  ON public.quiz_answers FOR UPDATE
  USING (true);
