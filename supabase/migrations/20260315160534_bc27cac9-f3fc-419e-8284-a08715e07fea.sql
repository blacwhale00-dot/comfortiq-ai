
-- Create storage bucket for audit uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('audit-uploads', 'audit-uploads', true);

-- Allow anyone to upload to audit-uploads bucket
CREATE POLICY "Anyone can upload audit files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'audit-uploads');

-- Allow anyone to read audit files
CREATE POLICY "Anyone can read audit files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audit-uploads');

-- Add upload tracking columns to quiz_sessions
ALTER TABLE public.quiz_sessions
ADD COLUMN IF NOT EXISTS upload_outdoor TEXT,
ADD COLUMN IF NOT EXISTS upload_breaker TEXT,
ADD COLUMN IF NOT EXISTS upload_thermostat TEXT,
ADD COLUMN IF NOT EXISTS upload_bill TEXT,
ADD COLUMN IF NOT EXISTS roi_report JSONB;
