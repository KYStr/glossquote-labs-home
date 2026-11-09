// Core tests: the 7 literal fixtures from docs/specs/log-gap-audit/
// fixtures.json (expected values transcribed from the SPEC, never generated
// from the implementation), plus independently derived boundary cases.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../public/js/core/audit.mjs';

const specDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'docs',
  'specs',
  'log-gap-audit',
);
const fixtures = JSON.parse(await readFile(path.join(specDir, 'fixtures.json'), 'utf8'));

for (const c of fixtures.cases.filter((x) => x.kind === 'core')) {
  test(`fixture ${c.id}: ${c.purpose}`, () => {
    assert.deepEqual(run(c.input), c.expected);
  });
}

test('threshold grammar: empty, leading zero, 19 digits are THRESHOLD', () => {
  const base = { records: '0\t0' };
  assert.deepEqual(run({ ...base, threshold: '' }), {
    ok: false, error: { code: 'THRESHOLD', field: 'threshold', row: null },
  });
  assert.deepEqual(run({ ...base, threshold: '00' }), {
    ok: false, error: { code: 'THRESHOLD', field: 'threshold', row: null },
  });
  assert.deepEqual(run({ ...base, threshold: '1000000000000000000' }), {
    ok: false, error: { code: 'THRESHOLD', field: 'threshold', row: null },
  });
  assert.deepEqual(run({ ...base, threshold: '999999999999999999' }), {
    ok: true, result: { rowCount: 1, findings: [] },
  });
});

test('threshold is validated before records', () => {
  assert.deepEqual(run({ records: 'bad', threshold: 'x' }), {
    ok: false, error: { code: 'THRESHOLD', field: 'threshold', row: null },
  });
});

test('capacity: 65537 UTF-16 units is INPUT_LIMIT, 65536 is not', () => {
  const over = '0\t0\n'.repeat(16384) + '0'; // 65,537 units
  assert.equal(over.length, 65537);
  assert.deepEqual(run({ records: over, threshold: '1000' }), {
    ok: false, error: { code: 'INPUT_LIMIT', field: 'records', row: null },
  });
  const at = '0\t0\n'.repeat(16384); // 65,536 units, 16,384 rows
  assert.equal(at.length, 65536);
  assert.deepEqual(run({ records: at, threshold: '1000' }), {
    ok: false, error: { code: 'ROW_LIMIT', field: 'records', row: null },
  });
});

test('empty: blank string and lone newline are EMPTY', () => {
  assert.deepEqual(run({ records: '', threshold: '5' }), {
    ok: false, error: { code: 'EMPTY', field: 'records', row: null },
  });
  assert.deepEqual(run({ records: '\n', threshold: '5' }), {
    ok: false, error: { code: 'EMPTY', field: 'records', row: null },
  });
});

test('row count: 1000 rows pass, 1001 rows are ROW_LIMIT', () => {
  const rows = [];
  for (let i = 0; i < 1000; i += 1) rows.push(`${i}\t${i}`);
  assert.deepEqual(run({ records: rows.join('\n'), threshold: '1000' }), {
    ok: true, result: { rowCount: 1000, findings: [] },
  });
  rows.push('1000\t1000');
  assert.deepEqual(run({ records: rows.join('\n'), threshold: '1000' }), {
    ok: false, error: { code: 'ROW_LIMIT', field: 'records', row: null },
  });
});

test('unpaired surrogate is UNICODE; a valid pair fails grammar instead', () => {
  assert.deepEqual(run({ records: '0\t0\n\uD800\t0', threshold: '5' }), {
    ok: false, error: { code: 'UNICODE', field: 'records', row: null },
  });
  assert.deepEqual(run({ records: '0\t0\n\uDC00\t0', threshold: '5' }), {
    ok: false, error: { code: 'UNICODE', field: 'records', row: null },
  });
  assert.deepEqual(run({ records: '😀\t0', threshold: '5' }), {
    ok: false, error: { code: 'SEQUENCE', field: 'records', row: 1 },
  });
});

test('row format: wrong column counts report the source row', () => {
  assert.deepEqual(run({ records: '1\t0\t2', threshold: '5' }), {
    ok: false, error: { code: 'ROW_FORMAT', field: 'records', row: 1 },
  });
  assert.deepEqual(run({ records: '1', threshold: '5' }), {
    ok: false, error: { code: 'ROW_FORMAT', field: 'records', row: 1 },
  });
  assert.deepEqual(run({ records: '1\t0\n\n2\t0', threshold: '5' }), {
    ok: false, error: { code: 'ROW_FORMAT', field: 'records', row: 2 },
  });
});

test('sequence grammar: leading zero, sign, decimal, 19 digits are SEQUENCE', () => {
  for (const bad of ['00', '-1', '1.5', '1234567890123456789', ' 1', '1 ']) {
    assert.deepEqual(run({ records: `${bad}\t0`, threshold: '5' }), {
      ok: false, error: { code: 'SEQUENCE', field: 'records', row: 1 },
    });
  }
});

test('time grammar: leading zero, sign, decimal are TIME', () => {
  for (const bad of ['00', '-5', '1.5']) {
    assert.deepEqual(run({ records: `1\t${bad}`, threshold: '5' }), {
      ok: false, error: { code: 'TIME', field: 'records', row: 1 },
    });
  }
  // The same bad value on the second row reports row 2.
  assert.deepEqual(run({ records: '1\t0\n2\t1.5', threshold: '5' }), {
    ok: false, error: { code: 'TIME', field: 'records', row: 2 },
  });
});

test('CRLF is not a line ending: CR stays in the field and fails TIME', () => {
  assert.deepEqual(run({ records: '1\t0\r\n2\t5', threshold: '5' }), {
    ok: false, error: { code: 'TIME', field: 'records', row: 1 },
  });
});

test('schema: non-object, missing field, unknown field, wrong type, accessor', () => {
  const schemaNull = { ok: false, error: { code: 'SCHEMA', field: null, row: null } };
  assert.deepEqual(run(null), schemaNull);
  assert.deepEqual(run([]), schemaNull);
  assert.deepEqual(run('0\t0'), schemaNull);
  assert.deepEqual(run({ records: '0\t0' }), {
    ok: false, error: { code: 'SCHEMA', field: 'threshold', row: null },
  });
  assert.deepEqual(run({ threshold: '5' }), {
    ok: false, error: { code: 'SCHEMA', field: 'records', row: null },
  });
  assert.deepEqual(run({ records: '0\t0', threshold: '5', extra: 1 }), {
    ok: false, error: { code: 'SCHEMA', field: 'extra', row: null },
  });
  assert.deepEqual(run({ records: 5, threshold: '5' }), {
    ok: false, error: { code: 'SCHEMA', field: 'records', row: null },
  });
  const accessor = {};
  Object.defineProperty(accessor, 'records', { get: () => '0\t0', enumerable: true });
  accessor.threshold = '5';
  assert.deepEqual(run(accessor), {
    ok: false, error: { code: 'SCHEMA', field: 'records', row: null },
  });
});

test('trailing LF: one is stripped, two leave an empty row', () => {
  assert.deepEqual(run({ records: '1\t0\n', threshold: '5' }), {
    ok: true, result: { rowCount: 1, findings: [] },
  });
  assert.deepEqual(run({ records: '1\t0\n\n', threshold: '5' }), {
    ok: false, error: { code: 'ROW_FORMAT', field: 'records', row: 2 },
  });
});

test('gap arithmetic: delta 2 gives from/to/count; delta 1 is clean', () => {
  assert.deepEqual(run({ records: '10\t0\n12\t0', threshold: '1000' }), {
    ok: true,
    result: {
      rowCount: 2,
      findings: [{
        line: 2, prevLine: 1, sequenceDelta: '2', timeDelta: '0',
        issues: [{ code: 'SEQ_GAP', from: '11', to: '11', count: '1' }],
      }],
    },
  });
  assert.deepEqual(run({ records: '10\t0\n11\t0', threshold: '1000' }), {
    ok: true, result: { rowCount: 2, findings: [] },
  });
});

test('time gap: threshold+1 flags, threshold does not', () => {
  assert.deepEqual(run({ records: '1\t0\n2\t6', threshold: '5' }), {
    ok: true,
    result: {
      rowCount: 2,
      findings: [{
        line: 2, prevLine: 1, sequenceDelta: '1', timeDelta: '6',
        issues: [{ code: 'TIME_GAP' }],
      }],
    },
  });
});

test('18-digit adjacent values use exact BigInt deltas', () => {
  assert.deepEqual(
    run({ records: '999999999999999998\t900719925474099200\n999999999999999999\t900719925474099201', threshold: '0' }),
    {
      ok: true,
      result: {
        rowCount: 2,
        findings: [{
          line: 2, prevLine: 1, sequenceDelta: '1', timeDelta: '1',
          issues: [{ code: 'TIME_GAP' }],
        }],
      },
    },
  );
});

test('all clean: arbitrary start, repeats of 1, equal times', () => {
  assert.deepEqual(run({ records: '500\t900\n501\t900\n502\t900', threshold: '0' }), {
    ok: true, result: { rowCount: 3, findings: [] },
  });
});
