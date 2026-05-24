---
name: Insurance Broker
description: Brokers manage clients via self-signup + admin approval; view+add only on linked customer vehicles/documents/claims
type: feature
---

## Architecture

- `brokerages` (one per broker user), `broker_applications` (pending admin review), `broker_clients` (broker↔customer link with status invited/active/revoked), `broker_invites` (codes).
- Helpers: `user_brokerage_id`, `is_broker_for(broker, client)`.
- `can_access_user_data` extended to grant brokers READ access to client data (cascades to vehicles, claims, claim_photos, user_documents, notifications, etc.).
- Brokers get explicit INSERT policy on `vehicles` and `user_documents` when `is_broker_for(auth.uid(), user_id)`.
- View+add only: no UPDATE/DELETE policies on customer-owned rows for brokers.

## Flow

- Broker applies via `/broker` → application row created. Admin approves via UserManagement → `admin-broker` edge fn creates `brokerages` row.
- Broker invites client via email → `broker-invite` (action=invite) sends Resend email with 8-char code. Link: `/broker?code=...`.
- Client accepts via Broker page → `broker_clients.client_user_id` set, status=active.
- Customer can revoke from `/broker` (updates broker_clients.status='revoked').
- ClaimDetail "Email signed report to broker" sends PDF email to brokerage.contact_email, only when declaration_signed_at is set.
