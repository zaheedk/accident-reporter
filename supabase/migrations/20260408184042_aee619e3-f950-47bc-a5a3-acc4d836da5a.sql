
-- Create dashcam_videos table
CREATE TABLE public.dashcam_videos (
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

ALTER TABLE public.dashcam_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own dashcam videos"
  ON public.dashcam_videos FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create private storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('dashcam-videos', 'dashcam-videos', false);

CREATE POLICY "Users can upload dashcam videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dashcam-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own dashcam videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'dashcam-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own dashcam videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'dashcam-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
