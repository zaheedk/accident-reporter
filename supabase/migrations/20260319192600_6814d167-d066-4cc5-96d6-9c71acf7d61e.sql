CREATE TABLE public.insurance_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Anyone can view insurance companies"
  ON public.insurance_companies FOR SELECT
  TO authenticated
  USING (true);

-- Admin CRUD
CREATE POLICY "Admins can insert insurance companies"
  ON public.insurance_companies FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update insurance companies"
  ON public.insurance_companies FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete insurance companies"
  ON public.insurance_companies FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));