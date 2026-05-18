"""Verify the JS SDK does not leak internal routing metadata to end users."""
import json
import subprocess
import textwrap

import pytest

INTERNAL_BATCH_FIELDS = ["organisation_id", "api_key_id", "credit_id"]

_HARNESS = textwrap.dedent(r"""
const Module = require('module');
const orig = Module.prototype.require;

const FAKE_BATCH = {
  batch_id: 'batch_test123',
  organisation_id: 'org_INTERNAL_SECRET',
  api_key_id: 'key_INTERNAL_SECRET',
  credit_id: 'credit_INTERNAL_SECRET',
  status: 'open',
  mode: 'fast',
  name: 'test',
  created_at: '2024-01-01T00:00:00Z',
  counts: { total: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 },
  cost: 0.0,
};

const fakeInstance = {
  get: async () => ({ status: 200, headers: {}, data: FAKE_BATCH }),
  post: async () => ({ status: 200, headers: {}, data: FAKE_BATCH }),
  delete: async () => ({ status: 200, headers: {}, data: {} }),
};

const fakeAxios = Object.assign(
  function() { return fakeInstance; },
  { create: () => fakeInstance, defaults: { headers: { common: {} } } }
);

Module.prototype.require = function(id) {
  if (id === 'axios') return fakeAxios;
  return orig.apply(this, arguments);
};

const { Valyu } = require('./dist/index.js');
const client = new Valyu('test_api_key');

async function main() {
  const status = await client.batch.status('batch_test123');
  const create = await client.batch.create({ name: 'test' });
  const list = await client.batch.list();
  process.stdout.write(JSON.stringify({ status, create, list }) + '\n');
}

main().catch(e => { process.stderr.write(e.stack + '\n'); process.exit(1); });
""").strip()


def _run_harness() -> dict:
    result = subprocess.run(
        ["node", "-e", _HARNESS],
        capture_output=True,
        text=True,
        cwd="/workspace/repo",
        timeout=30,
    )
    if result.returncode != 0:
        pytest.fail(f"Node harness failed:\nstdout: {result.stdout}\nstderr: {result.stderr}")
    return json.loads(result.stdout.strip())


def _assert_no_internal_fields(obj: dict, path: str) -> None:
    for field in INTERNAL_BATCH_FIELDS:
        assert field not in obj, (
            f"Internal field '{field}' leaked in {path}. Keys present: {list(obj.keys())}"
        )


def test_js_response_no_internal_leak():
    """Batch responses must not expose internal routing metadata."""
    data = _run_harness()

    # batch.status() - internal fields must be absent from the batch object
    assert data["status"]["success"] is True
    _assert_no_internal_fields(data["status"]["batch"], "batch.status() -> batch")

    # batch.create() - internal fields must not appear at the top level
    assert data["create"]["success"] is True
    _assert_no_internal_fields(data["create"], "batch.create() -> response")

    # batch.list() - internal fields must be absent from each batch
    assert data["list"]["success"] is True
    batches = data["list"].get("batches")
    if isinstance(batches, list):
        for i, b in enumerate(batches):
            _assert_no_internal_fields(b, f"batch.list() -> batches[{i}]")
    elif isinstance(batches, dict):
        _assert_no_internal_fields(batches, "batch.list() -> batches")
