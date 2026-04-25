CREATE OR REPLACE FUNCTION public.is_family_head(_family_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.families
    WHERE id = _family_id
      AND head_user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_family_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id
  FROM public.family_members
  WHERE user_id = _user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_family_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_family_id(auth.uid());
$$;

DROP POLICY IF EXISTS "Head can manage members" ON public.family_members;
DROP POLICY IF EXISTS "Members can view family roster" ON public.family_members;
DROP POLICY IF EXISTS "Members can leave family" ON public.family_members;
DROP POLICY IF EXISTS "Members can view their family" ON public.families;

CREATE POLICY "Head can manage members"
ON public.family_members
FOR ALL
TO authenticated
USING (public.is_family_head(family_id, auth.uid()))
WITH CHECK (public.is_family_head(family_id, auth.uid()));

CREATE POLICY "Members can view family roster"
ON public.family_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR family_id = public.user_family_id(auth.uid())
);

CREATE POLICY "Members can leave family"
ON public.family_members
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND role = 'member');

CREATE POLICY "Members can view their family"
ON public.families
FOR SELECT
TO authenticated
USING (
  auth.uid() = head_user_id
  OR id = public.user_family_id(auth.uid())
);