ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS declaration_signature TEXT,
  ADD COLUMN IF NOT EXISTS declaration_signed_name TEXT,
  ADD COLUMN IF NOT EXISTS declaration_signed_at TIMESTAMPTZ;