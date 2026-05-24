# Memory: index.md
Updated: today

# Project Memory

## Core
Branding: Uppercase 'SAVO', dark navy (#1e3a5f), white header. Hardcoded English (no i18n).
UI: Plus Jakarta Sans (body), Playfair Display (headers). Forms: h-10, text-sm, native clear buttons suppressed.
Auth: Strict RLS per user, admin isolation. Mobile native routes to `/auth`, web to `/`.
Data: Use `resolveUserId` utility instead of `supabase.auth.getUser()`. WOF/Rego expiries use empty strings (not null).
Storage: All buckets private, require signed URLs. `service_role` required for sensitive database tables.

## Memories
- [Insurance Broker](mem://features/insurance-broker) — Self-signup + admin approval; brokers view+add only on linked customer data
- [Fleet Manager](mem://features/fleet-manager) — Manager invites drivers, assigns vehicles via fleet_vehicle_assignments; drivers see only assigned vehicles
- (existing entries preserved above)
