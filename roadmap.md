# App Store release preparation

## iOS archive failure
- [x] Replace unsupported target-conditional signing overlay with App-target project settings and preserve archive diagnostics on failure.
- [ ] Validate the signing helper with a generated project and run release helper regression tests.
- [ ] Confirm a signed archive in GitHub Actions — blocked by unavailable macOS/GitHub execution access.

- [x] Prepare App Store listing, review instructions, privacy worksheet and existing store icon.
- [x] Update the iOS pipeline to produce configurable signed releases, native simulator screenshots and a submission bundle.
- [x] Validate release helpers and listing limits; inspect browser screenshot drafts and the package entries. Native output awaits macOS workflow execution.
- [ ] Run the signed GitHub release and submit for Apple review — blocked by unavailable GitHub/Apple account access; native sign-in and privacy declarations also need approval before submission.
## Design rollout (Oct 26)
- [x] Apply new light/friendly style (white canvas, serif headings, soft borderless panels, wavy accents, rounded-full buttons) to all public pages: Rights, RightsTopic, FaultGuide, About, FAQ, Blog, BlogPost, HowItWorks
- [x] Verify each page in preview (mobile + desktop)

## Signed-in design rollout
- [x] Apply the light illustrated style to the shared signed-in layout and dashboard, keeping tools unchanged.
- [x] Restyle vehicle, report, document, profile and account-management pages with flowing sections and readable forms.
- [x] Verify signed-in navigation and key pages on desktop and mobile; opened the accident actions and read existing vehicle details back through the edit page.

## Daily fault quiz imagery
- [x] Replace reused generic pictures with fourteen scenario-specific NZ road diagrams; visually checked all diagrams on phones and verified answer feedback, desktop rendering and no horizontal overflow.

## Expanded NZ quiz
- [x] Add 154 sourced, original questions: 85 driving, 20 accident response, 15 privacy, 20 insurance and 14 fault scenarios.
- [x] Add topic practice alongside the daily quiz, with answer explanations, official reference links and general-information disclaimers.
- [x] Pass 19 targeted tests; verify signed-in practice completion/restart, daily completion and saved progress, desktop/mobile rendering and no runtime errors.
