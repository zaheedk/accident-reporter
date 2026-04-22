-- Add source column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'direct';

CREATE INDEX IF NOT EXISTS idx_profiles_source ON public.profiles(source);

-- Backfill: mark users that exist in login_tokens as jamesblond
UPDATE public.profiles p
SET source = 'jamesblond'
WHERE EXISTS (
  SELECT 1 FROM public.login_tokens lt WHERE lt.user_id = p.user_id
);

-- Update handle_new_user trigger function to honor source from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url, source)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    COALESCE(NEW.raw_user_meta_data->>'source', 'direct')
  );
  RETURN NEW;
END;
$function$;