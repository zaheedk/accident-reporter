# Project rules
- SEO dashboard reads cached Search Console snapshots (seo_snapshots) via the admin-only seo-dashboard function, refreshed at most every 12h — avoids hitting Google on every page view.
- Keep App Store materials in release/app-store and generate the native iOS project in CI; release helpers validate and embed its resources so the existing Capacitor workflow stays reproducible.
- Generate native store screenshots on macOS simulators separately from signing; browser drafts are references only and must not be presented as verified native captures.
