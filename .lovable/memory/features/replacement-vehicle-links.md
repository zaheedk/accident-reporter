---
name: Free 2 Drive replacement-vehicle linking
description: How SAVO describes and links to Free 2 Drive replacement vehicles across directory and blog pages
type: feature
---

Replacement vehicles from Free 2 Drive must always be described as **arranged separately from the repair**, matched like-for-like, available from the day of the accident, with the cost recovered from the at-fault insurer (no excess, not the customer's claim). Never describe them as a panelbeater/insurer "courtesy car" — that is a distinct, limited, goodwill product.

`src/components/ReplacementVehicleNote.tsx` renders the contextual in-body block used on tow and panel-beater directory pages. Anchor text and lead sentence are seeded by the page slug so the same phrase is never repeated site-wide. Outbound F2D links are editorial: `rel="noopener"` only, never nofollow/sponsored. Targets used: `/not-at-fault-car-hire`, `/car-towed-after-accident`, `/panelbeater-courtesy-car`.
