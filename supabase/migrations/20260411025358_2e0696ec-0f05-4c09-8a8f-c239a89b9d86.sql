INSERT INTO storage.buckets (id, name, public) VALUES ('downloads', 'downloads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Downloads are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'downloads');

CREATE POLICY "Admins can upload downloads"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'downloads' AND public.has_role(auth.uid(), 'admin'));