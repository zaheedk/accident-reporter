-- Widget tokens: long-lived per-device tokens that let a home-screen widget
-- fetch a small payload of the user's data without storing the full Supabase session.
CREATE TABLE public.widget_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  device_label text NOT NULL DEFAULT '',
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '180 days')
);

CREATE INDEX idx_widget_tokens_user ON public.widget_tokens(user_id);
CREATE INDEX idx_widget_tokens_token ON public.widget_tokens(token);

ALTER TABLE public.widget_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage (view / create / revoke) their own widget tokens
CREATE POLICY "Users can view own widget tokens"
ON public.widget_tokens FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own widget tokens"
ON public.widget_tokens FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own widget tokens"
ON public.widget_tokens FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- The widget edge function uses the service role key to look up tokens, so no
-- public/anon read policy is required.