
-- Make sensitive buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('claim-photos', 'tp-photos', 'vehicle-photos');

-- Ensure no non-admin INSERT on user_roles
-- The assign_first_user_admin trigger handles inserts via SECURITY DEFINER
-- Add explicit deny: only admins can insert
DROP POLICY IF EXISTS "No direct role inserts" ON public.user_roles;
CREATE POLICY "No direct role inserts"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);
