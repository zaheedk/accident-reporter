
ALTER TABLE public.claims ADD COLUMN report_number text;

CREATE OR REPLACE FUNCTION public.generate_report_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  NEW.report_number := result;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_report_number
  BEFORE INSERT ON public.claims
  FOR EACH ROW
  WHEN (NEW.report_number IS NULL)
  EXECUTE FUNCTION public.generate_report_number();

UPDATE public.claims SET report_number = (
  SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 31 + 1)::int, 1), '')
  FROM generate_series(1, 8)
) WHERE report_number IS NULL;
