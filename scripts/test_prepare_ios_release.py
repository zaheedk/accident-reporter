import importlib.util
import json
import plistlib
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("release_helper", Path(__file__).with_name("prepare-ios-release.py"))
helper = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(helper)


class ReleaseTests(unittest.TestCase):
    def test_reruns_have_distinct_increasing_versions(self):
        self.assertEqual(helper.release_versions("1.3.3", "123", "1"), ("1.3.3", "1.23.1"))
        self.assertEqual(helper.release_versions("1.3.3", "123", "2"), ("1.3.3", "1.23.2"))

    def test_invalid_versions_are_rejected(self):
        with self.assertRaises(ValueError):
            helper.release_versions("latest", "1", "1")
        with self.assertRaises(ValueError):
            helper.release_versions("1.0", "1", "100")

    def test_listing_limits(self):
        listing = json.loads(Path("release/app-store/listing.json").read_text())
        helper.validate_listing(listing)
        with self.assertRaises(ValueError):
            helper.validate_listing({**listing, "keywords": "x" * 101})

    def test_stamps_project_and_preserves_google_scheme(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            app = root / "ios/App/App"
            app.mkdir(parents=True)
            project = root / "ios/App/App.xcodeproj"
            project.mkdir()
            (root / "release/app-store").mkdir(parents=True)
            (root / "release/app-store/listing.json").write_text(Path("release/app-store/listing.json").read_text())
            (project / "project.pbxproj").write_text("MARKETING_VERSION = 1.0; CURRENT_PROJECT_VERSION = 1;")
            with (app / "Info.plist").open("wb") as file:
                plistlib.dump({"CFBundleURLTypes": [{"CFBundleURLSchemes": ["google-test"]}]}, file)
            helper.prepare(root, "1.2", "123", "2")
            with (app / "Info.plist").open("rb") as file:
                info = plistlib.load(file)
            self.assertEqual(info["CFBundleVersion"], "1.23.2")
            self.assertEqual(info["CFBundleShortVersionString"], "1.2")
            self.assertEqual(info["CFBundleURLTypes"][0]["CFBundleURLSchemes"], ["google-test"])
            self.assertIn("savo", info["CFBundleURLTypes"][1]["CFBundleURLSchemes"])
            self.assertIn("CURRENT_PROJECT_VERSION = 1.23.2;", (project / "project.pbxproj").read_text())


if __name__ == "__main__":
    unittest.main()