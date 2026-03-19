-- Allow admins to view all vehicles
CREATE POLICY "Admins can view all vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all claims
CREATE POLICY "Admins can view all claims"
  ON public.claims FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));