ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS quiz_enabled boolean NOT NULL DEFAULT true, ADD COLUMN IF NOT EXISTS expiry_enabled boolean NOT NULL DEFAULT true;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
