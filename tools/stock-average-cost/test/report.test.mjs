// Report tests: fixed filename, deterministic sorted-key serialization,
// byte cap. The serializer below is an independent re-implementation used
// only to cross-check the core's serializeReport byte for byte.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  MAX_REPORT_BYTES,
  REPORT_FILENAME,
  serializeReport,
} from '../public/js/core/calculate.mjs';

function sortedClone(value) {
  if (Array.isArray(value)) return value.map(sortedClone);
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortedClone(value[key]);
    return out;
  }
  return value;
}

const SAMPLE = {
  sells: [
    { row: 3, shares: 150, proceeds: '1950.0000', costRelieved: '1750.0000', realizedPnl: '200.0000' },
  ],
  totalRealizedPnl: '200.0000',
  totalFees: '0.0000',
  totalSharesHeld: 100,
  totalCostBasis: '1500.0000',
  averageCostPerShare: '15.0000',
  remainingLots: [{ shares: 100, costBasis: '1500.0000' }],
};

test('fixed report filename', () => {
  assert.equal(REPORT_FILENAME, 'stock-average-cost-report.json');
});

test('serialization matches an independent sorted-key serializer', () => {
  const outcome = serializeReport(SAMPLE);
  assert.equal(outcome.ok, true);
  const expected = `${JSON.stringify(sortedClone(SAMPLE))}\n`;
  assert.equal(outcome.text, expected);
  // Top-level keys are sorted by UTF-16 code units.
  assert.ok(outcome.text.startsWith('{"averageCostPerShare":"15.0000","remainingLots":'));
  // Exactly one trailing LF; UTF-8 without BOM.
  const bytes = Buffer.from(outcome.text, 'utf8');
  assert.equal(bytes[0], 0x7b);
  assert.equal(bytes[bytes.length - 1], 0x0a);
  assert.notEqual(bytes[bytes.length - 2], 0x0a);
  // Deterministic: same input, same bytes, same hash.
  const again = serializeReport(SAMPLE);
  assert.equal(again.text, outcome.text);
  assert.equal(
    createHash('sha256').update(again.text, 'utf8').digest('hex'),
    createHash('sha256').update(outcome.text, 'utf8').digest('hex'),
  );
});

test('key order follows UTF-16 code units, including nested objects', () => {
  const value = { b: 1, A: 2, a: { z: 1, B: 2 }, '10': 3 };
  const outcome = serializeReport(value);
  const expected = `${JSON.stringify(sortedClone(value))}\n`;
  assert.equal(outcome.text, expected);
  assert.ok(outcome.text.indexOf('"10"') < outcome.text.indexOf('"A"'));
});

test('strings are JSON-escaped faithfully (quotes, controls, unicode)', () => {
  const value = { note: 'a"b\\c\nd\te 股票平均成本計算機', n: null, f: false };
  const outcome = serializeReport(value);
  assert.equal(outcome.text, `${JSON.stringify(sortedClone(value))}\n`);
});

test('byte cap: exactly at the cap passes, one byte over fails', () => {
  assert.equal(MAX_REPORT_BYTES, 2097152);
  const base = '{"pad":""}\n'.length; // 11 bytes for ASCII
  const atCap = serializeReport({ pad: 'x'.repeat(MAX_REPORT_BYTES - base) });
  assert.equal(atCap.ok, true);
  assert.equal(Buffer.byteLength(atCap.text, 'utf8'), MAX_REPORT_BYTES);
  const overCap = serializeReport({ pad: 'x'.repeat(MAX_REPORT_BYTES - base + 1) });
  assert.equal(overCap.ok, false);
  assert.deepEqual(overCap.error, { code: 'OUTPUT_LIMIT', field: null, row: null });
});

test('non-object values serialize as plain JSON', () => {
  assert.equal(serializeReport(null).text, 'null\n');
  assert.equal(serializeReport([3, 1, 2]).text, '[3,1,2]\n', 'arrays keep order');
});
