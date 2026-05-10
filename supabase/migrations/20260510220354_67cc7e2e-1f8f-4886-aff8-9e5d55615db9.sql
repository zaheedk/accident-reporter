
-- ============= FLEET TABLES =============
CREATE TABLE public.fleets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My Fleet',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fleet_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_id uuid NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'driver',
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fleet_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_id uuid NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  email text,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_by uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fleet_vehicle_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_id uuid NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL UNIQUE,
  driver_user_id uuid,
  assigned_by uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fleet_members_fleet ON public.fleet_members(fleet_id);
CREATE INDEX idx_fleet_assignments_fleet ON public.fleet_vehicle_assignments(fleet_id);
CREATE INDEX idx_fleet_assignments_driver ON public.fleet_vehicle_assignments(driver_user_id);

-- ============= HELPERS =============
CREATE OR REPLACE FUNCTION public.user_fleet_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT fleet_id FROM public.fleet_members WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_fleet_manager(_fleet_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fleets WHERE id = _fleet_id AND manager_user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.driver_can_see_vehicle(_user_id uuid, _vehicle_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fleet_vehicle_assignments
    WHERE vehicle_id = _vehicle_id AND driver_user_id = _user_id
  );
$$;

-- ============= TRIGGER: add manager as member =============
CREATE OR REPLACE FUNCTION public.add_manager_as_fleet_member()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.fleet_members (fleet_id, user_id, role)
  VALUES (NEW.id, NEW.manager_user_id, 'manager')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_add_manager_as_fleet_member
AFTER INSERT ON public.fleets
FOR EACH ROW EXECUTE FUNCTION public.add_manager_as_fleet_member();

CREATE TRIGGER trg_fleets_updated_at
BEFORE UPDATE ON public.fleets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= RLS =============
ALTER TABLE public.fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicle_assignments ENABLE ROW LEVEL SECURITY;

-- fleets
CREATE POLICY "Manager can manage own fleet"
  ON public.fleets FOR ALL TO authenticated
  USING (auth.uid() = manager_user_id)
  WITH CHECK (auth.uid() = manager_user_id);

CREATE POLICY "Members can view their fleet"
  ON public.fleets FOR SELECT TO authenticated
  USING (auth.uid() = manager_user_id OR id = public.user_fleet_id(auth.uid()));

-- fleet_members
CREATE POLICY "Manager can manage fleet members"
  ON public.fleet_members FOR ALL TO authenticated
  USING (public.is_fleet_manager(fleet_id, auth.uid()))
  WITH CHECK (public.is_fleet_manager(fleet_id, auth.uid()));

CREATE POLICY "Driver can leave fleet"
  ON public.fleet_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND role = 'driver');

CREATE POLICY "Members can view fleet roster"
  ON public.fleet_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR fleet_id = public.user_fleet_id(auth.uid()));

-- fleet_invites
CREATE POLICY "Manager can manage invites"
  ON public.fleet_invites FOR ALL TO authenticated
  USING (public.is_fleet_manager(fleet_id, auth.uid()))
  WITH CHECK (public.is_fleet_manager(fleet_id, auth.uid()));

-- fleet_vehicle_assignments
CREATE POLICY "Manager can manage assignments"
  ON public.fleet_vehicle_assignments FOR ALL TO authenticated
  USING (public.is_fleet_manager(fleet_id, auth.uid()))
  WITH CHECK (public.is_fleet_manager(fleet_id, auth.uid()));

CREATE POLICY "Driver can view own assignments"
  ON public.fleet_vehicle_assignments FOR SELECT TO authenticated
  USING (driver_user_id = auth.uid());

-- ============= VEHICLES: extra SELECT policy for assigned drivers =============
CREATE POLICY "Drivers can view assigned fleet vehicles"
  ON public.vehicles FOR SELECT TO authenticated
  USING (public.driver_can_see_vehicle(auth.uid(), id));
