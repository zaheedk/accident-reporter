
-- Create a server-only table for email verification tokens
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service_role (which bypasses RLS) can access

-- Migrate existing tokens
INSERT INTO public.email_verification_tokens (user_id, token, expires_at)
SELECT user_id, email_verification_token, email_verification_expires_at
FROM public.profiles
WHERE email_verification_token IS NOT NULL AND email_verification_expires_at IS NOT NULL;

-- Remove token columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email_verification_token;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email_verification_expires_at;
