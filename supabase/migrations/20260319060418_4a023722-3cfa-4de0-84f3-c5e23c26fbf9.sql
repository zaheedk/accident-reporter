ALTER TABLE public.vehicles
  ADD COLUMN insurance_company text NOT NULL DEFAULT '',
  ADD COLUMN insurance_policy_number text NOT NULL DEFAULT '',
  ADD COLUMN insurance_expiry text NOT NULL DEFAULT '';