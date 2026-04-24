-- Add slug column to vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS slug text;

-- Trigger function: generate an 8-char alphanumeric slug, mirrors claims.report_number generator
CREATE OR REPLACE FUNCTION public.generate_vehicle_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    LOOP
      result := '';
      FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.vehicles WHERE slug = result);
    END LOOP;
    NEW.slug := result;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS set_vehicle_slug ON public.vehicles;
CREATE TRIGGER set_vehicle_slug
  BEFORE INSERT ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_vehicle_slug();

-- Backfill existing rows
DO $$
DECLARE
  v RECORD;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  i int;
BEGIN
  FOR v IN SELECT id FROM public.vehicles WHERE slug IS NULL OR slug = '' LOOP
    LOOP
      result := '';
      FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.vehicles WHERE slug = result);
    END LOOP;
    UPDATE public.vehicles SET slug = result WHERE id = v.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS vehicles_slug_unique ON public.vehicles(slug);