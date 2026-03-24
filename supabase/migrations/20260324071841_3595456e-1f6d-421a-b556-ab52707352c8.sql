
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verification_token text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verification_expires_at timestamp with time zone DEFAULT NULL;
