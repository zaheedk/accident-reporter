
-- Fix 1: Remove broad claim-photos SELECT policy
DROP POLICY IF EXISTS "Users can view claim photos" ON storage.objects;

-- Fix 2: tp-photos - drop and recreate with ownership checks
DROP POLICY IF EXISTS "Users can view tp photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload tp photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own tp photos" ON storage.objects;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname ILIKE '%tp%photo%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END$$;

CREATE POLICY "Users can view their own tp photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tp-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload their own tp photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tp-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own tp photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tp-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix 3: vehicle-photos - restrict to owner
DROP POLICY IF EXISTS "Anyone can view vehicle photos" ON storage.objects;

CREATE POLICY "Users can view their own vehicle photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vehicle-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
