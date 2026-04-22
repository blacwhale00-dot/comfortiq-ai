CREATE TYPE public.intelligence_source AS ENUM ('County', 'Shovels', 'Zillow', 'EDS');

CREATE TABLE public.property_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,

  county_verified_sqft NUMERIC,
  county_year_built INTEGER,

  permit_last_hvac_date DATE,
  permit_silence_years INTEGER,

  homeowner_reported_sqft TEXT,
  homeowner_reported_system_age INTEGER,

  enrichment_confidence REAL CHECK (enrichment_confidence >= 0 AND enrichment_confidence <= 1),
  confidence_tier TEXT,
  primary_source public.intelligence_source,

  source_sqft public.intelligence_source,
  source_year_built public.intelligence_source,
  source_permit public.intelligence_source,

  sqft_locked BOOLEAN NOT NULL DEFAULT false,
  year_built_locked BOOLEAN NOT NULL DEFAULT false,

  raw_payload JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.property_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read property intelligence"
  ON public.property_intelligence FOR SELECT USING (true);

CREATE POLICY "Anyone can create property intelligence"
  ON public.property_intelligence FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update property intelligence"
  ON public.property_intelligence FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION public.enforce_property_intelligence_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Truth Hierarchy: County data locks the field
  IF NEW.source_sqft = 'County' AND NEW.county_verified_sqft IS NOT NULL THEN
    NEW.sqft_locked := true;
  END IF;

  IF NEW.source_year_built = 'County' AND NEW.county_year_built IS NOT NULL THEN
    NEW.year_built_locked := true;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.sqft_locked = true AND NEW.source_sqft IS DISTINCT FROM 'County' THEN
      NEW.county_verified_sqft := OLD.county_verified_sqft;
      NEW.source_sqft := OLD.source_sqft;
      NEW.sqft_locked := true;
    END IF;

    IF OLD.year_built_locked = true AND NEW.source_year_built IS DISTINCT FROM 'County' THEN
      NEW.county_year_built := OLD.county_year_built;
      NEW.source_year_built := OLD.source_year_built;
      NEW.year_built_locked := true;
    END IF;
  END IF;

  -- Auto-compute silence years
  IF NEW.permit_last_hvac_date IS NOT NULL THEN
    NEW.permit_silence_years := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.permit_last_hvac_date))::INTEGER;
  ELSE
    NEW.permit_silence_years := NULL;
  END IF;

  -- Confidence Scoring
  IF NEW.source_sqft = 'County'
     AND NEW.source_year_built = 'County'
     AND NEW.permit_last_hvac_date IS NOT NULL THEN
    NEW.enrichment_confidence := GREATEST(COALESCE(NEW.enrichment_confidence, 0), 0.9);
    NEW.confidence_tier := 'High';
  ELSIF NEW.source_sqft = 'County' OR NEW.source_year_built = 'County' THEN
    NEW.enrichment_confidence := COALESCE(NEW.enrichment_confidence, 0.65);
    NEW.confidence_tier := 'Medium';
  ELSE
    NEW.enrichment_confidence := COALESCE(NEW.enrichment_confidence, 0.35);
    NEW.confidence_tier := 'Low';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_property_intelligence_rules
BEFORE INSERT OR UPDATE ON public.property_intelligence
FOR EACH ROW EXECUTE FUNCTION public.enforce_property_intelligence_rules();

CREATE INDEX idx_property_intelligence_quiz_session ON public.property_intelligence(quiz_session_id);
CREATE INDEX idx_property_intelligence_zip ON public.property_intelligence(zip_code);