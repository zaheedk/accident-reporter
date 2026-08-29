---
name: Visual Identity — Signal
description: Periwinkle canvas, violet primary, orange accent, white rounded-3xl cards, bold display headings
type: design
---

The app and website use the "Signal" direction (adopted Aug 2026, from a user-supplied mockup):

- **Canvas:** soft periwinkle `224 78% 96%` (light) / deep indigo-black `250 30% 8%` (dark).
- **Primary:** vivid violet `252 82% 62%` (light) / `252 88% 70%` (dark). Replaces the old navy/blue primary.
- **Accent:** warm orange `20 90% 57%` — used sparingly for dots, badges, single highlights.
- **Cards:** pure white, `rounded-3xl`, hairline `border-border/70`, very soft shadows. No glass, no glow.
- **Radius token:** `--radius: 1.125rem`.
- **Typography:** Plus Jakarta Sans; hero/display headings are extrabold, `tracking-[-0.03em]`, tight leading. Eyebrows are uppercase, bold, `tracking-[0.16em]`, in primary violet.
- **Signal motifs** (in `src/index.css`): `.signal-arc` (violet quarter-circle bleed used behind the Dashboard greeting), `.signal-pill`, `.signal-dot`.
- The `.theme-garage` and `.theme-dashboard` scopes share the same palette as the root tokens.

Partner brand colours (`brand_color`, defaults `#1e3a5f`) and the claim PDF template stay navy — they are white-label / print concerns, not app chrome.
