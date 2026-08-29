CREATE TABLE public.road_hazards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hazard_type text not null,
  description text not null default '',
  latitude double precision not null,
  longitude double precision not null,
  location_label text not null default '',
  region text not null default '',
  is_active boolean not null default true,
  expires_at timestamptz not null default (now() + interval '48 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.road_hazards TO authenticated;
GRANT ALL ON public.road_hazards TO service_role;
ALTER TABLE public.road_hazards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view active hazards" ON public.road_hazards FOR SELECT TO authenticated USING (is_active AND expires_at > now());
CREATE POLICY "Users can report hazards" ON public.road_hazards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hazards" ON public.road_hazards FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own hazards" ON public.road_hazards FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_road_hazards_updated_at BEFORE UPDATE ON public.road_hazards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_road_hazards_active ON public.road_hazards (is_active, expires_at);

CREATE TABLE public.hazard_confirmations (
  id uuid primary key default gen_random_uuid(),
  hazard_id uuid not null references public.road_hazards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (hazard_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.hazard_confirmations TO authenticated;
GRANT ALL ON public.hazard_confirmations TO service_role;
ALTER TABLE public.hazard_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view confirmations" ON public.hazard_confirmations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can confirm hazards" ON public.hazard_confirmations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own confirmation" ON public.hazard_confirmations FOR DELETE TO authenticated USING (auth.uid() = user_id);