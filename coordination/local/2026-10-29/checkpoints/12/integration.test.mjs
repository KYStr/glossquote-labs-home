import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { verifyFrozenInputs } from './bindings.mjs';
import { loadFactory } from './http-helpers.mjs';
import { classifyCase } from './evidence.mjs';
import { cases } from './offline-fixtures.mjs';

test('adapter and HTTP regressions select the same hash-bound integrated transport', async () => {
  const bound = await verifyFrozenInputs();
  assert.equal(bound.transportUrl.href, new URL('./transport-ab.mjs', import.meta.url).href);
  assert.equal(bound.sourceIdentityUrl.href, new URL('./source-identity.mjs', import.meta.url).href);
  const bytes = await readFile(bound.transportUrl);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'e2b1d95080e96d2f8ee7615b307e4647c490f1c456ae7da8a6e9a93b2faa5d2e');
  const module = await import(bound.transportUrl), regression = await loadFactory();
  assert.equal(regression.create, module.createTransportDiagnosticServer);
  const adapter = await readFile(new URL('./adapter.mjs', import.meta.url), 'utf8');
  assert(adapter.includes('await import(bindings.transportUrl)'));
  assert(adapter.includes('await import(bindings.sourceIdentityUrl)'));
  assert(!adapter.includes("new URL('transport-ab.mjs', bindings.prep)"));
  assert(bound.sourceFingerprints.some(row => row.path.endsWith('/owner-12-integrated/transport-ab.mjs') && row.sha256 === regression.sha256));
  console.log('NC25_BINDING ' + JSON.stringify({ transport: fileURLToPath(bound.transportUrl), sha256: regression.sha256, adapterExecution: 'NOT_RUN', nodeFactoryAndAdapterUseSameUrl: true }));
});

test('non-JSON numeric states are rejected without mutating receipts', () => {
  let checked = 0;
  for (const baseline of cases().slice(0, 2)) {
    for (const [scope, fields, reason] of [
      ['server', ['sourceWriteCalls', 'transportWriteCalls'], 'SERVER_WRITE_COUNTER_SCHEMA'],
      ['control', ['networkReadyOrder', 'navigationSendOrder', 'runtimeSendOrder'], 'CONTROL_ORDER_SCHEMA'],
      ['control', ['navigationSentAtMs'], 'CONTROL_TIME_SCHEMA'],
    ]) for (const field of fields) for (const value of [NaN, Infinity, -Infinity, undefined]) {
      const row = structuredClone(baseline); row[scope][field] = value;
      const before = structuredClone(row), result = classifyCase(row);
      assert.notEqual(result.status, 'PASS'); assert.equal(result.evidenceStatus, 'INVALID_EVIDENCE');
      assert(result.reasons.includes(reason), field + ': ' + result.reasons.join(','));
      assert.equal(result.fullNetworkAccepted, false); assert.equal(result.fullT02Accepted, false);
      assert.deepEqual(row, before); checked++;
    }
  }
  assert.equal(checked, 48); console.log('NC25_NON_JSON ' + JSON.stringify({ checked, rejected: checked }));
});

test('finite fractional navigation timestamps remain valid numbers', () => {
  for (const row of cases()) {
    row.control.navigationSentAtMs = 20.25;
    assert.equal(classifyCase(row).status, 'PASS');
  }
});
