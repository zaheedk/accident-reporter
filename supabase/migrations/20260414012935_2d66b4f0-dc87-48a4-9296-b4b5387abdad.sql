-- Make claim-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'claim-photos';

-- Make tp-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'tp-photos';

-- Owner-scoped policies for claim-photos
CREATE POLICY "Owner can view claim photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'claim-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can upload claim photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'claim-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can update claim photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'claim-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can delete claim photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'claim-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Owner-scoped policies for tp-photos
CREATE POLICY "Owner can view tp photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tp-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can upload tp photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tp-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can update tp photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'tp-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can delete tp photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'tp-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service role access for AI analysis
CREATE POLICY "Service role can access claim photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'claim-photos' AND auth.role() = 'service_role'::text);

CREATE POLICY "Service role can access tp photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tp-photos' AND auth.role() = 'service_role'::text);