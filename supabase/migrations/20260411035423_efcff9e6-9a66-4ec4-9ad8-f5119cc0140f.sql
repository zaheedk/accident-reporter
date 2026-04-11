
-- Fix claims policies: restrict to authenticated role
DROP POLICY IF EXISTS "Users can insert own claims" ON public.claims;
DROP POLICY IF EXISTS "Users can delete own claims" ON public.claims;

CREATE POLICY "Users can insert own claims"
ON public.claims FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own claims"
ON public.claims FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Fix vehicles policies: restrict to authenticated role
DROP POLICY IF EXISTS "Users can insert own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can delete own vehicles" ON public.vehicles;

CREATE POLICY "Users can insert own vehicles"
ON public.vehicles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles"
ON public.vehicles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles"
ON public.vehicles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add admin UPDATE policy for repair_requests
CREATE POLICY "Admins can update repair requests"
ON public.repair_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete repair requests"
ON public.repair_requests FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
