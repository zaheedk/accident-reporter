ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS broker_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS broker_name  text NOT NULL DEFAULT '';