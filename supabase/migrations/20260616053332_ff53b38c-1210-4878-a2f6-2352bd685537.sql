
-- Job status enum
CREATE TYPE public.shop_job_status AS ENUM ('new','quoting','approved','in_repair','qc','ready','collected','cancelled');
CREATE TYPE public.shop_staff_role AS ENUM ('owner','estimator','tech','frontdesk');

-- ============ shop_staff ============
CREATE TABLE public.shop_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panel_shop_id UUID NOT NULL REFERENCES public.panel_shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.shop_staff_role NOT NULL DEFAULT 'frontdesk',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (panel_shop_id, user_id)
);
CREATE INDEX idx_shop_staff_user ON public.shop_staff(user_id);
CREATE INDEX idx_shop_staff_shop ON public.shop_staff(panel_shop_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_staff TO authenticated;
GRANT ALL ON public.shop_staff TO service_role;
ALTER TABLE public.shop_staff ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.user_panel_shop_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT panel_shop_id FROM public.shop_staff WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_shop_staff(_user_id uuid, _shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shop_staff WHERE user_id = _user_id AND panel_shop_id = _shop_id);
$$;

CREATE OR REPLACE FUNCTION public.is_shop_owner(_user_id uuid, _shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shop_staff WHERE user_id = _user_id AND panel_shop_id = _shop_id AND role = 'owner');
$$;

CREATE POLICY "Staff view own shop roster" ON public.shop_staff FOR SELECT TO authenticated
  USING (public.is_shop_staff(auth.uid(), panel_shop_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners manage roster" ON public.shop_staff FOR ALL TO authenticated
  USING (public.is_shop_owner(auth.uid(), panel_shop_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_shop_owner(auth.uid(), panel_shop_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_shop_staff_updated BEFORE UPDATE ON public.shop_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ shop_jobs ============
CREATE TABLE public.shop_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panel_shop_id UUID NOT NULL REFERENCES public.panel_shops(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES public.claims(id) ON DELETE SET NULL,
  customer_user_id UUID,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_rego TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  insurer_id UUID REFERENCES public.insurance_companies(id) ON DELETE SET NULL,
  assessor_name TEXT,
  assessor_email TEXT,
  status public.shop_job_status NOT NULL DEFAULT 'new',
  panelquote_ref TEXT,
  public_slug TEXT UNIQUE,
  assigned_tech_id UUID,
  dropoff_at TIMESTAMPTZ,
  eta_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_jobs_shop ON public.shop_jobs(panel_shop_id);
CREATE INDEX idx_shop_jobs_status ON public.shop_jobs(panel_shop_id, status);
CREATE INDEX idx_shop_jobs_customer ON public.shop_jobs(customer_user_id);
CREATE INDEX idx_shop_jobs_claim ON public.shop_jobs(claim_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_jobs TO authenticated;
GRANT ALL ON public.shop_jobs TO service_role;
ALTER TABLE public.shop_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop staff manage shop jobs" ON public.shop_jobs FOR ALL TO authenticated
  USING (public.is_shop_staff(auth.uid(), panel_shop_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_shop_staff(auth.uid(), panel_shop_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers view own jobs" ON public.shop_jobs FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid());

-- Slug generator (8 chars, unique)
CREATE OR REPLACE FUNCTION public.generate_shop_job_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  IF NEW.public_slug IS NULL OR NEW.public_slug = '' THEN
    LOOP
      result := '';
      FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.shop_jobs WHERE public_slug = result);
    END LOOP;
    NEW.public_slug := result;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_shop_jobs_slug BEFORE INSERT ON public.shop_jobs
  FOR EACH ROW EXECUTE FUNCTION public.generate_shop_job_slug();
CREATE TRIGGER trg_shop_jobs_updated BEFORE UPDATE ON public.shop_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ shop_job_events ============
CREATE TABLE public.shop_job_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_job_id UUID NOT NULL REFERENCES public.shop_jobs(id) ON DELETE CASCADE,
  actor_user_id UUID,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_job_events_job ON public.shop_job_events(shop_job_id, created_at DESC);

GRANT SELECT, INSERT ON public.shop_job_events TO authenticated;
GRANT ALL ON public.shop_job_events TO service_role;
ALTER TABLE public.shop_job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop staff view job events" ON public.shop_job_events FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.shop_jobs j WHERE j.id = shop_job_id
      AND (public.is_shop_staff(auth.uid(), j.panel_shop_id) OR j.customer_user_id = auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Shop staff insert job events" ON public.shop_job_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.shop_jobs j WHERE j.id = shop_job_id
      AND public.is_shop_staff(auth.uid(), j.panel_shop_id))
  );
