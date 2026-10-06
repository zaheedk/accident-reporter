CREATE TABLE public.partner_referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner text NOT NULL DEFAULT 'free2drive',
  source text NOT NULL,
  action text NOT NULL CHECK (action IN ('apply','call')),
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.partner_referral_clicks TO anon, authenticated;
GRANT SELECT ON public.partner_referral_clicks TO authenticated;
GRANT ALL ON public.partner_referral_clicks TO service_role;
ALTER TABLE public.partner_referral_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log a click" ON public.partner_referral_clicks FOR INSERT TO anon, authenticated
  WITH CHECK (length(source) <= 80 AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "Admins read clicks" ON public.partner_referral_clicks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));