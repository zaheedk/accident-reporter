ALTER TABLE public.vehicles DROP CONSTRAINT vehicles_rego_number_unique;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_user_rego_unique UNIQUE (user_id, rego_number);