ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vehicles_user_default
  ON public.vehicles(user_id) WHERE is_default = true;

CREATE OR REPLACE FUNCTION public.ensure_single_default_vehicle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.vehicles
       SET is_default = false
     WHERE user_id = NEW.user_id
       AND id <> NEW.id
       AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_default_vehicle ON public.vehicles;
CREATE TRIGGER trg_single_default_vehicle
BEFORE INSERT OR UPDATE OF is_default ON public.vehicles
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION public.ensure_single_default_vehicle();