
ALTER TABLE public.call_recordings
  ADD COLUMN IF NOT EXISTS recording_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS transcript text DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary text DEFAULT '',
  ADD COLUMN IF NOT EXISTS twilio_call_sid text DEFAULT '',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'complete';
