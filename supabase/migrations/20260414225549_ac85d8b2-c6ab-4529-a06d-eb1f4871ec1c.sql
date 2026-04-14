
-- Create storage bucket for call recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-recordings', 'call-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Create call_recordings table
CREATE TABLE public.call_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  file_size INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NULL,
  notes TEXT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view own call recordings"
  ON public.call_recordings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own call recordings"
  ON public.call_recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own call recordings"
  ON public.call_recordings FOR DELETE
  USING (auth.uid() = user_id);

-- Admin read access
CREATE POLICY "Admins can view all call recordings"
  ON public.call_recordings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage RLS for call-recordings bucket
CREATE POLICY "Owner can view call recordings storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'call-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can upload call recordings storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'call-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can delete call recordings storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'call-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service role can access call recordings storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'call-recordings' AND auth.role() = 'service_role'::text);
