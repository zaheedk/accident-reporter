
CREATE TABLE public.tp_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  tp_index INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('damage', 'rego', 'license')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tp_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tp photos"
  ON public.tp_photos FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all tp photos"
  ON public.tp_photos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
