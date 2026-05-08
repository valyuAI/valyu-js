"""
SDK API parity tests - verify the JS SDK strips internal server fields
before returning responses to callers.
"""

import json
import os
import subprocess
import sys
import tempfile

SDK_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Fields that exist in the raw API response but must NOT be returned to SDK callers.
INTERNAL_BATCH_FIELDS = ["organisation_id", "api_key_id", "credit_id"]

_NODE_HARNESS = r"""
'use strict';
const Module = require('module');
const _orig = Module.prototype.require;

// Intercept axios before the SDK loads it
Module.prototype.require = function(id) {
  if (id === 'axios') {
    const mockBatchWithInternals = {
      batch_id: 'batch-test-123',
      organisation_id: 'INTERNAL-ORG-456',
      api_key_id: 'INTERNAL-API-KEY-789',
      credit_id: 'INTERNAL-CREDIT-012',
      status: 'open',
      mode: 'fast',
      created_at: '2025-01-01T00:00:00.000Z',
      counts: { total: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 },
      cost: 0.0,
    };
    return {
      create: () => ({
        get: async () => ({ status: 200, data: mockBatchWithInternals }),
        post: async () => ({ status: 200, data: mockBatchWithInternals }),
      }),
    };
  }
  return _orig.apply(this, arguments);
};

const { Valyu } = require(process.env.SDK_DIST || '/workspace/repo/dist/index.js');
const client = new Valyu('test-api-key-000');

client.batch.status('batch-test-123').then(result => {
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exit(0);
}).catch(err => {
  process.stderr.write(err.message + '\n');
  process.exit(1);
});
"""


def _build_sdk():
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=SDK_DIR,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"SDK build failed:\n{result.stderr}"


def test_js_sdk_data_leak():
    """
    JS SDK must not expose internal server fields in batch responses.

    The Valyu API returns organisation_id, api_key_id, and credit_id as part
    of batch objects. These are internal server-side identifiers and must be
    stripped by the SDK before returning data to callers.
    """
    _build_sdk()

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".js", delete=False, dir="/tmp"
    ) as f:
        f.write(_NODE_HARNESS)
        harness = f.name

    try:
        result = subprocess.run(
            ["node", harness],
            capture_output=True,
            text=True,
            timeout=30,
        )
        assert result.returncode == 0, (
            f"Test harness exited with code {result.returncode}.\n"
            f"stderr: {result.stderr}\nstdout: {result.stdout}"
        )

        response = json.loads(result.stdout.strip())

        assert response.get("success") is True, (
            f"SDK returned success=False: {response}"
        )
        assert "batch" in response, f"Response missing 'batch' key: {response}"

        batch = response["batch"]
        for field in INTERNAL_BATCH_FIELDS:
            assert field not in batch, (
                f"Internal field '{field}' leaked to SDK caller "
                f"(value={batch.get(field)!r}). "
                f"The SDK must strip internal server fields before returning responses."
            )
    finally:
        os.unlink(harness)
