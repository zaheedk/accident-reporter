-- Brokerages
CREATE TABLE public.brokerages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL UNIQUE,
  company_name text NOT NULL DEFAULT '',
  license_number text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brokerages ENABLE ROW LEVEL SECURITY;

-- Broker applications (pending admin approval)
CREATE TABLE public.broker_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL DEFAULT '',
  license_number text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  admin_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
ALTER TABLE public.broker_applications ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX broker_apps_one_pending_per_user ON public.broker_applications(user_id) WHERE status = 'pending';

-- Broker <-> client link
CREATE TABLE public.broker_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brokerage_id uuid NOT NULL REFERENCES public.brokerages(id) ON DELETE CASCADE,
  client_user_id uuid,
  client_email text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  client_phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'invited', -- invited | active | revoked
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);
ALTER TABLE public.broker_clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX broker_clients_brokerage_idx ON public.broker_clients(brokerage_id);
CREATE INDEX broker_clients_client_user_idx ON public.broker_clients(client_user_id);
CREATE UNIQUE INDEX broker_clients_unique_active ON public.broker_clients(brokerage_id, client_user_id) WHERE client_user_id IS NOT NULL;

-- Broker invites
CREATE TABLE public.broker_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brokerage_id uuid NOT NULL REFERENCES public.brokerages(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  code text NOT NULL UNIQUE,
  email text,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.broker_invites ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.user_brokerage_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.brokerages WHERE owner_user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_broker_for(_broker_uid uuid, _client_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.broker_clients bc
      JOIN public.brokerages b ON b.id = bc.brokerage_id
     WHERE b.owner_user_id = _broker_uid
       AND bc.client_user_id = _client_uid
       AND bc.status = 'active'
  );
$$;

-- Extend the shared access helper to also grant brokers read access to client data
CREATE OR REPLACE FUNCTION public.can_access_user_data(_viewer uuid, _owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _viewer = _owner
      OR public.are_in_same_family(_viewer, _owner)
      OR public.is_broker_for(_viewer, _owner);
$$;

-- RLS: brokerages
CREATE POLICY "Owner manages own brokerage" ON public.brokerages
  FOR ALL TO authenticated USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Admins view all brokerages" ON public.brokerages
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: broker_applications
CREATE POLICY "User can create own application" ON public.broker_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can view own application" ON public.broker_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin updates applications" ON public.broker_applications
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS: broker_clients
CREATE POLICY "Broker manages own clients" ON public.broker_clients
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brokerages b WHERE b.id = brokerage_id AND b.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brokerages b WHERE b.id = brokerage_id AND b.owner_user_id = auth.uid()));
CREATE POLICY "Client can view own link" ON public.broker_clients
  FOR SELECT TO authenticated USING (client_user_id = auth.uid());
CREATE POLICY "Client can revoke own link" ON public.broker_clients
  FOR UPDATE TO authenticated USING (client_user_id = auth.uid()) WITH CHECK (client_user_id = auth.uid() AND status = 'revoked');

-- RLS: broker_invites
CREATE POLICY "Broker manages own invites" ON public.broker_invites
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brokerages b WHERE b.id = brokerage_id AND b.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brokerages b WHERE b.id = brokerage_id AND b.owner_user_id = auth.uid()));

-- Broker can INSERT vehicles & documents on behalf of linked clients (view+add only)
CREATE POLICY "Broker can add vehicles for clients" ON public.vehicles
  FOR INSERT TO authenticated WITH CHECK (public.is_broker_for(auth.uid(), user_id));

CREATE POLICY "Broker can add documents for clients" ON public.user_documents
  FOR INSERT TO authenticated WITH CHECK (public.is_broker_for(auth.uid(), user_id));

-- Trigger: keep updated_at fresh
CREATE TRIGGER trg_brokerages_updated_at
BEFORE UPDATE ON public.brokerages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();