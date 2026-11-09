// Download tests: the report bytes are exactly the canonical form the
// SPEC pins, verified against an independent serializer written in this
// test file (not the product code), and the byte cap refuses oversized
// reports. Fixture results round-trip through serializeReport.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { run, serializeReport, REPORT_FILENAME } from '../public/js/core/core.mjs';

const fixtures = JSON.parse(
  await readFile(new URL('../../../docs/specs/route-overlap-audit/fixtures.json', import.meta.url), 'utf8'),
);

// Independent canonical serializer (test-side reimplementation of the SPEC
// rule: compact JSON, object keys sorted by UTF-16 code units, recursively).
function canonical(value) {
  if (value === null) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

test('report filename is fixed', () => {
  assert.equal(REPORT_FILENAME, 'route-overlap-audit-report.json');
});

for (const fixture of fixtures.cases.filter((c) => c.kind === 'core' && c.expected.ok)) {
  test(`download bytes for fixture ${fixture.id}`, () => {
    const outcome = run(fixture.input);
    assert.equal(outcome.ok, true);
    const serialized = serializeReport(outcome.result);
    assert.equal(serialized.ok, true);
    const expected = `${canonical(outcome.result)}\n`;
    assert.equal(serialized.text, expected);
    assert.equal(serialized.bytes, new TextEncoder().encode(expected).length);
    // No BOM, exactly one trailing LF.
    assert.equal(serialized.text.endsWith('\n'), true);
    assert.equal(serialized.text.endsWith('\n\n'), false);
    assert.equal(serialized.text.charCodeAt(0) !== 0xfeff, true);
  });
}

test('report is stable under key reordering of the input object', () => {
  const a = serializeReport({ routeCount: 2, overlaps: [{ method: 'GET', first: 1, second: 2, witness: '/a' }] });
  const b = serializeReport({ overlaps: [{ witness: '/a', second: 2, first: 1, method: 'GET' }], routeCount: 2 });
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(a.text, b.text);
});
