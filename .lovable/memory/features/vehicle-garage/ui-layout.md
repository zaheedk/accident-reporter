---
name: Garage + Dashboard UI Layout
description: Apple/Linear style — sidebar + main, near-white surfaces, hairline borders, no glass/glow, dot-prefixed status pills. Shared by Garage and Dashboard pages.
type: design
---

The Garage and Dashboard pages share an Apple/Linear inspired aesthetic. Scoped via `.theme-garage` and `.theme-dashboard` in `src/index.css` (identical palettes) — near-white background (#F8F8FA light / #111113 dark), white/near-black solid card surfaces, and hairline `border` tokens. **No glassmorphism, no ambient glow, no progress rings.**

Layout on tablet+ (≥768px) is a left rail (~260–280px) + main column. Mobile (<768px) stays single-column with the original hero action tiles.

**Garage left rail:** Active/Inactive filter tiles + Alerts panel.
**Dashboard left rail:** Quick actions (Tow / Police / Report / Add vehicle), Upcoming expiries (next 60 days, sorted), Recent activity (latest claims), and a Profile + Admin shortcut block.

Header on both pages uses a thin eyebrow above a large semibold display title (28px, `tracking-[-0.02em]`), not uppercase shouting. Status pills are rounded-full with a coloured leading dot (green ≥30d, amber ≤30d, destructive overdue) and tabular-nums for the days value. Hover lifts only via subtle border darkening — no translate or scale.
