# App Store release preparation

## Dashboard action clarity (Oct 30)
- [x] Replace ring actions with prominent accident capture and a distinct emergency call; simplify secondary tools into clear icon-and-label rows.
- [x] Verified signed-in mobile layouts at 430px and 375px: clear labels, distinct symbols, no horizontal overflow or page errors; accident capture opens its seven-step flow and emergency call retains tel:111.

## Notification repairs (Oct 30)
- [x] Repair separate quiz/expiry opt-ins, browser subscription persistence and modern Web Push delivery; deployed all three reminder functions.
- [x] Add native on-device daily and expiry reminders with permissions, refresh after edits/resume and cancellation at sign-out; synchronize package locks for CI.
- [x] Pass 22 tests and verify signed-in quiz/profile permission-denied controls with no page errors; confirmed active reminder schedules and one browser subscription.
- [ ] Confirm actual scheduled browser/email delivery — blocked by timing-dependent delivery and unavailable scheduler history (query timeouts); schedules being active alone does not verify receipt.
- [ ] Rebuild/install TestFlight, enable both reminder choices and verify phone delivery — blocked by unavailable macOS/physical-device execution. Native reminders use 8am device time; expiry schedules refresh when opening SAVO after changes elsewhere.

## iOS archive failure
- [x] Replace unsupported target-conditional signing overlay with App-target project settings and preserve archive diagnostics on failure.
- [x] Validate signing helper (2 tests, 13 assertions), release helpers (4 tests), workflow YAML and all 24 shell blocks.
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

## Bottom scroll cleanup (Oct 30)
- [x] Stop signed-in pages scrolling past their content into blank space: bottom-nav clearance now reserved once (78px + safe-area) in the shared layout and the dashboard/garage wrappers; retuned the blog page that compensated for the old value.
- [x] Verified on phones (430x932, 393x786): home, vehicles, reports, documents, shops, tow trucks, profile, rights, blog and fault guide — last item clears the nav, no blank tail, no horizontal overflow, no page errors.
