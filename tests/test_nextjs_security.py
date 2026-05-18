"""Security tests for dependency versions."""
import json
import re
from pathlib import Path


REPO_ROOT = Path(__file__).parent.parent


def _parse_min_version(constraint: str) -> tuple[int, ...]:
    """Extract the minimum version from a semver constraint like ^1.15.1 or >=1.15.1."""
    match = re.search(r"(\d+)\.(\d+)\.(\d+)", constraint)
    if not match:
        raise ValueError(f"Could not parse version from: {constraint}")
    return tuple(int(x) for x in match.groups())


def test_axios_version():
    """axios must be >= 1.15.1 to avoid CVE-2026-42041 and NO_PROXY SSRF bypass."""
    pkg = json.loads((REPO_ROOT / "package.json").read_text())
    constraint = pkg["dependencies"]["axios"]
    min_ver = _parse_min_version(constraint)
    assert min_ver >= (1, 15, 1), (
        f"axios constraint '{constraint}' allows versions below 1.15.1 "
        f"which contains CVE-2026-42041 (CVSS 8.2) and NO_PROXY SSRF bypass. "
        f"Fix: set axios to '^1.15.1' or higher."
    )

    # Also verify the actually installed version meets the bar.
    installed_pkg_path = REPO_ROOT / "node_modules" / "axios" / "package.json"
    if installed_pkg_path.exists():
        installed_version = json.loads(installed_pkg_path.read_text())["version"]
        installed_tuple = tuple(int(x) for x in installed_version.split("."))
        assert installed_tuple >= (1, 15, 1), (
            f"Installed axios {installed_version} is below the required 1.15.1. "
            f"Run 'npm install' to pull the patched version."
        )
