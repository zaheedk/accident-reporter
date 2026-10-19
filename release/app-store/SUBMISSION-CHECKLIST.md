# SAVO App Store handover

## What this package contains
Listing text and keywords, review instructions, a privacy worksheet, an opaque 1024×1024 store icon, screenshot instructions and a release checklist. Browser screenshot drafts, if present, are clearly labelled and are **not verified native screenshots**. The GitHub pipeline generates the signed IPA and native simulator screenshots separately on macOS.

## Build using the existing GitHub pipeline
1. Let these changes sync to your existing GitHub repository. Open **Actions → iOS Build → Run workflow** on the synced branch.
2. Keep `build_mode` set to `signed`. Set `marketing_version` to the version you intend to submit (default `1.0`; change it if Apple already has a released version).
3. Leave `upload_to_testflight` on to upload automatically, or turn it off to export an IPA for manual upload with Apple's Transporter. Choose `capture_screenshots` to build native simulator screenshots too.
4. Download `app-release-ipa`, `app-store-submission-materials` and `app-store-native-screenshots` from the successful run. Unsigned archives are not uploadable.
5. Wait for Apple processing, then select the processed build in App Store Connect. A TestFlight upload is not an App Store review submission or public release.

### Existing GitHub signing secrets
`IOS_P12_BASE64`, `IOS_P12_PASSWORD`, `IOS_MOBILEPROVISION_BASE64`, `IOS_TEAM_ID`; optional `IOS_BUNDLE_ID` (must match the profile and App Store app).

For automatic upload: `APPSTORE_KEY_ID`, `APPSTORE_ISSUER_ID`, `APPSTORE_PRIVATE_KEY`, or the workflow's existing `APP_STORE_CONNECT_API_*` alternatives. Keep private keys and certificates in GitHub Secrets, never in this package or chat.

This environment is Linux and has no connected GitHub Actions or Apple account control. No signed IPA has been compiled here, no workflow has been triggered here, and no submission has been sent to Apple.

## App Store Connect fields
- Create/select the iOS app with bundle ID `nz.co.savo.app`; confirm your actual Apple app record matches.
- Copy the approved listing fields from `listing.json`; select English (New Zealand) or the supported English locale in your account.
- Categories suggested: Utilities / Reference. Confirm availability and intended territories (New Zealand suggested).
- Set price yourself, replace the copyright placeholder with the legal rights holder, and provide the real reviewer contact details.
- Add a dedicated non-admin review account privately in App Store Connect. It must work while Apple reviews the build.
- Review all age-rating questions, including vehicle injuries, accident imagery, user uploads and community features. The policy's under-16 wording is not an Apple age rating.
- Confirm content rights and export compliance. The pipeline deliberately does not invent export-compliance answers or set `ITSAppUsesNonExemptEncryption` for you. Assess Apple's exemption criteria for the shipped app and SDKs.
- Review and save App Privacy answers using the worksheet; reconcile the production policy first.
- Upload verified native screenshots for each required supported device family. See `SCREENSHOTS.md`.
- Select the processed signed build; choose manual release so you can decide when to go live after approval.

## Release gates — unresolved
- Google login on iOS without an equivalent compliant alternative: resolve Apple guideline 4.8 or confirm an applicable exception. Do not submit as ready without this.
- Test the signed build on a real iPhone: email/password, Google, incident save/read-back, camera/gallery, denied location, account deletion, and offline/online recovery. Use test data; account deletion is destructive.
- Complete privacy/SDK/retention and export-compliance reviews.
- Verify all URLs are public and support email is monitored. Read the unreviewed legal articles; the named courtesy-car author is not a legal reviewer.
- iOS widget is not included. Do not promise it in the listing.
- GitHub/macOS build, certificate/profile validity and successful Apple processing remain unverified until the workflow runs.

Native development guide: https://lovable.dev/blog/building-mobile-apps-with-capacitor
For local native work, pull the synced repository first, install dependencies, build the web app, then run `npx cap sync ios`; the GitHub pipeline performs those build/sync steps on its macOS runner.