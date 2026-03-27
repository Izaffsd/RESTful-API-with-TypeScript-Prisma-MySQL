-- Run in Supabase Dashboard → SQL Editor after creating buckets `profiles` (public) and `documents` (private).
-- Server-side uploads use the service role and bypass RLS; these policies cover direct client access if you add it later.

-- profiles: public read
CREATE POLICY "Public read profiles"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

CREATE POLICY "Auth users upload profiles"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profiles');

CREATE POLICY "Auth users update profiles"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profiles');

CREATE POLICY "Auth users delete own profiles bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profiles');

-- documents: private bucket, authenticated only (adjust USING for per-user paths if needed)
CREATE POLICY "Auth users upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Auth users read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Auth users update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Auth users delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
