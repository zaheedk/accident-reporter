
CREATE TABLE public.claim_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  to_email text NOT NULL DEFAULT '',
  resend_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.claim_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own claim messages"
  ON public.claim_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own claim messages"
  ON public.claim_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all claim messages"
  ON public.claim_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.claim_messages;
