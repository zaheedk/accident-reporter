
-- Create storage bucket for third-party photos (damage, rego, license)
INSERT INTO storage.buckets (id, name, public) VALUES ('tp-photos', 'tp-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to tp-photos
CREATE POLICY "Users can upload tp photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tp-photos');

CREATE POLICY "Users can view tp photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'tp-photos');

CREATE POLICY "Users can delete own tp photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'tp-photos');
