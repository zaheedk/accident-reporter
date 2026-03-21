
-- Add claim_number as auto-incrementing integer
CREATE SEQUENCE IF NOT EXISTS public.claim_number_seq START 1;

ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS claim_number integer UNIQUE DEFAULT nextval('public.claim_number_seq');

-- Backfill existing claims with sequential numbers based on creation order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.claims
  WHERE claim_number IS NULL
)
UPDATE public.claims SET claim_number = numbered.rn
FROM numbered WHERE public.claims.id = numbered.id;
