#!/bin/bash
# Real simulator output only. No injected sessions, fixture records or fake UI.
set -euo pipefail
OUTPUT="${1:-ios/App/build/store-screenshots}"
mkdir -p "$OUTPUT"
DERIVED="$RUNNER_TEMP/savo-simulator"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$DERIVED" CODE_SIGNING_ALLOWED=NO build
APP="$DERIVED/Build/Products/Release-iphonesimulator/App.app"
test -d "$APP"
BUNDLE=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Info.plist")
xcrun simctl list devices available --json > "$RUNNER_TEMP/savo-devices.json"
python3 - "$RUNNER_TEMP/savo-devices.json" > "$RUNNER_TEMP/savo-capture-devices.tsv" <<'PY'
import json, sys
devices = [d for rows in json.load(open(sys.argv[1]))['devices'].values() for d in rows if d.get('isAvailable')]
groups = [('iphone', ['iPhone 17 Pro Max', 'iPhone 16 Pro Max', 'iPhone 16 Plus']),
          ('ipad', ['iPad Pro 13-inch', 'iPad Air 13-inch'])]
for family, preferences in groups:
    selected = next((d for preference in preferences for d in reversed(devices) if preference in d['name']), None)
    if selected is None:
        raise SystemExit(f'No required {family} simulator found; install the iOS simulator runtime')
    print(f"{family}\t{selected['udid']}\t{selected['name']}")
PY
while IFS=$'\t' read -r FAMILY UDID NAME; do
  xcrun simctl boot "$UDID" || true
  xcrun simctl bootstatus "$UDID" -b
  xcrun simctl status_bar "$UDID" override --time '9:41' --batteryState charged --batteryLevel 100
  xcrun simctl install "$UDID" "$APP"
  xcrun simctl launch "$UDID" "$BUNDLE"
  # Allow the bundled WebView and initial network/session request to settle.
  for i in $(seq 1 15); do sleep 1; done
  xcrun simctl io "$UDID" screenshot "$OUTPUT/$FAMILY-sign-in.png"
  printf '%s: %s — inspect image before uploading\n' "$FAMILY" "$NAME" >> "$OUTPUT/CAPTURE-INFO.txt"
  xcrun simctl shutdown "$UDID"
done < "$RUNNER_TEMP/savo-capture-devices.tsv"
cp release/app-store/SCREENSHOTS.md "$OUTPUT/SCREENSHOTS.md"