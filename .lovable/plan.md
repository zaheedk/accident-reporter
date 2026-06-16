# Panel Shop Job Tracker — Build Spec

A lightweight customer + job layer for panel shops that **complements** PanelQuote instead of replacing it. Shops keep quoting/parts/invoicing in PanelQuote; SAVO owns everything PanelQuote ignores — the customer, the assessor conversation, photo evidence, and status visibility.

## Positioning

- **PanelQuote** = system of record for quote, parts, invoice (assessor-facing).
- **SAVO Shop** = system of record for the customer + job status + evidence (customer-facing).
- One link field on each SAVO job: `panelquote_ref` (free text). No API integration needed on day one.

## Who it's for

Panel shop staff (front-desk, estimator, workshop manager). Mobile-first because half the work happens on the workshop floor with a phone.

## Scope — MVP (4–6 weeks)

### 1. Shop workspace
- New role `panel_shop_staff` + `panel_shop_id` on `profiles`.
- Each `panel_shops` row gains an owner account; staff invites mirror the existing fleet/broker invite pattern.
- New route `/shop` — shop dashboard, only visible to shop staff.

### 2. Job board
- New table `shop_jobs`: customer, vehicle, insurer, assessor, status, `panelquote_ref`, dates, assigned tech, notes.
- Status pipeline: `new → quoting → approved → in_repair → qc → ready → collected`.
- Kanban + list view. Filter by status, insurer, tech.
- Two sources of jobs:
  - Auto-created from a SAVO claim when the customer picks this shop.
  - Manually created for walk-ins (shop types in customer + rego).

### 3. Customer + vehicle (reuse existing tables)
- Walk-in customers get a lightweight `profiles` row (no auth) the shop owns; if that email/phone later signs up to SAVO, the records merge.
- Vehicle reuses `vehicles` table with `panel_shop_id` ownership flag for shop-created records.

### 4. Photo evidence
- Reuse `claim_photos` + storage bucket. Categories: pre-repair, mid-repair, post-repair, parts, damage close-up.
- Shop staff can capture from `/shop/jobs/:id` — same compression pipeline already in `PhotoCapture.tsx`.

### 5. Customer-facing tracker
- Public URL per job: `/job/:slug` (8-char slug like claims). No login required, link sent via SMS/email.
- Shows: current status, next step, ETA, post-repair photos, shop contact, "approve quote" button when status = quoting.
- This is the wedge — customers see live progress, shops stop fielding "is my car ready" calls.

### 6. Assessor messaging
- Reuse `claim_messages` thread per job. Inbound reply-to email already works (`inbound-email-webhook`).
- Assessor gets a magic link to view photos + leave notes without an account.

### 7. PanelQuote bridge (manual, not API)
- One field: paste PanelQuote job number.
- One button: "Email this job pack to assessor" → PDF with customer details, vehicle, photos, damage notes. Assessor re-keys into PanelQuote (same as today, but with everything in one email instead of five).

## Out of scope for MVP

Quoting calculator, parts ordering, invoicing, GST, Xero sync, labour-time estimates, paint codes. All of that stays in PanelQuote. Revisit only after 20+ shops are active daily.

## Technical plan

### New tables
```text
shop_jobs           id, panel_shop_id, claim_id?, customer_profile_id, vehicle_id,
                    insurer_id, assessor_name, assessor_email, status, panelquote_ref,
                    public_slug, assigned_tech_id, dropoff_at, eta_at, completed_at, notes
shop_job_events     id, shop_job_id, actor_id, event_type, payload, created_at
shop_staff          id, panel_shop_id, user_id, role (owner|estimator|tech|frontdesk)
```
Plus `panel_shop_id` on `profiles` (nullable).

### RLS
- Shop staff see only jobs where `panel_shop_id` matches their `shop_staff` row.
- Customers see their own jobs via existing `auth.uid()` checks on the linked claim/vehicle.
- Public tracker uses `public_slug` + edge function (`get-public-job`) — no direct table read from anon.

### Pages
- `/shop` — kanban dashboard
- `/shop/jobs/:id` — job detail (photos, messages, status, panelquote_ref)
- `/shop/customers` — customer list
- `/shop/settings` — staff invites, shop profile, opening hours
- `/job/:slug` — public customer tracker

### Edge functions
- `shop-invite` (mirror `fleet-invite`)
- `get-public-job` (anon, slug-only read)
- `send-job-pack` (PDF + email to assessor, reuses Resend setup)

### Reuse
- `PhotoCapture`, `claim_photos`, `claim_messages`, `inbound-email-webhook`, `send-email`, `email-templates`, `notifications`, `push` — all already exist.

## Go-to-market sequence

1. Build MVP with **one pilot shop** (pick a friendly one in Auckland) — no signups yet.
2. Run real jobs through it for 4 weeks, fix everything they complain about.
3. Open to 5 shops in their network. Free for 6 months in exchange for weekly feedback.
4. Only after 20 shops are using it daily do we approach Solera for the PanelQuote API — by then we have leverage ("our shops want this", not "please let us in").

## What I need from you before I start building

1. **Pilot shop confirmed?** Without one this is theatre.
2. **Confirm scope** — anything above you want to cut or add for MVP?
3. **Pricing model** — free during pilot, then per-shop/month? Per-job? Decide before launch so the billing fields go into the schema now.

Reply with answers (or "go" to accept the spec as-is) and I'll start with the schema migration + `/shop` skeleton.
