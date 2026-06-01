
-- ============ rental_partners ============
CREATE TABLE public.rental_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL UNIQUE,
  company_name text NOT NULL DEFAULT '',
  brand_color text NOT NULL DEFAULT '#1e3a5f',
  logo_url text NOT NULL DEFAULT '',
  inbound_alias text NOT NULL UNIQUE,
  contact_email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_partners TO authenticated;
GRANT ALL ON public.rental_partners TO service_role;
ALTER TABLE public.rental_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own rental partner"
  ON public.rental_partners FOR ALL TO authenticated
  USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Admins view all rental partners"
  ON public.rental_partners FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage all rental partners"
  ON public.rental_partners FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_rental_partners_updated_at
  BEFORE UPDATE ON public.rental_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ rental_partner_applications ============
CREATE TABLE public.rental_partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text NOT NULL DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_partner_applications TO authenticated;
GRANT ALL ON public.rental_partner_applications TO service_role;
ALTER TABLE public.rental_partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can create own application"
  ON public.rental_partner_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can view own application"
  ON public.rental_partner_applications FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin updates applications"
  ON public.rental_partner_applications FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ partner_fleet_vehicles ============
CREATE TABLE public.partner_fleet_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.rental_partners(id) ON DELETE CASCADE,
  rego_number text NOT NULL,
  year text NOT NULL DEFAULT '',
  make text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  vin text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, rego_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_fleet_vehicles TO authenticated;
GRANT ALL ON public.partner_fleet_vehicles TO service_role;
ALTER TABLE public.partner_fleet_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner manages own fleet"
  ON public.partner_fleet_vehicles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rental_partners rp
                 WHERE rp.id = partner_fleet_vehicles.partner_id
                   AND rp.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rental_partners rp
                      WHERE rp.id = partner_fleet_vehicles.partner_id
                        AND rp.owner_user_id = auth.uid()));

CREATE TRIGGER update_partner_fleet_vehicles_updated_at
  BEFORE UPDATE ON public.partner_fleet_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ extend vehicles table ============
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS rental_partner_id uuid REFERENCES public.rental_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_rental boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hire_start_date text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hire_end_date text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_vehicles_rental_partner ON public.vehicles(rental_partner_id) WHERE rental_partner_id IS NOT NULL;

-- Block users from updating or deleting rental vehicles
-- (existing user policies allow this; we add restrictive policies)
CREATE POLICY "Users cannot delete rental vehicles"
  ON public.vehicles AS RESTRICTIVE FOR DELETE TO authenticated
  USING (is_rental = false OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users cannot update rental vehicles"
  ON public.vehicles AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (is_rental = false OR has_role(auth.uid(), 'admin'::app_role));

-- Partner can insert rental vehicles into customer accounts (via service role normally,
-- but allow direct insert when owner of the partner)
CREATE POLICY "Partner can attach rental vehicles to customers"
  ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (
    is_rental = true
    AND rental_partner_id IN (SELECT id FROM public.rental_partners WHERE owner_user_id = auth.uid())
  );

-- ============ user_documents: block delete of rental_agreement ============
CREATE POLICY "Users cannot delete rental agreements"
  ON public.user_documents AS RESTRICTIVE FOR DELETE TO authenticated
  USING (category <> 'rental_agreement' OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users cannot update rental agreements"
  ON public.user_documents AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (category <> 'rental_agreement' OR has_role(auth.uid(), 'admin'::app_role));

-- Partner can attach rental_agreement documents to customers in their fleet
CREATE POLICY "Partner can attach rental agreements"
  ON public.user_documents FOR INSERT TO authenticated
  WITH CHECK (
    category = 'rental_agreement'
    AND EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = user_documents.vehicle_id
        AND v.is_rental = true
        AND v.rental_partner_id IN (SELECT id FROM public.rental_partners WHERE owner_user_id = auth.uid())
    )
  );

-- ============ partner-logos storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-logos', 'partner-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Partner logos publicly readable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'partner-logos');

CREATE POLICY "Partners upload own logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partner-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Partners update own logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'partner-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Partners delete own logo"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'partner-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
