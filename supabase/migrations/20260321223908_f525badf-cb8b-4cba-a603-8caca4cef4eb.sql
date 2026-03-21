
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
