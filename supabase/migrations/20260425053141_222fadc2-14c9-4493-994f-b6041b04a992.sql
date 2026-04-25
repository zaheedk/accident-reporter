-- Fix infinite recursion on family_members SELECT policy.
-- The previous policy referenced are_in_same_family() which itself queries family_members.
-- We add a SECURITY DEFINER helper that returns the caller's family_id, bypassing RLS.

CREATE OR REPLACE FUNCTION public.current_user_family_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.family_members WHERE user_id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "Members can view family roster" ON public.family_members;

CREATE POLICY "Members can view family roster"
ON public.family_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR family_id = public.current_user_family_id()
);
