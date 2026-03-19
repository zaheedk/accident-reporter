CREATE TABLE public.tow_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tow_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tow companies"
  ON public.tow_companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert tow companies"
  ON public.tow_companies FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tow companies"
  ON public.tow_companies FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tow companies"
  ON public.tow_companies FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));