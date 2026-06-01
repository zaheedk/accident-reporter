CREATE POLICY "Customers view rental partner for own rental vehicles"
  ON public.rental_partners FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.rental_partner_id = rental_partners.id
        AND v.user_id = auth.uid()
    )
  );