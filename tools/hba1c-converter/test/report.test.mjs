// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from 'node:assert/strict';
import test from 'node:test';
import { run, serializeReport } from '../public/js/core/convert.mjs';
import { FIXTURES } from './fixtures.mjs';

const byId = Object.fromEntries(FIXTURES.cases.map((entry) => [entry.id, entry]));

test('the a1c-7-percent report is canonical compact JSON with one trailing LF', () => {
  const outcome = run(byId['a1c-7-percent'].input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"a1cPercent":"7.00","category":"diabetes-range","eagMgdl":"154","eagMmoll":"8.6","ifcc":"53"}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(byId['a1c-7-percent'].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"a1cPercent":"7.00","category":"diabetes-range","eagMgdl":"154","eagMmoll":"8.6","ifcc":"53"}\n',
  );
});

test('the eag-mmol-8-5-reverse report round-trips its input value', () => {
  const serialized = serializeReport(byId['eag-mmol-8-5-reverse'].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"a1cPercent":"6.96","category":"diabetes-range","eagMgdl":"153","eagMmoll":"8.5","ifcc":"53"}\n',
  );
});

test('key order does not depend on insertion order', () => {
  const shuffled = {
    ifcc: '53',
    eagMmoll: '8.6',
    category: 'diabetes-range',
    eagMgdl: '154',
    a1cPercent: '7.00',
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"a1cPercent":"7.00","category":"diabetes-range","eagMgdl":"154","eagMmoll":"8.6","ifcc":"53"}\n',
  );
});

test('an oversized result is OUTPUT_LIMIT and produces no text', () => {
  const serialized = serializeReport({ a1cPercent: '9'.repeat(3000000) });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: 'OUTPUT_LIMIT', field: null, row: null },
  });
});
