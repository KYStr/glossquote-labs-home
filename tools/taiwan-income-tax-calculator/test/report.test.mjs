// Report serialization tests. The expected byte string below is written out
// literally from the SPEC's serialization rules (compact JSON, keys sorted
// ascending by UTF-16 code units, one trailing LF, UTF-8 no BOM) applied to
// the first core fixture's result — not produced by the implementation.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { run, serializeReport } from '../public/js/core/core.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(await readFile(path.join(here, 'fixtures.json'), 'utf8'));
const first = fixtures.cases.find((entry) => entry.id === 'single-salary-five-percent');

const EXPECTED_TEXT = '{"exemptionTotal":97000,"grossSalary":720000,"progressiveDifference":0,"ratePercent":5,"salaryNet":502000,"salarySpecialDeduction":218000,"standardDeduction":131000,"taxPayable":13700,"taxYear":"113","taxableNet":274000}\n';

test('report bytes match the literal expectation and its SHA-256', () => {
  const outcome = run(first.input);
  assert.equal(outcome.ok, true);
  const report = serializeReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
  const expectedBytes = new TextEncoder().encode(EXPECTED_TEXT);
  assert.deepStrictEqual(report.bytes, expectedBytes);
  assert.equal(
    createHash('sha256').update(report.bytes).digest('hex'),
    createHash('sha256').update(expectedBytes).digest('hex'),
  );
  // No BOM, exactly one trailing LF.
  assert.notEqual(report.bytes[0], 0xef);
  assert.equal(report.bytes[report.bytes.length - 1], 0x0a);
  assert.notEqual(report.bytes[report.bytes.length - 2], 0x0a);
});

test('key sorting is recursive and array order is preserved', () => {
  const report = serializeReport({ b: [{ d: 1, c: 2 }, { a: 3 }], a: 'x' });
  assert.equal(report.ok, true);
  assert.equal(report.text, '{"a":"x","b":[{"c":2,"d":1},{"a":3}]}\n');
});

test('reports over 2 MiB are OUTPUT_LIMIT', () => {
  const big = { payload: 'x'.repeat(2_100_000) };
  const report = serializeReport(big);
  assert.deepStrictEqual(report, { ok: false, error: { code: 'OUTPUT_LIMIT', field: null, row: null } });
});

test('serialization does not call toJSON', () => {
  const sneaky = { a: 1 };
  Object.defineProperty(sneaky, 'toJSON', {
    enumerable: false,
    value() { throw new Error('toJSON must not be called'); },
  });
  const report = serializeReport(sneaky);
  assert.equal(report.ok, true);
  assert.equal(report.text, '{"a":1}\n');
});
