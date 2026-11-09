// Worker-entry tests: handleWorkerMessage is the exact code path the
// browser Worker runs (the build embeds it with the core). Malformed
// messages and core failures must never leak a stack or crash the worker.

import assert from 'node:assert/strict';
import test from 'node:test';
import { handleWorkerMessage } from '../public/js/worker-source.mjs';
import { runAudit } from '../public/js/core/range.mjs';

test('worker returns the core result for a valid snapshot', () => {
  const input = { start: '0', end: '10', intervals: '0\t4\n3\t6\n8\t10' };
  assert.deepEqual(handleWorkerMessage({ generation: 7, input }), {
    generation: 7,
    ok: true,
    result: runAudit(input).result,
  });
});

test('worker returns the core error for an invalid snapshot', () => {
  assert.deepEqual(handleWorkerMessage({ generation: 3, input: { start: '0', end: '1', intervals: '0\t1.001' } }), {
    generation: 3,
    ok: false,
    error: { code: 'OUTSIDE', field: 'intervals', row: 1 },
  });
});

test('worker maps malformed messages to WORKER_ERROR', () => {
  for (const bad of [null, undefined, 'x', 42, {}, { input: {} }, { generation: '1', input: {} }]) {
    const out = handleWorkerMessage(bad);
    assert.equal(out.ok, false, JSON.stringify(bad));
    assert.equal(out.error.code, 'WORKER_ERROR');
  }
});

test('worker maps a schema-shaped input failure to its core error, not a crash', () => {
  const out = handleWorkerMessage({ generation: 1, input: { start: '0' } });
  assert.deepEqual(out, {
    generation: 1,
    ok: false,
    error: { code: 'SCHEMA', field: null, row: null },
  });
});
