"""
Tests that axios dependency is patched against SSRF via absolute URL redirect
(GHSA-jr5f-v2jv-69x6, CVSS 7.4). Vulnerable versions: < 1.7.4.
"""

import json
import os
from packaging.version import Version

REPO_ROOT = os.path.join(os.path.dirname(__file__), "..")

MIN_SAFE_VERSION = Version("1.7.4")


def _load_package_json():
    with open(os.path.join(REPO_ROOT, "package.json")) as f:
        return json.load(f)


def _load_package_lock():
    with open(os.path.join(REPO_ROOT, "package-lock.json")) as f:
        return json.load(f)


def test_axios_package_json_constraint_is_safe():
    """package.json must not allow axios versions vulnerable to GHSA-jr5f-v2jv-69x6."""
    pkg = _load_package_json()
    raw = pkg["dependencies"]["axios"]
    # Strip semver range prefix (^, ~, >=, etc.) to get the floor version
    floor = raw.lstrip("^~>=<")
    assert Version(floor) >= MIN_SAFE_VERSION, (
        f"axios constraint '{raw}' allows versions below {MIN_SAFE_VERSION} "
        f"(GHSA-jr5f-v2jv-69x6). Update to ^1.7.4 or higher."
    )


def test_axios_installed_version_is_safe():
    """Resolved axios in package-lock.json must be >= 1.7.4."""
    lock = _load_package_lock()
    installed = lock["packages"]["node_modules/axios"]["version"]
    assert Version(installed) >= MIN_SAFE_VERSION, (
        f"Installed axios {installed} is vulnerable to GHSA-jr5f-v2jv-69x6. "
        f"Minimum safe version is {MIN_SAFE_VERSION}."
    )
