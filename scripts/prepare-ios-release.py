"""Prepare the CI-generated Capacitor project without requiring macOS to test."""
import argparse
import json
import plistlib
import re
from pathlib import Path


def release_versions(version, run_number, attempt):
    if not re.fullmatch(r"\d+\.\d+(?:\.\d+)?", version):
        raise ValueError("Marketing version must be numeric, for example 1.0 or 1.3.3")
    if not run_number.isdigit() or not attempt.isdigit() or int(attempt) < 1:
        raise ValueError("Run number and attempt must be positive numeric values")
    # Apple CFBundleVersion supports up to three integer components. The run
    # number is split to respect its 4/2/2-digit component limits; each rerun
    # gets a later number rather than re-uploading the same build.
    sequence = int(run_number) * 100 + int(attempt)
    if int(attempt) > 99 or sequence >= 100_000_000:
        raise ValueError("Build sequence exceeds Apple's component limits")
    return version, f"{sequence // 10000}.{(sequence // 100) % 100}.{sequence % 100}"


def validate_listing(listing):
    limits = {"name": 30, "subtitle": 30, "description": 4000, "promotional_text": 170}
    for field, limit in limits.items():
        if not isinstance(listing.get(field), str) or not 0 < len(listing[field]) <= limit:
            raise ValueError(f"{field} must contain 1–{limit} characters")
    if len(listing["keywords"].encode("utf-8")) > 100:
        raise ValueError("Keywords exceed 100 UTF-8 bytes")


def prepare(root, version, run_number, attempt):
    version, build = release_versions(version, run_number, attempt)
    listing = json.loads((root / "release/app-store/listing.json").read_text())
    validate_listing(listing)
    plist_path = root / "ios/App/App/Info.plist"
    with plist_path.open("rb") as file:
        info = plistlib.load(file)
    info.update({"CFBundleDisplayName": "SAVO", "CFBundleShortVersionString": version, "CFBundleVersion": build})
    schemes = info.setdefault("CFBundleURLTypes", [])
    if not any("savo" in entry.get("CFBundleURLSchemes", []) for entry in schemes):
        schemes.append({"CFBundleURLName": "SAVO deep links", "CFBundleURLSchemes": ["savo"]})
    with plist_path.open("wb") as file:
        plistlib.dump(info, file)
    project = root / "ios/App/App.xcodeproj/project.pbxproj"
    text = project.read_text()
    text = re.sub(r"MARKETING_VERSION = [^;]+;", f"MARKETING_VERSION = {version};", text)
    text = re.sub(r"CURRENT_PROJECT_VERSION = [^;]+;", f"CURRENT_PROJECT_VERSION = {build};", text)
    project.write_text(text)
    print(f"Prepared SAVO {version} ({build})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", default="1.0")
    parser.add_argument("--run-number", default="1")
    parser.add_argument("--attempt", default="1")
    args = parser.parse_args()
    prepare(Path.cwd(), args.version, args.run_number, args.attempt)