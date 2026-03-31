
CREATE TABLE public.login_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  rego_number text NOT NULL DEFAULT '',
  used boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.login_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.login_tokens FOR ALL TO public USING (false);

CREATE INDEX idx_login_tokens_token ON public.login_tokens (token);
