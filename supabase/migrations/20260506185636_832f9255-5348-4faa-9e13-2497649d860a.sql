-- Restrict admin SELECT on vehicles & claims to own/family only.
-- The previous "Admins can view all *" PERMISSIVE policies combined via OR
-- with the per-user policies, granting admins visibility into every user's
-- data across the main app. Admin Dashboard cross-user views should use
-- service_role queries (edge function) instead.

DROP POLICY IF EXISTS "Admins can view all vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can view all claims" ON public.claims;

-- Also tighten related per-user tables that had broad admin SELECT
DROP POLICY IF EXISTS "Admins can view all claim messages" ON public.claim_messages;
DROP POLICY IF EXISTS "Admins can view all tp photos" ON public.tp_photos;
DROP POLICY IF EXISTS "Admins can view all call recordings" ON public.call_recordings;