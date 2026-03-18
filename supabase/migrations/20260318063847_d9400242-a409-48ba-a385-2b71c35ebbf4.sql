-- Add insurance company and panel shop reference to claims
ALTER TABLE public.claims ADD COLUMN insurance_company text NOT NULL DEFAULT '';
ALTER TABLE public.claims ADD COLUMN selected_panel_shop_id uuid REFERENCES public.panel_shops(id) ON DELETE SET NULL;

-- Create claim_photos table  
CREATE TABLE public.claim_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.claim_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claim photos"
ON public.claim_photos FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claim photos"
ON public.claim_photos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own claim photos"
ON public.claim_photos FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Create storage bucket for claim photos
INSERT INTO storage.buckets (id, name, public) VALUES ('claim-photos', 'claim-photos', true);

-- Storage policies
CREATE POLICY "Users can upload claim photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'claim-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view claim photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'claim-photos');

CREATE POLICY "Users can delete own claim photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'claim-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create repair_requests table to track sent requests
CREATE TABLE public.repair_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  panel_shop_id uuid NOT NULL REFERENCES public.panel_shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  insurance_company text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own repair requests"
ON public.repair_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own repair requests"
ON public.repair_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);