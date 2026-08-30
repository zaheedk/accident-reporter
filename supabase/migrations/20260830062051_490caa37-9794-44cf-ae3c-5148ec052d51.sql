CREATE TABLE public.traffic_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_url text NOT NULL,
  guid text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'incident',
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_traffic_alerts_published ON public.traffic_alerts (published_at DESC);

GRANT SELECT ON public.traffic_alerts TO anon, authenticated;
GRANT ALL ON public.traffic_alerts TO service_role;

ALTER TABLE public.traffic_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read traffic alerts"
ON public.traffic_alerts FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage traffic alerts"
ON public.traffic_alerts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));