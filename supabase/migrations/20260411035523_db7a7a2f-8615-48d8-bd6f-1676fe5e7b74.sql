
-- Remove old public-role policies on claims (the ones without "TO authenticated")
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'claims' AND schemaname = 'public'
    AND roles = '{public}'
    AND cmd IN ('a', 'w', 'd')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.claims', pol.policyname);
  END LOOP;
  
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'vehicles' AND schemaname = 'public'
    AND roles = '{public}'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vehicles', pol.policyname);
  END LOOP;
END$$;

-- Add admin SELECT on repair_requests
CREATE POLICY "Admins can view repair requests"
ON public.repair_requests FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
