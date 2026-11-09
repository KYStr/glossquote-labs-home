// Download serialization: canonical key order, exact bytes, and the
// OUTPUT_LIMIT cap. Expected strings are written by hand.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport, canonicalJson, LIMITS } from '../public/js/core/pairwise.mjs';

test('canonicalJson sorts object keys by UTF-16 code units, recursively', () => {
  assert.equal(
    canonicalJson({ spaceSize: 4, dimensions: ['Z', 'X'], cases: [{ values: ['b', 'd'], gain: 1 }], pairCount: 4 }),
    '{"cases":[{"gain":1,"values":["b","d"]}],"dimensions":["Z","X"],"pairCount":4,"spaceSize":4}',
  );
  assert.equal(canonicalJson({ b: 1, a: { d: 4, c: 3 } }), '{"a":{"c":3,"d":4},"b":1}');
  // A key with a lone surrogate is not valid JSON input here; escaping of
  // ordinary strings follows JSON literal rules.
  assert.equal(canonicalJson({ s: 'a"b\\c\nd' }), '{"s":"a\\"b\\\\c\\nd"}');
  // Arrays keep their order.
  assert.equal(canonicalJson([3, 1, 2]), '[3,1,2]');
});

test('buildReport appends one LF and counts UTF-8 bytes', () => {
  const result = { dimensions: ['A', 'B'], spaceSize: 4, pairCount: 4, cases: [{ values: ['a', 'b'], gain: 1 }] };
  const rep = buildReport(result);
  assert.equal(rep.ok, true);
  assert.equal(rep.text, '{"cases":[{"gain":1,"values":["a","b"]}],"dimensions":["A","B"],"pairCount":4,"spaceSize":4}\n');
  assert.equal(rep.bytes, new TextEncoder().encode(rep.text).length);
  assert.ok(rep.text.endsWith('}\n') && !rep.text.endsWith('}\n\n'));
});

test('buildReport refuses over the 2,097,152-byte cap', () => {
  const cases = Array.from({ length: 100000 }, (_, i) => ({
    values: [`v${i % 6}`, `w${i % 6}`],
    gain: 1,
  }));
  const rep = buildReport({ dimensions: ['A', 'B'], spaceSize: 36, pairCount: 36, cases });
  assert.equal(rep.ok, false);
  assert.deepEqual(rep.error, { code: 'OUTPUT_LIMIT', field: null, row: null });
  assert.ok(LIMITS.MAX_REPORT_BYTES === 2097152);
});
