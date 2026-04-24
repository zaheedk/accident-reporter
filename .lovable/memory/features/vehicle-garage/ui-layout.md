---
name: Vehicle Garage UI Layout
description: Apple/Linear style — sidebar + list, near-white surfaces, hairline borders, no glass/glow, dot-prefixed status pills
type: design
---

The Garage page uses an Apple/Linear inspired aesthetic. Scoped via `.theme-garage` in `src/index.css` with a near-white background (#F8F8FA light / #111113 dark), white/near-black solid card surfaces, and hairline `border` tokens. **No glassmorphism, no ambient glow, no progress rings.** Layout is a 260px left rail (Active/Inactive filter tiles + Alerts panel) and a main column (search + list). Header uses a personal eyebrow ("Tony") above a large semibold "Garage" display title (28px, `tracking-[-0.02em]`), not uppercase shouting.

Each vehicle row is a single rounded-xl card with a 56px squircle thumbnail, rego + year/make/model on one line, and rounded-full status pills with a coloured leading dot (green/amber/destructive) for WOF / Rego / Insurance days-left. Footer has a quiet 4-action bar (Edit, Docs, Lodge, Call) with hairline dividers. Hover lifts only via subtle layered shadow — no translate or scale.
