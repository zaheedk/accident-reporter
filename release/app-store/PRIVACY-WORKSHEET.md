# Apple App Privacy — review worksheet, not filed answers

Apple requires accurate answers for the app **and its service providers**. The table below is a code-based starting point, not a declaration that all services have been audited. Confirm the production configuration, retention, analytics and SDK behaviour before saving these answers in App Store Connect.

| Apple data category to assess | Evidence / purpose | Linked to identity? |
| --- | --- | --- |
| Contact info: name, email, phone, physical address | Account, profile, incident participants, witnesses; app functionality | Yes for signed-in records; assess third-party participants too |
| Identifiers: user ID | Authentication and ownership of records | Yes |
| Location: precise / coarse | Incident coordinates and addresses; nearby repairers/tow operators | Yes when stored in a user's report; confirm finder-only requests |
| User content: photos or videos | Incident photos, avatar, dashcam uploads | Yes |
| User content: audio data | Optional call recording/voice features, transcription | Assess retention and provider processing; linked when associated with a claim |
| User content: other user content | Claim narratives, vehicle/insurance details, documents and messages | Yes |
| Sensitive info / other data | Driver-licence details and incident injury information | Assess Apple's category definitions; do not assume uploads are excluded |
| Usage data: product interaction | Referral clicks and any actual analytics configuration | Assess logged-in attribution and analytics identifiers |
| Diagnostics / device identifiers | Infrastructure logs, IP/device data; push subscriptions | Confirm actual collection, retention and provider usage |

Primary purpose is app functionality. Only select analytics, advertising or other purposes when confirmed. Do not select “Data Not Collected”. The privacy page says no third-party advertising/tracking cookies; that alone does **not** establish Apple's tracking answer. Confirm cross-app tracking and third-party SDK practices before answering.

## Reconciliation needed
The current policy does not explicitly cover every optional feature (licence records, audio/transcription, AI photo processing, push/widget tokens and offline caches). Review those disclosures, processors, retention, deletion behaviour and any international transfers before submission. Verify that support@savo.co.nz is monitored and the privacy-policy URL is public on the production domain.

## Native manifest
The pipeline embeds `resources/ios/PrivacyInfo.xcprivacy` in the App resources. It declares no tracking domains and a UserDefaults required-reason API entry (`CA92.1`, app-only preferences). This is a technical baseline, not the complete App Store privacy label. Audit bundled SDK privacy manifests and the Xcode privacy report against actual required-reason API usage; update declarations if the audit establishes more uses. Do not claim no tracking until that audit is complete.

Official references:
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/documentation/bundleresources/privacy_manifest_files
- https://developer.apple.com/support/third-party-SDK-requirements/