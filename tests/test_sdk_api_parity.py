"""
SDK API parity tests - verify the JS SDK does not leak internal server fields.
"""
import os
import re


def _read_types() -> str:
    types_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "src", "types.ts"
    )
    with open(types_path, "r") as f:
        return f.read()


def _read_index() -> str:
    index_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "src", "index.ts"
    )
    with open(index_path, "r") as f:
        return f.read()


def test_js_batch_job_id_exposure():
    """
    Verify the JS SDK does not expose internal organisation/account IDs in batch
    responses. Leaking organisation_id, api_key_id, or credit_id enables IDOR
    attacks when those identifiers are guessable or enumerable.

    Fix requires:
    1. Removing the fields from the public DeepResearchBatch TypeScript type.
    2. Stripping them at runtime before returning batch data to callers.
    """
    types_content = _read_types()
    index_content = _read_index()

    # --- 1. Type-level check ---
    batch_match = re.search(
        r"export interface DeepResearchBatch \{([^}]+)\}",
        types_content,
        re.DOTALL,
    )
    assert batch_match, "DeepResearchBatch interface not found in src/types.ts"
    batch_interface = batch_match.group(1)

    sensitive_fields = ["organisation_id", "api_key_id", "credit_id"]
    for field in sensitive_fields:
        assert field not in batch_interface, (
            f"Internal field '{field}' is present in the public DeepResearchBatch "
            f"TypeScript interface. This leaks server-side identifiers that enable "
            f"IDOR if they are sequential or guessable."
        )

    # --- 2. Runtime-strip check ---
    # The SDK must have a normalizeBatch (or equivalent) function that strips the
    # sensitive fields before returning them to callers.
    assert "normalizeBatch" in index_content, (
        "No normalizeBatch helper found in src/index.ts. "
        "Batch responses must be sanitised at runtime, not just in TypeScript types "
        "(types are erased at compile time and do not prevent the fields from being "
        "present in actual response objects)."
    )

    # Verify the strip actually removes the sensitive fields.
    normalize_match = re.search(
        r"function normalizeBatch\([^)]*\)[^{]*\{([^}]+)\}",
        index_content,
        re.DOTALL,
    )
    assert normalize_match, "normalizeBatch function body not found in src/index.ts"
    normalize_body = normalize_match.group(1)

    for field in sensitive_fields:
        assert field in normalize_body, (
            f"normalizeBatch does not reference '{field}'. "
            f"The function must explicitly strip this field from batch responses."
        )
