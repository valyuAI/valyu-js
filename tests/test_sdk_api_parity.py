"""
Test that internal fields are not exposed in public SDK types.
"""
import re
import os


TYPES_FILE = os.path.join(os.path.dirname(__file__), "..", "src", "types.ts")


def get_interface_fields(interface_name: str, source: str) -> list[str]:
    """Extract field names from a TypeScript interface."""
    pattern = rf"export interface {interface_name}\s*\{{([^}}]*)\}}"
    match = re.search(pattern, source, re.DOTALL)
    if not match:
        return []
    body = match.group(1)
    fields = []
    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith("//"):
            continue
        field_match = re.match(r"(\w+)\??:", line)
        if field_match:
            fields.append(field_match.group(1))
    return fields


def test_deliverable_result_no_s3_key():
    with open(TYPES_FILE) as f:
        source = f.read()

    fields = get_interface_fields("DeliverableResult", source)
    assert fields, "DeliverableResult interface not found or has no fields"
    assert "s3_key" not in fields, (
        "s3_key must not be exposed in the public DeliverableResult type - "
        "it reveals internal S3 storage paths"
    )


if __name__ == "__main__":
    test_deliverable_result_no_s3_key()
    print("PASSED: s3_key is not exposed in DeliverableResult")
