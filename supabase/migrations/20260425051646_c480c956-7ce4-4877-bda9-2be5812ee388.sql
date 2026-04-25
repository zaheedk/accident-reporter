-- =========================================================
-- FAMILY SHARING FEATURE
-- =========================================================

-- 1. families table: one row per family, owned by a head user
CREATE TABLE public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  head_user_id uuid NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'My Family',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. family_members: links users to families. Each user can belong to at most one family.
CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('head','member')),
  joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_members_family_id ON public.family_members(family_id);

-- 3. family_invites: pending invitations
CREATE TABLE public.family_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  email text,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_by uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_invites_family_id ON public.family_invites(family_id);
CREATE INDEX idx_family_invites_email ON public.family_invites(lower(email));

-- 4. Helper: check if two users are in the same family (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.are_in_same_family(_user_a uuid, _user_b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members a
    JOIN public.family_members b ON a.family_id = b.family_id
    WHERE a.user_id = _user_a AND b.user_id = _user_b
  );
$$;

-- 5. Helper: get the head (data owner) for any user in a family.
-- For the head themselves it returns their own id; for members, returns head's id; for solo users, returns their own id.
CREATE OR REPLACE FUNCTION public.family_head_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT f.head_user_id
       FROM public.family_members m
       JOIN public.families f ON f.id = m.family_id
      WHERE m.user_id = _user_id
      LIMIT 1),
    _user_id
  );
$$;

-- 6. Helper: list of user_ids whose data the given user can access
-- (themselves + head of family + all family members if they're in one)
CREATE OR REPLACE FUNCTION public.can_access_user_data(_viewer uuid, _owner uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _viewer = _owner
      OR public.are_in_same_family(_viewer, _owner);
$$;

-- 7. RLS for family tables
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

-- families: head can manage; members can view their family
CREATE POLICY "Head can manage own family" ON public.families
  FOR ALL TO authenticated
  USING (auth.uid() = head_user_id)
  WITH CHECK (auth.uid() = head_user_id);

CREATE POLICY "Members can view their family" ON public.families
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = families.id AND fm.user_id = auth.uid()
  ));

-- family_members: head can manage all members of their family; members can view their own family roster; member can remove themselves
CREATE POLICY "Head can manage members" ON public.family_members
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.families f
    WHERE f.id = family_members.family_id AND f.head_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.families f
    WHERE f.id = family_members.family_id AND f.head_user_id = auth.uid()
  ));

CREATE POLICY "Members can view family roster" ON public.family_members
  FOR SELECT TO authenticated
  USING (public.are_in_same_family(auth.uid(), user_id));

CREATE POLICY "Members can leave family" ON public.family_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND role = 'member');

-- family_invites: head can create/manage; invitee (matching email) can view and accept
CREATE POLICY "Head can manage invites" ON public.family_invites
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.families f
    WHERE f.id = family_invites.family_id AND f.head_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.families f
    WHERE f.id = family_invites.family_id AND f.head_user_id = auth.uid()
  ));

-- 8. Trigger to auto-add head as a family_member row when a family is created
CREATE OR REPLACE FUNCTION public.add_head_as_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (NEW.id, NEW.head_user_id, 'head')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_add_head_as_member
AFTER INSERT ON public.families
FOR EACH ROW EXECUTE FUNCTION public.add_head_as_member();

-- 9. Updated_at trigger
CREATE TRIGGER trg_families_updated_at
BEFORE UPDATE ON public.families
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 10. EXTEND EXISTING POLICIES TO INCLUDE FAMILY MEMBERS
-- =========================================================

-- VEHICLES: members can view family head's vehicles
DROP POLICY IF EXISTS "Users can view own vehicles" ON public.vehicles;
CREATE POLICY "Users can view own or family vehicles" ON public.vehicles
  FOR SELECT TO authenticated
  USING (public.can_access_user_data(auth.uid(), user_id));

-- CLAIMS: members can view family-shared claims AND create new claims (assigned to themselves)
DROP POLICY IF EXISTS "Users can view their own claims" ON public.claims;
CREATE POLICY "Users can view own or family claims" ON public.claims
  FOR SELECT TO authenticated
  USING (public.can_access_user_data(auth.uid(), user_id));

-- CLAIM PHOTOS: members can view family-shared photos
DROP POLICY IF EXISTS "Users can view own claim photos" ON public.claim_photos;
CREATE POLICY "Users can view own or family claim photos" ON public.claim_photos
  FOR SELECT TO authenticated
  USING (public.can_access_user_data(auth.uid(), user_id));

-- TP PHOTOS: add a view policy for family
CREATE POLICY "Family members can view tp photos" ON public.tp_photos
  FOR SELECT TO authenticated
  USING (public.can_access_user_data(auth.uid(), user_id));

-- USER DOCUMENTS: members can view family head's documents
CREATE POLICY "Family members can view documents" ON public.user_documents
  FOR SELECT TO authenticated
  USING (public.can_access_user_data(auth.uid(), user_id));

-- NOTIFICATIONS: members can view notifications addressed to family head
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view own or family notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (public.can_access_user_data(auth.uid(), user_id));

-- CLAIM MESSAGES: family members can view shared claim messages
DROP POLICY IF EXISTS "Users can view their own claim messages" ON public.claim_messages;
CREATE POLICY "Users can view own or family claim messages" ON public.claim_messages
  FOR SELECT TO authenticated
  USING (public.can_access_user_data(auth.uid(), user_id));
