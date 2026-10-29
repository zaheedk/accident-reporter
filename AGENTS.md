# Project rules
- SEO dashboard reads cached Search Console snapshots (seo_snapshots) via the admin-only seo-dashboard function, refreshed at most every 12h — avoids hitting Google on every page view.
- Keep App Store materials in release/app-store and generate the native iOS project in CI; release helpers validate and embed its resources so the existing Capacitor workflow stays reproducible.
- Configure iOS distribution signing directly on the generated App target, not global xcconfig target conditions, to avoid affecting SPM dependencies; preserve archive logs and result bundles on failure.
- CI selects an Xcode whose iOS SDK and matching iOS platform runtime are both installed (runner default first, then newest), because an SDK without its platform makes archive fail with no eligible destinations.
- Generate native store screenshots on macOS simulators separately from signing; browser drafts are references only and must not be presented as verified native captures.
- Signed-in presentation uses the shared AccountArtwork module and signed-in-experience CSS scope, so customer and role pages inherit one visual system without changing data workflows or public/print styles.
- Daily fault quiz imagery uses scenario-specific vector road diagrams with NZ left-driving geometry; never reuse generic category pictures or crop the diagram, because positions and movement determine the scenario.
- Store original NZ knowledge questions separately from fault diagrams, with topic and source metadata; daily and practice modes share the bank, while practice must not change daily streaks.
