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
- [Project Overview](mem://project/overview) — SAVO branding, NZI-style claim forms, white-labeled approach
- [Visual Identity](mem://style/visual-identity) — Navy/grey palette, linear gradients, simplified mobile auth screen
- [Typography](mem://style/typography) — Plus Jakarta Sans, Playfair Display headers, sentence-case buttons
- [Authentication](mem://auth/authentication) — SMS OTP, Google SSO, duplicate email handling, HIBP protection
- [Data Access](mem://auth/data-access) — Strict RLS per user, admin view isolation
- [User Profiles](mem://features/user-profiles) — Email verification triggers, suppression of comms until verified
- [Mobile Deployment](mem://tech/mobile-deployment) — Routing logic for native (Capacitor) vs web entry points
- [Panel Shops Directory](mem://features/panel-shops-directory) — 200+ shops, 25km Haversine radius, CRUD admin
- [Brand Assets](mem://style/brand-assets) — Logo sizing logic, uppercase SAVO
- [Role System](mem://admin/role-system) — First user admin, Admin Overview dashboard powers
- [Account Lifecycle](mem://features/account-lifecycle) — Cascading edge function deletion, specific data requests
- [Insurance Management](mem://features/insurance-management) — Insurer tracking, manual fallback, PDF report generation
- [Tow Directory](mem://features/tow-directory) — 25km proximity radius, top 15 cap, alphabetical fallback
- [Email Integration](mem://tech/email-integration) — Resend, React Email (navy theme), html2pdf.js client-side PDFs
- [Expiry Notifications](mem://features/expiry-notifications) — 1-month multi-channel reminders (cron 8AM)
- [Insurer Communication](mem://features/insurer-communication) — 2-way messaging via Reply-To routing, realtime updates
- [Incident Reporting](mem://features/incident-reporting) — Accordion UI (no linear wizard), auto-save progress
- [Incident Management](mem://features/incident-management) — 8-char IDs, draft/saved states, messaging hidden on detail
- [Phone Authentication](mem://auth/phone-authentication) — Twilio REST, placeholder emails (`.phone.local`) blocked from sending
- [Form Design](mem://style/form-design) — Standard h-10, text-sm, layout constraints, contrast rules
- [Localization](mem://tech/localization) — Hardcoded English, browser default for dates
- [Incident Photos](mem://features/incident-photos) — Batch selection, client-side compression (1920px, 75%)
- [PWA Deployment](mem://tech/pwa-deployment) — viewport-fit=cover, install prompt suppressed
- [Cross-App Integration](mem://features/cross-app-integration) — Edge function for 10-min login tokens (external-login)
- [Data Fetching](mem://tech/performance/data-fetching) — `resolveUserId` utility, Promise.all parallelization
- [Asset Optimization](mem://tech/performance/asset-optimization) — Supabase image URL transforms, lazy loading
- [Dependencies](mem://tech/build/dependencies) — Vite 5.4.0, requires --legacy-peer-deps
- [Vehicle Garage Uniqueness](mem://features/vehicle-garage/uniqueness-constraint) — Composite unique constraint (user_id, rego_number)
- [Vehicle Garage Data](mem://features/vehicle-garage/data-handling) — WOF/Rego use empty strings, deletion modal
- [Animations](mem://style/animations) — Framer-motion staggered entrance, y-axis lifts
- [Incident Distribution](mem://features/incident-distribution) — Branded PDF email restricted to user's registered email only
- [Blog](mem://features/blog) — SEO react-markdown blog, tailwind typography, grayscale hero
- [Courtesy Car Integration](mem://features/courtesy-car-integration) — White-labeled Free 2 Drive request workflow
- [Public Navigation](mem://features/public-navigation) — Home.tsx SEO landing, auth redirected, split nav
- [Navigation Patterns](mem://style/navigation-patterns) — Fixed bottom nav, safe-area-inset, double-click protection
- [Push Notifications](mem://features/push-notifications) — VAPID Web Push for expiry alerts, sw-push.js
- [Document Vault](mem://features/document-vault) — 10MB limit, dropdown selector instead of tabs
- [Dashcam Integration](mem://features/dashcam-integration) — 100MB limit video upload, signed URLs, in-app playback
- [Dashboard Layout](mem://features/dashboard-layout) — Stat cards top, tabular-nums, omissions for mobile-first
- [Vehicle Garage UI](mem://features/vehicle-garage/ui-layout) — 2-column grid, red border for expiries, direct call
- [Offline Caching](mem://tech/performance/offline-caching) — IndexedDB `useOfflineQuery`, 5-min staleTime
- [Mobile Lighthouse](mem://tech/performance/mobile-lighthouse-optimizations) — Font preconnects, high-priority hero
- [Security Hardening](mem://tech/security-hardening) — Signed URLs, service_role restrictions on sensitive tables
- [Call Recording](mem://features/call-recording) — Twilio bridged calls with AI transcription, manual mic fallback
- [Theme System](mem://style/theme-system) — Light/dark ThemeContext + .dark class, Garage page scoped palette + glass utilities
- [Home-screen Widget](mem://features/home-screen-widget) — Android Glance + iOS scaffold, /widget-setup, widget-data edge fn, savo:// deep links
- [Fleet Manager](mem://features/fleet-manager) — Manager invites drivers, assigns vehicles via fleet_vehicle_assignments; drivers see only assigned vehicles
- [Insurance Broker](mem://features/insurance-broker) — Self-signup + admin approval; brokers view+add only on linked customer data
- [Replacement Vehicle Links](mem://features/replacement-vehicle-links) — F2D wording rules + seeded, varied anchor text component for directory/blog pages
- [Directory Prerender](mem://tech/directory-prerender) — postbuild static HTML for tow/panel-beater routes, MAX_PRERENDER_PAGES cap
