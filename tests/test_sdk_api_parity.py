"""
SDK API parity tests - verify the SDK does not leak internal server fields
to callers. These tests mock axios at the Node.js module level so no real
network calls are made.
"""

import os
import subprocess

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _run_js(script: str, timeout: int = 30) -> tuple:
    result = subprocess.run(
        ["node", "-e", script],
        cwd=REPO_DIR,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return result.returncode, result.stdout, result.stderr


def test_batch_job_id_exposure():
    """
    Internal batch fields (organisation_id, api_key_id, credit_id) must not
    appear in any SDK batch response - exposing them enables job enumeration.
    """
    script = r"""
const Module = require('module');
const _req = Module.prototype.require;

// Internal fields the API may return but the SDK must strip.
const INTERNAL_KEYS = ['organisation_id', 'api_key_id', 'credit_id'];
const internalData = { batch_id: 'b-1', status: 'pending',
  organisation_id: 'org-secret', api_key_id: 'key-secret', credit_id: 'cred-secret' };

const axiosInstance = {
  post: async () => ({ status: 200, data: { ...internalData } }),
  get:  async () => ({ status: 200, data: { ...internalData } }),
};

// Intercept axios before the SDK module loads.
Module.prototype.require = function (id) {
  if (id === 'axios') return { create: () => axiosInstance };
  return _req.apply(this, arguments);
};

const { Valyu } = require('./dist/index.js');

function findLeakedFields(obj, path) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).flatMap(([k, v]) => {
    const fullPath = path ? path + '.' + k : k;
    return [
      ...(INTERNAL_KEYS.includes(k) ? [fullPath] : []),
      ...findLeakedFields(v, fullPath),
    ];
  });
}

async function run() {
  const client = new Valyu('test-key');
  const failures = [];

  const cases = [
    ['batch.create',    () => client.batch.create()],
    ['batch.status',    () => client.batch.status('b-1')],
    ['batch.addTasks',  () => client.batch.addTasks('b-1', { tasks: [{ query: 'q' }] })],
    ['batch.listTasks', () => client.batch.listTasks('b-1')],
    ['batch.cancel',    () => client.batch.cancel('b-1')],
    ['batch.list',      () => client.batch.list()],
  ];

  for (const [name, fn] of cases) {
    try {
      const result = await fn();
      const leaked = findLeakedFields(result, '');
      if (leaked.length) {
        failures.push(name + ' leaks: ' + leaked.join(', '));
      }
    } catch (e) {
      failures.push(name + ' threw: ' + e.message);
    }
  }

  if (failures.length) {
    console.error('FAIL\n' + failures.join('\n'));
    process.exit(1);
  }
  console.log('PASS');
}

run();
"""
    code, stdout, stderr = _run_js(script)
    assert code == 0, (
        f"Batch job ID exposure test failed.\nstdout: {stdout}\nstderr: {stderr}"
    )
    assert "PASS" in stdout
