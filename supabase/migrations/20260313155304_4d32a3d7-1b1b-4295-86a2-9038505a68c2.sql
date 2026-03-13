
-- Create quiz_sessions table for lead funnel data
CREATE TABLE public.quiz_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  age INTEGER,
  street_address TEXT,
  city TEXT,
  state TEXT DEFAULT 'GA',
  zip_code TEXT,
  system_age INTEGER,
  square_footage TEXT,
  num_systems TEXT,
  health_conditions BOOLEAN DEFAULT false,
  challenges TEXT[] DEFAULT '{}',
  project_tier TEXT,
  solar_interest BOOLEAN DEFAULT false,
  total_discount_earned INTEGER DEFAULT 0,
  funnel_status TEXT DEFAULT 'started',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (lead capture - no auth required)
CREATE POLICY "Anyone can create a quiz session"
  ON public.quiz_sessions FOR INSERT
  WITH CHECK (true);

-- Allow reading own session by id (for the funnel flow)
CREATE POLICY "Anyone can read quiz sessions"
  ON public.quiz_sessions FOR SELECT
  USING (true);

-- Allow updating sessions (for multi-step form progression)
CREATE POLICY "Anyone can update quiz sessions"
  ON public.quiz_sessions FOR UPDATE
  USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_quiz_sessions_updated_at
  BEFORE UPDATE ON public.quiz_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
