ALTER TABLE public.insurance_companies 
  ADD COLUMN claims_portal_url text NOT NULL DEFAULT '',
  ADD COLUMN claims_method text NOT NULL DEFAULT 'phone';