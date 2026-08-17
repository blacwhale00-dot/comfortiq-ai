-- Close the audit-uploads bucket. This is a live PII exposure, not a hardening
-- nicety: the bucket has been public since 20260315160534, with a SELECT policy
-- granting `public` read on every object in it. Those objects include the
-- homeowner's ELECTRIC BILL — name, service address, account number, usage —
-- alongside equipment photos.
--
-- Two independent things made it readable, so both are fixed here:
--   1. `public = true` on the bucket serves objects unauthenticated, bypassing
--      storage.objects RLS entirely.
--   2. The "Anyone can read audit files" policy granted SELECT to `public`.
--
-- After this, objects are reachable only via the service role (edge functions)
-- or a time-limited signed URL. The app stores the storage PATH on
-- quiz_sessions rather than a URL — see src/hooks/useAuditUpload.ts.

-- 1. Stop serving the bucket publicly.
UPDATE storage.buckets SET public = false WHERE id = 'audit-uploads';

-- 2. Drop the blanket read policy. Nothing replaces it: reads now go through
--    the service role or a signed URL, neither of which consults RLS.
DROP POLICY IF EXISTS "Anyone can read audit files" ON storage.objects;

-- 3. Keep anonymous INSERT — a homeowner uploads before any account exists, so
--    there is no identity to scope to — but constrain what may be written.
--    Previously the check was `bucket_id = 'audit-uploads'` and nothing else,
--    which allowed arbitrary files of arbitrary size and type.
DROP POLICY IF EXISTS "Anyone can upload audit files" ON storage.objects;

CREATE POLICY "Anonymous audit uploads, images and pdf only"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'audit-uploads'
  -- Objects live under <session-uuid>/<slot>-<ts>.<ext>. Requiring a folder
  -- blocks bucket-root dumping and keeps one homeowner's files together.
  AND array_length(string_to_array(name, '/'), 1) = 2
  AND (storage.foldername(name))[1] ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
);

-- 3b. Normalize existing values from public URL to storage path, so the column
--     means exactly one thing everywhere. Rows written before this migration
--     hold a full ".../object/public/audit-uploads/<path>" URL, which now
--     dangles. Idempotent: only rewrites values still containing the marker,
--     and every consumer today only tests these columns for presence
--     (upload-progress tiers, GOLD guards), so nothing reads the old form.
DO $$
DECLARE
  col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'upload_outdoor', 'upload_breaker', 'upload_thermostat',
    'upload_air_handler', 'upload_bill'
  ] LOOP
    EXECUTE format(
      'UPDATE public.quiz_sessions
         SET %I = split_part(%I, ''/audit-uploads/'', 2)
       WHERE %I LIKE ''%%/audit-uploads/%%''',
      col, col, col
    );
  END LOOP;
END $$;

-- 4. Bucket-level limits, enforced by storage itself regardless of client code.
--    Mirrors MAX_UPLOAD_BYTES and the MIME allowlist in src/lib/upload-progress.ts;
--    the client check gives a friendly message, this one is the actual control.
UPDATE storage.buckets
SET file_size_limit = 15728640,  -- 15 MB
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
      'application/pdf'
    ]
WHERE id = 'audit-uploads';
