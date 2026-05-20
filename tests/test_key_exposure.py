"""
Security tests for dependency vulnerabilities in valyu-js.
"""
import json
import os
import unittest


class TestAxiosVulnerability(unittest.TestCase):
    def _get_axios_version(self) -> str:
        """Read the locked axios version from package-lock.json."""
        lock_path = os.path.join(os.path.dirname(__file__), "..", "package-lock.json")
        with open(lock_path) as f:
            data = json.load(f)
        return data["packages"]["node_modules/axios"]["version"]

    def test_KEVIN_20260507_001_axios_version(self):
        """
        CVE-2026-42041: Axios 1.15.0 prototype pollution gadget in
        validateStatus merge strategy (CVSS 8.2, authentication bypass).
        Fixed in 1.15.1+.
        """
        axios_version = self._get_axios_version()
        parts = tuple(int(x) for x in axios_version.split("."))
        self.assertGreater(
            parts,
            (1, 15, 0),
            f"axios {axios_version} is vulnerable to CVE-2026-42041 "
            "(prototype pollution in validateStatus merge strategy, CVSS 8.2). "
            "Upgrade to 1.15.1 or later.",
        )


if __name__ == "__main__":
    unittest.main()
