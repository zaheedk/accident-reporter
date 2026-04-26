# SAVO home-screen widget — setup guide

The widget shows: **latest claim status**, **next vehicle expiry** (Rego / WOF /
Insurance), and three one-tap actions: **Quick Capture**, **Call insurer**,
**Call 111**. It also handles the deep link `savo://quick-capture` to jump
straight into the in-app capture flow.

## How it works

1. User opens the app → **Profile / Settings → Set up home-screen widget**
   (route `/widget-setup`) and taps **Connect this device**.
2. The app issues a long-lived `widget_token` (stored in `widget_tokens` table,
   180-day expiry, revocable) and writes it + the Supabase URL into the
   device's secure local storage:
   - **Android**: SharedPreferences `savo_widget_prefs` via the JS bridge
     `window.SavoWidgetBridge` (registered in `MainActivity.onStart`).
   - **iOS**: App Group UserDefaults `group.nz.co.savo.app` via a small
     Capacitor plugin you'll add after running `npx cap add ios` (see step 4).
3. The native widget calls the `widget-data` edge function every ~30 minutes
   using the token and renders the cached payload.

## Android — already wired up

After pulling these changes, build the APK as usual:

```bash
git pull
npm install
npx cap sync android
cd android && ./gradlew assembleDebug
```

Install, sign in, open `/widget-setup`, tap **Connect this device**, then
long-press the home screen → **Widgets** → search **SAVO** and drag the
widget onto a screen.

Files added:
- `android/app/src/main/java/nz/co/savo/app/SavoWidget.kt` — Glance UI + backend refresh
- `android/app/src/main/java/nz/co/savo/app/WidgetBridge.kt` — JS→native bridge
- `android/app/src/main/res/xml/savo_widget_info.xml` — widget metadata
- `android/app/src/main/res/layout/widget_loading.xml` — placeholder layout
- `AndroidManifest.xml` — widget receiver + `savo://` intent filter
- `app/build.gradle` + root `build.gradle` — Glance + Kotlin + Compose deps

## iOS — manual steps required

The iOS widget cannot be added programmatically (Xcode requires a Widget
Extension target).

1. From the repo root:
   ```bash
   npx cap add ios
   ```
2. Open `ios/App/App.xcworkspace` in Xcode.
3. **File → New → Target → Widget Extension**
   - Name: `SavoWidget`
   - Bundle ID: `nz.co.savo.app.SavoWidget`
   - Uncheck "Include Configuration Intent"
4. Replace the generated `SavoWidget.swift` with the contents of
   `ios-widget-scaffold/SavoWidget.swift` from this repo.
5. **Add an App Group** to BOTH the main `App` target and the new
   `SavoWidget` target:
   Project → Signing & Capabilities → + Capability → **App Groups** →
   `group.nz.co.savo.app`.
6. **Add the URL scheme** to the main app target:
   Info → URL Types → + → Identifier `nz.co.savo.app`, URL Scheme `savo`.
7. Build & run on a real device (widgets don't always work on the
   simulator). Long-press home screen → **+** → search **SAVO** → add.

After that, the existing `/widget-setup` flow will populate the App Group
defaults and the widget will refresh on its own.

## Revoking widgets

A user can revoke any widget token from `/widget-setup` (delete from
`widget_tokens`) — once revoked, the next refresh returns `401` and the
widget stops updating. The cached payload still shows but Quick Capture
deep-links continue to work (they go through normal app auth).

## Security notes

- `widget_token` is a 256-bit random hex, stored in `widget_tokens` with
  RLS that lets users only see/delete their own.
- The `widget-data` edge function uses the service-role key internally
  but never exposes any data not belonging to the token's owner.
- Tokens expire after 180 days and are rotated when the user re-runs the
  setup flow.
