
-- Remove public-role policies on claims
DROP POLICY IF EXISTS "Users can create their own claims" ON public.claims;
DROP POLICY IF EXISTS "Users can delete their own claims" ON public.claims;
DROP POLICY IF EXISTS "Users can update their own claims" ON public.claims;
DROP POLICY IF EXISTS "Users can view their own claims" ON public.claims;

-- Re-create as authenticated-only
CREATE POLICY "Users can update their own claims"
ON public.claims FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own claims"
ON public.claims FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add user SELECT for vehicles
CREATE POLICY "Users can view own vehicles"
ON public.vehicles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
