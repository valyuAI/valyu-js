"""
Security test: verify no hardcoded API keys in source files and
that axios is not pinned to the vulnerable CVE-2026-42041 version.
"""
import json
import os
import re

import pytest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Patterns that indicate hardcoded credentials
_HARDCODED_KEY_PATTERNS = [
    # api_key / apikey assignment to a quoted string of >= 16 chars
    r'(?i)(?:api[_\-\s]?key|apikey)\s*[=:]\s*["\'][A-Za-z0-9_\-]{16,}["\']',
    # Bearer token literal
    r'(?i)bearer\s+[A-Za-z0-9_\-\.]{20,}',
    # Valyu-specific key prefix
    r'["\']val_[A-Za-z0-9]{20,}["\']',
    # secret / token / password assignment to a quoted string
    r'(?i)(?:secret|token|password|passwd|pwd)\s*[=:]\s*["\'][A-Za-z0-9_\-]{16,}["\']',
]

_SOURCE_EXTENSIONS = {".ts", ".js", ".mjs", ".cjs"}
_EXCLUDE_DIRS = {"node_modules", "dist", ".git", "__pycache__", ".github"}


def _source_files():
    for root, dirs, filenames in os.walk(REPO_ROOT):
        dirs[:] = [d for d in dirs if d not in _EXCLUDE_DIRS]
        for name in filenames:
            if os.path.splitext(name)[1] in _SOURCE_EXTENSIONS:
                yield os.path.join(root, name)


def test_no_hardcoded_api_keys():
    """Source files must not contain hardcoded API keys or secrets."""
    violations = []
    for filepath in _source_files():
        try:
            with open(filepath, encoding="utf-8", errors="ignore") as fh:
                content = fh.read()
        except OSError:
            continue
        for pattern in _HARDCODED_KEY_PATTERNS:
            if re.search(pattern, content):
                rel = os.path.relpath(filepath, REPO_ROOT)
                violations.append(f"{rel}: matched /{pattern}/")
    assert not violations, "Hardcoded credentials found:\n" + "\n".join(violations)


def test_axios_not_vulnerable():
    """axios must not be the CVE-2026-42041-vulnerable version 1.15.0."""
    pkg_path = os.path.join(REPO_ROOT, "package.json")
    with open(pkg_path) as fh:
        pkg = json.load(fh)

    spec = pkg.get("dependencies", {}).get("axios", "")
    # Strip range operators to get the bare version
    bare = spec.lstrip("^~>=< ").strip()

    assert bare != "1.15.0", (
        f"axios is pinned to {bare} which is vulnerable to CVE-2026-42041 "
        "(prototype pollution in validateStatus merge strategy). "
        "Update to >= 1.15.1."
    )

    # Parse major.minor.patch and assert >= 1.15.1
    parts = bare.split(".")
    if len(parts) == 3 and all(p.isdigit() for p in parts):
        major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
        assert (major, minor, patch) >= (1, 15, 1), (
            f"axios {bare} is below the minimum safe version 1.15.1."
        )
