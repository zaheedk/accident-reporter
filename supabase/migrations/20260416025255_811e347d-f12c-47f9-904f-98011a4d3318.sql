CREATE POLICY "Users can update own call recordings"
ON public.call_recordings
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);