-- Fix 1: Tighten claim-photos storage SELECT policy to owner-only
DROP POLICY IF EXISTS "Claim photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view claim photos" ON storage.objects;

-- Find and drop any SELECT policy on claim-photos bucket
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname ILIKE '%claim%photo%'
    AND cmd = 'r'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END$$;

CREATE POLICY "Users can view their own claim photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'claim-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix 2: Replace notifications INSERT policy to service_role only
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;

CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role'::text);