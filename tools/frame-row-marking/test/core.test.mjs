// Core tests for frame-row-marking.
// Expected values are copied verbatim from docs/specs/frame-row-marking/
// fixtures.json (solve cases) or hand-derived from the SPEC's own rules;
// never generated from the implementation under test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, formatMm, parseIntegerField, validateNameField } from '../public/js/core/frame-row-marking.mjs';

const center = {
  spanMm: 1000,
  minGapMm: 100,
  align: 'center',
  frames: [
    { name: 'A', wMm: 200, hMm: 300, hookLeftMm: 100, hookTopMm: 40 },
    { name: 'B', wMm: 300, hMm: 200, hookLeftMm: 150, hookTopMm: 20 },
  ],
};

const top = {
  spanMm: 600,
  minGapMm: 0,
  align: 'top',
  frames: [
    { name: 'A', wMm: 200, hMm: 100, hookLeftMm: 25, hookTopMm: 10 },
    { name: 'B', wMm: 100, hMm: 200, hookLeftMm: 80, hookTopMm: 15 },
  ],
};

test('fixture frame-row-marking.center (verbatim)', () => {
  assert.deepStrictEqual(solve(center), {
    status: 'ok',
    result: {
      feasible: true,
      deficitMm: 0,
      gapTenths: 1667,
      marks: [
        { name: 'A', leftTenths: 1667, topTenths: 0, hookXTenths: 2667, hookYTenths: 400 },
        { name: 'B', leftTenths: 5333, topTenths: 500, hookXTenths: 6833, hookYTenths: 700 },
      ],
    },
  });
});

test('fixture frame-row-marking.top (verbatim)', () => {
  assert.deepStrictEqual(solve(top), {
    status: 'ok',
    result: {
      feasible: true,
      deficitMm: 0,
      gapTenths: 1000,
      marks: [
        { name: 'A', leftTenths: 1000, topTenths: 0, hookXTenths: 1250, hookYTenths: 100 },
        { name: 'B', leftTenths: 4000, topTenths: 0, hookXTenths: 4800, hookYTenths: 150 },
      ],
    },
  });
});

test('fixture frame-row-marking.exact-gap (verbatim)', () => {
  assert.deepStrictEqual(
    solve({
      spanMm: 360,
      minGapMm: 20,
      align: 'top',
      frames: [
        { name: 'A', wMm: 100, hMm: 100, hookLeftMm: 0, hookTopMm: 0 },
        { name: 'B', wMm: 200, hMm: 100, hookLeftMm: 200, hookTopMm: 100 },
      ],
    }),
    {
      status: 'ok',
      result: {
        feasible: true,
        deficitMm: 0,
        gapTenths: 200,
        marks: [
          { name: 'A', leftTenths: 200, topTenths: 0, hookXTenths: 200, hookYTenths: 0 },
          { name: 'B', leftTenths: 1400, topTenths: 0, hookXTenths: 3400, hookYTenths: 1000 },
        ],
      },
    },
  );
});

test('fixture frame-row-marking.short (verbatim)', () => {
  assert.deepStrictEqual(
    solve({
      spanMm: 359,
      minGapMm: 20,
      align: 'top',
      frames: [
        { name: 'A', wMm: 100, hMm: 100, hookLeftMm: 50, hookTopMm: 0 },
        { name: 'B', wMm: 200, hMm: 100, hookLeftMm: 100, hookTopMm: 0 },
      ],
    }),
    {
      status: 'ok',
      result: { feasible: false, deficitMm: 1, gapTenths: null, marks: [] },
    },
  );
});

test('fixture frame-row-marking.hook-out (verbatim)', () => {
  assert.deepStrictEqual(
    solve({
      spanMm: 500,
      minGapMm: 0,
      align: 'top',
      frames: [
        { name: 'A', wMm: 100, hMm: 100, hookLeftMm: 101, hookTopMm: 0 },
        { name: 'B', wMm: 100, hMm: 100, hookLeftMm: 30, hookTopMm: 0 },
      ],
    }),
    { status: 'error', error: { code: 'OFFSET', path: '/frames/0/hookLeftMm' } },
  );
});

test('fixture frame-row-marking.fractional-wall (verbatim)', () => {
  assert.deepStrictEqual(
    solve({
      spanMm: 500.5,
      minGapMm: 0,
      align: 'top',
      frames: [
        { name: 'A', wMm: 100, hMm: 100, hookLeftMm: 20, hookTopMm: 0 },
        { name: 'B', wMm: 100, hMm: 100, hookLeftMm: 20, hookTopMm: 0 },
      ],
    }),
    { status: 'error', error: { code: 'TYPE', path: '/spanMm' } },
  );
});

test('half-up rounding: 1.25 mm gap rounds to 1.3 mm, never from a displayed value', () => {
  const out = solve({
    spanMm: 305,
    minGapMm: 0,
    align: 'top',
    frames: [
      { name: 'A', wMm: 100, hMm: 100, hookLeftMm: 0, hookTopMm: 0 },
      { name: 'B', wMm: 100, hMm: 100, hookLeftMm: 0, hookTopMm: 0 },
      { name: 'C', wMm: 100, hMm: 100, hookLeftMm: 0, hookTopMm: 0 },
    ],
  });
  assert.deepStrictEqual(out, {
    status: 'ok',
    result: {
      feasible: true,
      deficitMm: 0,
      gapTenths: 13,
      marks: [
        { name: 'A', leftTenths: 13, topTenths: 0, hookXTenths: 13, hookYTenths: 0 },
        { name: 'B', leftTenths: 1025, topTenths: 0, hookXTenths: 1025, hookYTenths: 0 },
        { name: 'C', leftTenths: 2038, topTenths: 0, hookXTenths: 2038, hookYTenths: 0 },
      ],
    },
  });
});

test('center alignment with odd height difference rounds half-up', () => {
  const out = solve({
    spanMm: 400,
    minGapMm: 0,
    align: 'center',
    frames: [
      { name: 'A', wMm: 100, hMm: 301, hookLeftMm: 0, hookTopMm: 0 },
      { name: 'B', wMm: 100, hMm: 100, hookLeftMm: 10, hookTopMm: 3 },
    ],
  });
  assert.equal(out.status, 'ok');
  assert.equal(out.result.marks[0].topTenths, 0);
  assert.equal(out.result.marks[1].topTenths, 1005); // (301-100)/2 = 100.5
  assert.equal(out.result.marks[1].hookYTenths, 1035); // 100.5 + 3
});

test('hook exactly on the frame edge is allowed', () => {
  const out = solve({
    spanMm: 300,
    minGapMm: 0,
    align: 'top',
    frames: [
      { name: 'A', wMm: 100, hMm: 100, hookLeftMm: 100, hookTopMm: 100 },
      { name: 'B', wMm: 100, hMm: 100, hookLeftMm: 0, hookTopMm: 0 },
    ],
  });
  assert.equal(out.status, 'ok');
  // Gap is (300-200)/3 = 33.3 mm, so the hook sits at 33.3 + 100 = 133.3 mm.
  assert.equal(out.result.marks[0].hookXTenths, 1333);
  assert.equal(out.result.marks[0].hookYTenths, 1000);
});

test('hookTopMm beyond height is OFFSET at the hookTopMm path', () => {
  assert.deepStrictEqual(
    solve({
      spanMm: 500,
      minGapMm: 0,
      align: 'top',
      frames: [
        { name: 'A', wMm: 100, hMm: 100, hookLeftMm: 10, hookTopMm: 101 },
        { name: 'B', wMm: 100, hMm: 100, hookLeftMm: 10, hookTopMm: 0 },
      ],
    }),
    { status: 'error', error: { code: 'OFFSET', path: '/frames/0/hookTopMm' } },
  );
});

test('infeasible deficit counts the minimum gap on every segment', () => {
  const out = solve({
    spanMm: 100,
    minGapMm: 20,
    align: 'top',
    frames: [
      { name: 'A', wMm: 25, hMm: 10, hookLeftMm: 0, hookTopMm: 0 },
      { name: 'B', wMm: 25, hMm: 10, hookLeftMm: 0, hookTopMm: 0 },
    ],
  });
  assert.deepStrictEqual(out.result, { feasible: false, deficitMm: 10, gapTenths: null, marks: [] });
});

test('12 frames at the cap work; 1 and 13 frames are RANGE at /frames', () => {
  const mk = (count) => ({
    spanMm: 12000,
    minGapMm: 0,
    align: 'top',
    frames: Array.from({ length: count }, (_, i) => ({
      name: `F${i + 1}`,
      wMm: 10,
      hMm: 10,
      hookLeftMm: 0,
      hookTopMm: 0,
    })),
  });
  assert.equal(solve(mk(12)).status, 'ok');
  assert.deepStrictEqual(solve(mk(1)), { status: 'error', error: { code: 'RANGE', path: '/frames' } });
  assert.deepStrictEqual(solve(mk(13)), { status: 'error', error: { code: 'RANGE', path: '/frames' } });
});

test('integer bounds: 0 and 20001 spanMm, 2001 minGapMm, 0 wMm are RANGE', () => {
  const base = structuredClone(center);
  assert.deepStrictEqual(solve({ ...base, spanMm: 0 }), {
    status: 'error',
    error: { code: 'RANGE', path: '/spanMm' },
  });
  assert.deepStrictEqual(solve({ ...base, spanMm: 20001 }), {
    status: 'error',
    error: { code: 'RANGE', path: '/spanMm' },
  });
  assert.deepStrictEqual(solve({ ...base, minGapMm: 2001 }), {
    status: 'error',
    error: { code: 'RANGE', path: '/minGapMm' },
  });
  const badW = structuredClone(center);
  badW.frames[1].wMm = 0;
  assert.deepStrictEqual(solve(badW), {
    status: 'error',
    error: { code: 'RANGE', path: '/frames/1/wMm' },
  });
});

test('non-integer types: string number, -0, NaN, non-object root are TYPE', () => {
  assert.deepStrictEqual(solve({ ...center, spanMm: '1000' }), {
    status: 'error',
    error: { code: 'TYPE', path: '/spanMm' },
  });
  assert.deepStrictEqual(solve({ ...center, spanMm: -0 }), {
    status: 'error',
    error: { code: 'TYPE', path: '/spanMm' },
  });
  assert.deepStrictEqual(solve({ ...center, spanMm: Number.NaN }), {
    status: 'error',
    error: { code: 'TYPE', path: '/spanMm' },
  });
  assert.deepStrictEqual(solve(null), { status: 'error', error: { code: 'TYPE', path: '' } });
  assert.deepStrictEqual(solve([1, 2]), { status: 'error', error: { code: 'TYPE', path: '' } });
  assert.deepStrictEqual(solve({ ...center, align: 5 }), {
    status: 'error',
    error: { code: 'TYPE', path: '/align' },
  });
  assert.deepStrictEqual(solve({ ...center, frames: 'x' }), {
    status: 'error',
    error: { code: 'TYPE', path: '/frames' },
  });
  const badFrame = structuredClone(center);
  badFrame.frames[0] = 42;
  assert.deepStrictEqual(solve(badFrame), {
    status: 'error',
    error: { code: 'TYPE', path: '/frames/0' },
  });
});

test('align other than top/center is ENUM', () => {
  assert.deepStrictEqual(solve({ ...center, align: 'middle' }), {
    status: 'error',
    error: { code: 'ENUM', path: '/align' },
  });
});

test('shape: unknown root key -> SHAPE at root; missing key -> SHAPE at the key path', () => {
  assert.deepStrictEqual(solve({ ...center, extra: 1 }), {
    status: 'error',
    error: { code: 'SHAPE', path: '' },
  });
  const { spanMm, ...rest } = center;
  assert.deepStrictEqual(solve(rest), {
    status: 'error',
    error: { code: 'SHAPE', path: '/spanMm' },
  });
});

test('shape: unknown/missing frame key -> SHAPE at the frame object / key path', () => {
  const bad = structuredClone(center);
  bad.frames[0].depth = 5;
  assert.deepStrictEqual(solve(bad), {
    status: 'error',
    error: { code: 'SHAPE', path: '/frames/0' },
  });
  const missing = structuredClone(center);
  delete missing.frames[0].hMm;
  assert.deepStrictEqual(solve(missing), {
    status: 'error',
    error: { code: 'SHAPE', path: '/frames/0/hMm' },
  });
});

test('size: input over 65536 UTF-8 bytes is SIZE at root, before shape checks', () => {
  const big = { ...center, padding: 'x'.repeat(70000) };
  assert.deepStrictEqual(solve(big), {
    status: 'error',
    error: { code: 'SIZE', path: '' },
  });
});

test('names: trim U+0020, NFC, duplicate after normalization is DUPLICATE at the second name', () => {
  const dup = structuredClone(center);
  dup.frames[1].name = 'A';
  assert.deepStrictEqual(solve(dup), {
    status: 'error',
    error: { code: 'DUPLICATE', path: '/frames/1/name' },
  });
  const nfc = structuredClone(center);
  nfc.frames[0].name = 'é'; // e + U+0301 combining acute
  nfc.frames[1].name = 'é'; // U+00E9 precomposed
  assert.deepStrictEqual(solve(nfc), {
    status: 'error',
    error: { code: 'DUPLICATE', path: '/frames/1/name' },
  });
  const trimmed = structuredClone(center);
  trimmed.frames[0].name = ' A ';
  const out = solve(trimmed);
  assert.equal(out.status, 'ok');
  assert.equal(out.result.marks[0].name, 'A');
});

test('names: empty, leading symbol, emoji, and 25 code points are refused', () => {
  for (const bad of ['', ' ', '-A', '😀A', 'A'.repeat(25)]) {
    const d = structuredClone(center);
    d.frames[0].name = bad;
    assert.equal(solve(d).status, 'error', JSON.stringify(bad));
  }
  const ok = structuredClone(center);
  ok.frames[0].name = '客廳-1_相框';
  assert.equal(solve(ok).status, 'ok');
  const digitFirst = structuredClone(center);
  digitFirst.frames[0].name = '1號';
  assert.equal(solve(digitFirst).status, 'ok');
});

test('solve does not mutate its input', () => {
  const frozen = structuredClone(center);
  Object.freeze(frozen);
  frozen.frames.forEach(Object.freeze);
  assert.equal(solve(frozen).status, 'ok');
});

test('parseIntegerField refuses blanks, leading zeros, full-width digits, sign, decimals', () => {
  for (const bad of ['', ' ', '007', '１２', '+12', '-1', '1.5', '1e3', '1234567890123']) {
    assert.deepStrictEqual(parseIntegerField(bad, 0, 20000, '/spanMm'), {
      error: { code: 'TYPE', path: '/spanMm' },
    });
  }
  assert.deepStrictEqual(parseIntegerField('0', 0, 20000, '/spanMm'), { value: 0 });
  assert.deepStrictEqual(parseIntegerField('20000', 1, 20000, '/spanMm'), { value: 20000 });
  assert.deepStrictEqual(parseIntegerField('20001', 1, 20000, '/spanMm'), {
    error: { code: 'RANGE', path: '/spanMm' },
  });
});

test('validateNameField enforces the 128 code-unit form limit and the N rules', () => {
  assert.deepStrictEqual(validateNameField('A'.repeat(129), '/frames/0/name'), {
    error: { code: 'TYPE', path: '/frames/0/name' },
  });
  assert.deepStrictEqual(validateNameField(' 框A ', '/frames/0/name'), { name: '框A' });
});

test('formatMm renders one decimal via Intl.NumberFormat', () => {
  assert.equal(formatMm(1667, 'en'), '166.7');
  assert.equal(formatMm(0, 'en'), '0.0');
  assert.equal(formatMm(1000, 'zh-Hant'), '100.0');
});
