-- Allow brokers to upload/view documents in their active clients' storage folders
CREATE POLICY "Broker can upload docs for clients"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-documents'
  AND public.is_broker_for(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Broker can view docs for clients"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-documents'
  AND public.is_broker_for(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
