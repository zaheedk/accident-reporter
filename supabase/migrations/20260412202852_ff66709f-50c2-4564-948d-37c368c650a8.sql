-- Revoke client-level access from email infrastructure tables (service_role only)
REVOKE SELECT, INSERT, UPDATE, DELETE ON email_send_log FROM authenticated, anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON email_send_state FROM authenticated, anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON email_unsubscribe_tokens FROM authenticated, anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON suppressed_emails FROM authenticated, anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON email_verification_tokens FROM authenticated, anon;

-- Add service_role-only policy to email_verification_tokens (fixes RLS-enabled-no-policy linter warning)
CREATE POLICY "Service role only" ON email_verification_tokens
  FOR ALL USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);