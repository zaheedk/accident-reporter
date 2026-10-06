CREATE TABLE public.shop_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_shop_id uuid NOT NULL REFERENCES public.panel_shops(id) ON DELETE CASCADE,
  email text NOT NULL,
  opt_out_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18),'hex'),
  status text NOT NULL DEFAULT 'sent',
  error text NOT NULL DEFAULT '',
  sent_by uuid,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opted_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (panel_shop_id)
);
GRANT SELECT ON public.shop_outreach TO authenticated;
GRANT ALL ON public.shop_outreach TO service_role;
ALTER TABLE public.shop_outreach ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view outreach" ON public.shop_outreach FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));