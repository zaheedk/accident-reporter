---
name: Directory prerender pipeline
description: Build-time static HTML generation for /tow-trucks/* and /panel-beaters/* so crawlers see operator data
type: tech
---

`scripts/prerender.ts` runs as `postbuild` (after `vite build`). It fetches `tow_companies` and `panel_shops` from the backend, then writes `dist/<route>/index.html` for every tow region, tow city and panel-beater location — real `<h1>`, intro copy, operator list, canonical/OG tags and JSON-LD injected into the built `dist/index.html` shell. The React bundle still hydrates over it.

Rules:
- Page count is capped by `MAX_PRERENDER_PAGES` (default 400) to stay well under publish limits.
- The script never fails the build — data-fetch errors exit 0 with a warning.
- Copy shared with the React pages must live in pure modules (`src/lib/tow-cities.ts`, `src/lib/tow-intros.ts`), not inside page components, so both can import it.
- `vercel.json` has `cleanUrls: true`; static files are matched before the SPA rewrite.
