# Screenshot handover

## Native output from GitHub
Enable `capture_screenshots` when running **iOS Build**. The separate macOS job generates the native app, builds for the simulator, boots an available recent iPhone and a 13-inch iPad, installs/launches SAVO, then captures the initial sign-in screen using `simctl`. A capture failure fails that job rather than silently omitting screenshots. It does not sign in, invent customer records or produce screenshots of admin data.

Inspect each PNG before uploading: it must show the actual SAVO interface, not a loader, permission sheet, simulator error or blank screen. Check the current accepted dimensions against Apple's screenshot table. The script prefers an iPhone 17 Pro Max / 16 Pro Max and an iPad Pro 13-inch, but simulator availability depends on the macOS runner. A device name or pixel count alone is not approval from Apple.

The generated Capacitor app supports iPad by default; don't omit the required iPad screenshot unless you intentionally change and verify device-family support in the native project.

## Additional product screenshots
In TestFlight or a simulator, use a dedicated non-admin test account and harmless test records to capture:
1. Your garage with a test vehicle and expiry dates.
2. An incident report showing the actual form.
3. A saved report reopened, with no real personal information.
4. Insurance rights guidance and its disclaimer.
5. A fault-guide result with its disclaimer.

Native feature screens are stronger listing images than the sign-in screen alone. Do not resize or stretch web captures and represent them as native output. Optional `web-preview-drafts/` captures in the downloadable package are browser references only; replace them with native screenshots before submission.

No iOS-widget screenshots: the widget is not integrated into this build.

Official dimensions and device-family requirements:
https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/