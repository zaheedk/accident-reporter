-- Drop the overly restrictive policy that blocks all access including service_role clarity
DROP POLICY IF EXISTS "Service role only" ON login_tokens;

-- Add explicit service_role policies (matching pattern used for other sensitive tables)
CREATE POLICY "Service role can manage login tokens"
  ON login_tokens FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Explicitly deny anon/authenticated access
REVOKE SELECT, INSERT, UPDATE, DELETE ON login_tokens FROM authenticated, anon;