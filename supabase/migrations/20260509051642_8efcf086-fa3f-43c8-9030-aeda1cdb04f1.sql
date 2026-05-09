
CREATE TABLE public.damage_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL,
  user_id UUID NOT NULL,
  overall_severity TEXT NOT NULL DEFAULT 'unknown',
  zones_count INTEGER NOT NULL DEFAULT 0,
  confidence INTEGER NOT NULL DEFAULT 0,
  cost_low INTEGER NOT NULL DEFAULT 0,
  cost_high INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NZD',
  zones JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_damage_assessments_claim ON public.damage_assessments(claim_id);
CREATE INDEX idx_damage_assessments_user ON public.damage_assessments(user_id);

ALTER TABLE public.damage_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or family damage assessments"
ON public.damage_assessments FOR SELECT TO authenticated
USING (public.can_access_user_data(auth.uid(), user_id));

CREATE POLICY "Users can insert own damage assessments"
ON public.damage_assessments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own damage assessments"
ON public.damage_assessments FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own damage assessments"
ON public.damage_assessments FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER trg_damage_assessments_updated_at
BEFORE UPDATE ON public.damage_assessments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
