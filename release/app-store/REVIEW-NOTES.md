# SAVO — App Review notes (draft)

Copy the approved text below into App Store Connect. This is not a completed review submission.

## Purpose
SAVO is a New Zealand consumer-information and accident-recording app. It is not an insurer or a law firm. Fault guidance is general information, not a determination of liability. Free 2 Drive is a related replacement-vehicle service; referrals concern a physical service, not a purchase of digital app functionality.

## Access
- Use a dedicated, non-admin review account with email/password sign-in. Do not give reviewers your personal administrator account.
- Enter the review account email and password directly in App Store Connect's private App Review fields. No credentials are included in this package.
- Keep this account active during review, with harmless test vehicle/report data and no real customer records. Ensure it does not require an inaccessible SMS code.
- A review account has not been created or verified as part of this preparation.

## Suggested review steps
1. Launch SAVO and sign in using the supplied review account.
2. Open Garage/Vehicles, view a test vehicle or add one, and enter expiry details.
3. Create an incident report, enter the incident details and attach a test photo. Save it, reopen it and confirm the data persists.
4. Read the rights and fault guidance, including the general-information/not-legal-advice disclaimers.
5. Open Profile and use Delete account, confirming with `DELETE`. This is destructive; use a disposable review account and restore access if necessary while review is pending.

Location and photo permissions are used for incident capture and nearby services. Check that denied permissions allow manual entry. Camera, microphone, sharing, offline sync and sign-in must be tested in the signed native build; browser tests cannot establish these work on an iPhone.

## Before pasting
- Replace the reviewer contact fields in App Store Connect with your real contact name, telephone and email.
- Confirm the final screen labels in TestFlight and adjust the steps if necessary.
- iOS currently offers Google sign-in without Sign in with Apple. Resolve guideline 4.8 by implementing and configuring an equivalent compliant login option, or establish a valid exception with Apple. Email/password alone does not establish an exception.
- Do not advertise an iOS home-screen widget: the repository contains only a scaffold, and the current pipeline does not integrate an iOS widget extension.
- Avoid promising direct claim submission to every insurer or guaranteed free replacement cars.