// Core tests for Numeric Range Coverage Audit.
// Expected values are transcribed from docs/specs/range-coverage-audit/fixtures.json
// and hand-derived from the SPEC rules — never generated from the implementation.

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReport,
  formatDecimal,
  hasUnpairedSurrogate,
  parseDecimal,
  runAudit,
  serializeReport,
} from '../public/js/core/range.mjs';

// --- The 7 literal core fixtures (ids and expected values verbatim) ---

test('gap-and-overlap: one overlap and one gap', () => {
  assert.deepEqual(runAudit({ start: '0', end: '10', intervals: '0\t4\n3\t6\n8\t10' }), {
    ok: true,
    result: {
      spans: [
        { from: '0', to: '3', depth: 1, lines: [1] },
        { from: '3', to: '4', depth: 2, lines: [1, 2] },
        { from: '4', to: '6', depth: 1, lines: [2] },
        { from: '6', to: '8', depth: 0, lines: [] },
        { from: '8', to: '10', depth: 1, lines: [3] },
      ],
      covered: '8',
      uncovered: '2',
      overlapped: '1',
    },
  });
});

test('negative-touch: negative decimals across zero, touching is not overlap', () => {
  assert.deepEqual(runAudit({ start: '-1.5', end: '1', intervals: '-1.5\t-0.250\n-0.25\t0.250\n0.25\t1' }), {
    ok: true,
    result: {
      spans: [
        { from: '-1.5', to: '-0.25', depth: 1, lines: [1] },
        { from: '-0.25', to: '0.25', depth: 1, lines: [2] },
        { from: '0.25', to: '1', depth: 1, lines: [3] },
      ],
      covered: '2.5',
      uncovered: '0',
      overlapped: '0',
    },
  });
});

test('duplicate-interval: same interval twice keeps depth 2, -0.0 normalises', () => {
  assert.deepEqual(runAudit({ start: '-0.0', end: '2', intervals: '1\t2\n1.000\t2.000' }), {
    ok: true,
    result: {
      spans: [
        { from: '0', to: '1', depth: 0, lines: [] },
        { from: '1', to: '2', depth: 2, lines: [1, 2] },
      ],
      covered: '1',
      uncovered: '1',
      overlapped: '1',
    },
  });
});

test('triple-depth: overlap length is not multiplied by depth', () => {
  assert.deepEqual(runAudit({ start: '0', end: '4', intervals: '0\t4\n1\t3\n2\t3' }), {
    ok: true,
    result: {
      spans: [
        { from: '0', to: '1', depth: 1, lines: [1] },
        { from: '1', to: '2', depth: 2, lines: [1, 2] },
        { from: '2', to: '3', depth: 3, lines: [1, 2, 3] },
        { from: '3', to: '4', depth: 1, lines: [1] },
      ],
      covered: '4',
      uncovered: '0',
      overlapped: '2',
    },
  });
});

test('no-intervals: empty list shows the whole domain as a gap', () => {
  assert.deepEqual(runAudit({ start: '-0.001', end: '0', intervals: '' }), {
    ok: true,
    result: {
      spans: [{ from: '-0.001', to: '0', depth: 0, lines: [] }],
      covered: '0',
      uncovered: '0.001',
      overlapped: '0',
    },
  });
});

test('outside: interval beyond the domain is refused, never clipped', () => {
  assert.deepEqual(runAudit({ start: '0', end: '1', intervals: '0\t1.001' }), {
    ok: false,
    error: { code: 'OUTSIDE', field: 'intervals', row: 1 },
  });
});

test('zero-length: zero-length interval refused', () => {
  assert.deepEqual(runAudit({ start: '0', end: '1', intervals: '0.500\t0.5' }), {
    ok: false,
    error: { code: 'INTERVAL_ORDER', field: 'intervals', row: 1 },
  });
});

// --- Decimal grammar and formatting ---

test('parseDecimal accepts the pinned grammar and range', () => {
  assert.equal(parseDecimal('0'), 0n);
  assert.equal(parseDecimal('-0'), 0n);
  assert.equal(parseDecimal('-0.0'), 0n);
  assert.equal(parseDecimal('2.5'), 2500n);
  assert.equal(parseDecimal('-0.25'), -250n);
  assert.equal(parseDecimal('1000000000'), 1000000000000n);
  assert.equal(parseDecimal('-1000000000'), -1000000000000n);
  assert.equal(parseDecimal('0.001'), 1n);
});

test('parseDecimal rejects non-grammar and out-of-range values', () => {
  for (const bad of ['+1', ' 1', '1 ', '1e3', '01', '1.0001', '.', '-', '', '1000000000.001', '-1000000000.001', '9999999999', '1,5', 'NaN']) {
    assert.equal(parseDecimal(bad), null, bad);
  }
});

test('formatDecimal strips zeros and never shows negative zero', () => {
  assert.equal(formatDecimal(0n), '0');
  assert.equal(formatDecimal(2500n), '2.5');
  assert.equal(formatDecimal(-250n), '-0.25');
  assert.equal(formatDecimal(1000n), '1');
  assert.equal(formatDecimal(1005n), '1.005');
  assert.equal(formatDecimal(1010n), '1.01');
  assert.equal(formatDecimal(-1n), '-0.001');
  assert.equal(formatDecimal(1000000000000n), '1000000000');
});

// --- Schema and error ordering ---

test('SCHEMA for wrong shape, unknown/missing fields, wrong types, accessors', () => {
  assert.deepEqual(runAudit(null).error, { code: 'SCHEMA', field: null, row: null });
  assert.deepEqual(runAudit([]).error, { code: 'SCHEMA', field: null, row: null });
  assert.deepEqual(runAudit({ start: '0', end: '1' }).error, { code: 'SCHEMA', field: null, row: null });
  assert.deepEqual(runAudit({ start: '0', end: '1', intervals: '', extra: 1 }).error, { code: 'SCHEMA', field: null, row: null });
  assert.deepEqual(runAudit({ start: 0, end: '1', intervals: '' }).error, { code: 'SCHEMA', field: null, row: null });
  const accessor = {};
  Object.defineProperty(accessor, 'start', { get() { return '0'; }, enumerable: true });
  accessor.end = '1';
  accessor.intervals = '';
  assert.deepEqual(runAudit(accessor).error, { code: 'SCHEMA', field: null, row: null });
});

test('EMPTY for missing domain content; ENDPOINT then DOMAIN_ORDER', () => {
  assert.deepEqual(runAudit({ start: '', end: '1', intervals: '' }).error, { code: 'EMPTY', field: 'start', row: null });
  assert.deepEqual(runAudit({ start: '0', end: '', intervals: '' }).error, { code: 'EMPTY', field: 'end', row: null });
  assert.deepEqual(runAudit({ start: 'x', end: '1', intervals: '' }).error, { code: 'ENDPOINT', field: 'start', row: null });
  assert.deepEqual(runAudit({ start: '0', end: 'x', intervals: '' }).error, { code: 'ENDPOINT', field: 'end', row: null });
  assert.deepEqual(runAudit({ start: '1', end: '1', intervals: '' }).error, { code: 'DOMAIN_ORDER', field: 'end', row: null });
  assert.deepEqual(runAudit({ start: '2', end: '1', intervals: '' }).error, { code: 'DOMAIN_ORDER', field: 'end', row: null });
  // Domain order is checked before interval errors.
  assert.deepEqual(runAudit({ start: '2', end: '1', intervals: 'bad' }).error, { code: 'DOMAIN_ORDER', field: 'end', row: null });
});

test('capacity, surrogate, row-count checks run before per-row checks', () => {
  const tooLong = '0\t1\n'.repeat(5000); // 20,000 chars > 16,384
  assert.ok(tooLong.length > 16384);
  assert.deepEqual(runAudit({ start: '0', end: '10', intervals: tooLong }).error, { code: 'INPUT_LIMIT', field: 'intervals', row: null });
  assert.deepEqual(runAudit({ start: '0', end: '10', intervals: '0\t1\n\uD800' }).error, { code: 'UNICODE', field: 'intervals', row: null });
  assert.deepEqual(runAudit({ start: '0', end: '10', intervals: '\uDC00' }).error, { code: 'UNICODE', field: 'intervals', row: null });
  const rows201 = Array.from({ length: 201 }, () => '0\t1').join('\n');
  assert.deepEqual(runAudit({ start: '0', end: '10', intervals: rows201 }).error, { code: 'ROW_LIMIT', field: 'intervals', row: null });
  const rows200 = Array.from({ length: 200 }, () => '0\t1').join('\n');
  assert.equal(runAudit({ start: '0', end: '10', intervals: rows200 }).ok, true);
});

test('per-row errors report the physical 1-based row', () => {
  assert.deepEqual(runAudit({ start: '0', end: '10', intervals: '0\t1\n5' }).error, { code: 'ROW_FORMAT', field: 'intervals', row: 2 });
  assert.deepEqual(runAudit({ start: '0', end: '10', intervals: '0\t1\t2' }).error, { code: 'ROW_FORMAT', field: 'intervals', row: 1 });
  assert.deepEqual(runAudit({ start: '0', end: '10', intervals: '0\t1\na\t2' }).error, { code: 'ENDPOINT', field: 'intervals', row: 2 });
  assert.deepEqual(runAudit({ start: '0', end: '10', intervals: '0\t1\n1\tb' }).error, { code: 'ENDPOINT', field: 'intervals', row: 2 });
  assert.deepEqual(runAudit({ start: '0', end: '10', intervals: '0\t1\n2\t1' }).error, { code: 'INTERVAL_ORDER', field: 'intervals', row: 2 });
  assert.deepEqual(runAudit({ start: '0', end: '10', intervals: '0\t1\n-1\t0' }).error, { code: 'OUTSIDE', field: 'intervals', row: 2 });
  assert.deepEqual(runAudit({ start: '0', end: '10', intervals: '0\t1\n9\t11' }).error, { code: 'OUTSIDE', field: 'intervals', row: 2 });
  // INTERVAL_ORDER is reported before OUTSIDE on the same row.
  assert.deepEqual(runAudit({ start: '0', end: '10', intervals: '5\t4' }).error, { code: 'INTERVAL_ORDER', field: 'intervals', row: 1 });
  // A middle empty line is a row-format error at its own row.
  assert.deepEqual(runAudit({ start: '0', end: '10', intervals: '0\t1\n\n0\t1' }).error, { code: 'ROW_FORMAT', field: 'intervals', row: 2 });
});

test('one trailing LF is dropped; a bare LF means zero intervals', () => {
  assert.deepEqual(runAudit({ start: '0', end: '4', intervals: '0\t4\n' }).result.spans, [
    { from: '0', to: '4', depth: 1, lines: [1] },
  ]);
  assert.equal(runAudit({ start: '0', end: '4', intervals: '\n' }).result.spans.length, 1);
  assert.equal(runAudit({ start: '0', end: '4', intervals: '0\t4\n\n' }).error.code, 'ROW_FORMAT');
});

test('hasUnpairedSurrogate distinguishes paired from lone surrogates', () => {
  assert.equal(hasUnpairedSurrogate('plain'), false);
  assert.equal(hasUnpairedSurrogate('emoji \uD83D\uDE00 ok'), false);
  assert.equal(hasUnpairedSurrogate('\uD83D'), true);
  assert.equal(hasUnpairedSurrogate('\uDE00'), true);
});

// --- Sweep semantics ---

test('adjacent spans with identical lines merge', () => {
  const out = runAudit({ start: '0', end: '4', intervals: '0\t4\n0\t4' });
  assert.deepEqual(out.result.spans, [{ from: '0', to: '4', depth: 2, lines: [1, 2] }]);
  const out2 = runAudit({ start: '0', end: '4', intervals: '0\t2\n0\t2\n2\t4' });
  assert.deepEqual(out2.result.spans, [
    { from: '0', to: '2', depth: 2, lines: [1, 2] },
    { from: '2', to: '4', depth: 1, lines: [3] },
  ]);
});

test('covered + uncovered equals domain length; overlapped never exceeds covered', () => {
  const cases = [
    { start: '0', end: '10', intervals: '0\t4\n3\t6\n8\t10' },
    { start: '-2.5', end: '2.5', intervals: '-2.5\t0\n-1\t1\n0.5\t2.5' },
    { start: '0', end: '1', intervals: '' },
    { start: '0', end: '3', intervals: '0\t3\n0\t3\n0\t3' },
  ];
  for (const input of cases) {
    const out = runAudit(input);
    assert.equal(out.ok, true);
    const domain = parseDecimal(input.end) - parseDecimal(input.start);
    const sum = parseDecimal(out.result.covered) + parseDecimal(out.result.uncovered);
    assert.equal(sum, domain, JSON.stringify(input));
    assert.ok(parseDecimal(out.result.overlapped) <= parseDecimal(out.result.covered));
  }
});

test('negative domain and sub-thousandth precision stay exact', () => {
  const out = runAudit({ start: '-0.003', end: '0.003', intervals: '-0.003\t-0.001\n0.001\t0.003' });
  assert.deepEqual(out.result, {
    spans: [
      { from: '-0.003', to: '-0.001', depth: 1, lines: [1] },
      { from: '-0.001', to: '0.001', depth: 0, lines: [] },
      { from: '0.001', to: '0.003', depth: 1, lines: [2] },
    ],
    covered: '0.004',
    uncovered: '0.002',
    overlapped: '0',
  });
});

// --- Report serialisation ---

test('serializeReport produces canonical sorted-key compact JSON with one LF', () => {
  const out = runAudit({ start: '0', end: '10', intervals: '0\t4\n3\t6\n8\t10' });
  const text = serializeReport(out.result);
  assert.equal(
    text,
    '{"covered":"8","overlapped":"1","spans":[{"depth":1,"from":"0","lines":[1],"to":"3"},{"depth":2,"from":"3","lines":[1,2],"to":"4"},{"depth":1,"from":"4","lines":[2],"to":"6"},{"depth":0,"from":"6","lines":[],"to":"8"},{"depth":1,"from":"8","lines":[3],"to":"10"}],"uncovered":"2"}\n',
  );
  assert.equal(new TextEncoder().encode(text).length, text.length);
});

test('buildReport enforces the 2,097,152-byte cap', () => {
  const big = { spans: [], covered: '0', uncovered: '0', overlapped: '0' };
  for (let i = 0; i < 50000; i += 1) {
    big.spans.push({ from: '0', to: '1', depth: 1, lines: [i] });
  }
  const out = buildReport(big);
  assert.equal(out.ok, false);
  assert.deepEqual(out.error, { code: 'OUTPUT_LIMIT', field: null, row: null });
  const small = buildReport({ spans: [], covered: '0', uncovered: '0', overlapped: '0' });
  assert.equal(small.ok, true);
  assert.ok(small.bytes > 0 && small.bytes < 2097152);
});
