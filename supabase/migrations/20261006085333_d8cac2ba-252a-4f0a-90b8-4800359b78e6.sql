CREATE TABLE public.seo_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_snapshots TO authenticated;
GRANT ALL ON public.seo_snapshots TO service_role;
ALTER TABLE public.seo_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view SEO snapshots" ON public.seo_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX seo_snapshots_created_idx ON public.seo_snapshots (created_at DESC);