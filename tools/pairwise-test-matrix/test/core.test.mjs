// Core tests: the SPEC's literal fixtures, hand-derived cases, validation
// edges, and an independent coverage recomputation (written separately
// from the core) over deterministic inputs. Expected values come from
// fixtures.json and hand derivation, never from the implementation.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { run, verifyCoverage } from '../public/js/core/pairwise.mjs';

const fixtures = JSON.parse(
  await readFile(new URL('../../../docs/specs/pairwise-test-matrix/fixtures.json', import.meta.url), 'utf8'),
);
const coreCases = fixtures.cases.filter((c) => c.kind === 'core');

for (const c of coreCases) {
  test(`fixture ${c.id}: ${c.purpose}`, () => {
    assert.deepEqual(run(c.input), c.expected);
  });
}

test('trailing LF is stripped once; a second trailing LF is a bad line', () => {
  const ok = run({ dimensions: 'A:0|1\nB:0|1\nC:0|1\n' });
  assert.equal(ok.ok, true);
  assert.equal(ok.result.cases.length, 4);
  assert.deepEqual(run({ dimensions: 'A:0|1\nB:0|1\nC:0|1\n\n' }), {
    ok: false,
    error: { code: 'DIMENSION', field: 'dimensions', row: 4 },
  });
});

// Hand-derived greedy sequence, cross-checked round by round against an
// independent Python brute-force implementation of the SPEC's rule
// (same sequence; 7 rounds of gain 3, then 3 rounds of gain 2).
test('3x3x3 greedy sequence (7x gain 3, then 3x gain 2)', () => {
  const out = run({ dimensions: 'A:0|1|2\nB:0|1|2\nC:0|1|2' });
  assert.deepEqual(out, {
    ok: true,
    result: {
      dimensions: ['A', 'B', 'C'],
      spaceSize: 27,
      pairCount: 27,
      cases: [
        { values: ['0', '0', '0'], gain: 3 },
        { values: ['0', '1', '1'], gain: 3 },
        { values: ['0', '2', '2'], gain: 3 },
        { values: ['1', '0', '1'], gain: 3 },
        { values: ['1', '1', '0'], gain: 3 },
        { values: ['2', '0', '2'], gain: 3 },
        { values: ['2', '2', '0'], gain: 3 },
        { values: ['1', '1', '2'], gain: 2 },
        { values: ['1', '2', '1'], gain: 2 },
        { values: ['2', '1', '1'], gain: 2 },
      ],
    },
  });
});

// Independent recomputation: rebuild the pair universe from the input
// text alone and replay the returned cases in order.
function independentCheck(dimensionsText, result) {
  const dims = dimensionsText.split('\n').map((line) => {
    const [key, rest] = line.split(':');
    return { key, values: rest.split('|') };
  });
  const pairs = new Set();
  for (let i = 0; i < dims.length; i += 1) {
    for (let j = i + 1; j < dims.length; j += 1) {
      for (const a of dims[i].values) {
        for (const b of dims[j].values) pairs.add(`${i}:${a}|${j}:${b}`);
      }
    }
  }
  assert.equal(result.pairCount, pairs.size, 'pairCount');
  assert.equal(
    result.spaceSize,
    dims.reduce((acc, d) => acc * d.values.length, 1),
    'spaceSize',
  );
  assert.deepEqual(result.dimensions, dims.map((d) => d.key), 'dimension order');
  const seen = new Set();
  for (const c of result.cases) {
    const key = c.values.join(',');
    assert.ok(!seen.has(key), `duplicate tuple ${key}`);
    seen.add(key);
    let gain = 0;
    for (let i = 0; i < dims.length; i += 1) {
      for (let j = i + 1; j < dims.length; j += 1) {
        const p = `${i}:${c.values[i]}|${j}:${c.values[j]}`;
        if (pairs.has(p)) {
          pairs.delete(p);
          gain += 1;
        }
      }
    }
    assert.equal(gain, c.gain, `gain for ${key}`);
  }
  assert.equal(pairs.size, 0, 'all pairs covered');
  assert.equal(verifyCoverage(dims, result.cases).ok, true, 'core verifyCoverage');
}

test('independent coverage recomputation over deterministic inputs', () => {
  // Small deterministic LCG; fixed seed, no randomness in expectations.
  let s = 0x12345678;
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  const inputs = [
    'A:a|b\nB:c|d',
    'lang:en|zh|fr\nrole:admin|user\nstate:on|off',
    'A:0|1|2|3|4|5\nB:0|1|2|3|4|5',
    'w:1|2|3\nx:1|2|3\ny:1|2|3\nz:1|2|3',
    'A:a|b\nB:a|b\nC:a|b\nD:a|b\nE:a|b',
  ];
  for (let t = 0; t < 12; t += 1) {
    const nDims = 2 + Math.floor(next() * 4);
    const dims = [];
    let product = 1;
    for (let d = 0; d < nDims; d += 1) {
      const nVals = 2 + Math.floor(next() * 5);
      if (product * nVals > 2048) break;
      product *= nVals;
      const vals = Array.from({ length: nVals }, (_, i) => `v${i}`);
      dims.push(`${String.fromCharCode(65 + d)}:${vals.join('|')}`);
    }
    if (dims.length >= 2) inputs.push(dims.join('\n'));
  }
  for (const input of inputs) {
    const out = run({ dimensions: input });
    assert.equal(out.ok, true, input);
    independentCheck(input, out.result);
  }
});

test('validation: capacity, emptiness, row counts', () => {
  assert.deepEqual(run({ dimensions: '' }), {
    ok: false, error: { code: 'EMPTY', field: 'dimensions', row: null },
  });
  assert.deepEqual(run({ dimensions: '\n' }), {
    ok: false, error: { code: 'EMPTY', field: 'dimensions', row: null },
  });
  assert.deepEqual(run({ dimensions: 'A:a|b' }), {
    ok: false, error: { code: 'DIMENSION_COUNT', field: 'dimensions', row: null },
  });
  assert.deepEqual(run({ dimensions: 'A:a|b\nB:c|d\nC:e|f\nD:g|h\nE:i|j\nF:k|l' }), {
    ok: false, error: { code: 'ROW_LIMIT', field: 'dimensions', row: null },
  });
  // Over the 1,024 UTF-16-unit cap is refused before grammar checks.
  assert.deepEqual(run({ dimensions: `A:${'a'.repeat(500)}\nB:${'b'.repeat(520)}` }), {
    ok: false, error: { code: 'INPUT_LIMIT', field: 'dimensions', row: null },
  }); // 2+500+1+2+520 = 1,025 units
  // Exactly 1,024 units passes the capacity check (then fails grammar).
  assert.deepEqual(run({ dimensions: `A:${'a'.repeat(500)}\nB:${'b'.repeat(519)}` }), {
    ok: false, error: { code: 'DIMENSION', field: 'dimensions', row: 1 },
  }); // 2+500+1+2+519 = 1,024 units
});

test('validation: per-row format, counts, duplicates', () => {
  const bad = [
    ['A:a|b\nB', 'DIMENSION', 2],
    ['1A:a|b\nB:c|d', 'DIMENSION', 1],
    ['A:a|b \nB:c|d', 'DIMENSION', 1],
    ['A:a|\nB:c|d', 'DIMENSION', 1],
    ['A:a:b\nB:c|d', 'DIMENSION', 1],
    [`A:${'a'.repeat(25)}|b\nB:c|d`, 'DIMENSION', 1],
    [`${'A'.repeat(25)}:a|b\nB:c|d`, 'DIMENSION', 1],
    ['A:a|b\n\nB:c|d', 'DIMENSION', 2],
    ['A:a|b|c|d|e|f|g\nB:c|d', 'VALUE_COUNT', 1],
    ['A:a|a\nB:b|c', 'DUP_VALUE', 1],
    ['A:a|b\nA:c|d', 'DUP_KEY', 2],
    // Per-row order: a row's own duplicate value beats a later row's key.
    ['A:a|a\nA:c|d', 'DUP_VALUE', 1],
  ];
  for (const [input, code, row] of bad) {
    assert.deepEqual(run({ dimensions: input }), {
      ok: false, error: { code, field: 'dimensions', row },
    }, input);
  }
  // Exactly 6 values is legal; 7 is not.
  assert.equal(run({ dimensions: 'A:a|b|c|d|e|f\nB:g|h' }).ok, true);
  assert.equal(run({ dimensions: 'A:a|b|c|d|e|f|g\nB:h|i' }).error.code, 'VALUE_COUNT');
});

test('validation: product limit boundary', () => {
  assert.equal(run({ dimensions: 'A:a|b|c|d\nB:a|b|c|d\nC:a|b|c|d\nD:a|b|c|d\nE:a|b|c|d' }).ok, true); // 4^5 = 1024
  assert.deepEqual(run({ dimensions: 'A:a|b|c|d|e\nB:a|b|c|d|e\nC:a|b|c|d|e\nD:a|b|c|d|e\nE:a|b|c|d' }), {
    ok: false, error: { code: 'PRODUCT_LIMIT', field: 'dimensions', row: null },
  }); // 5^4 x 4 = 2500
});

test('validation: lone surrogates vs paired astral characters', () => {
  assert.deepEqual(run({ dimensions: 'A:\uD800|b\nB:c|d' }), {
    ok: false, error: { code: 'UNICODE', field: 'dimensions', row: null },
  });
  assert.deepEqual(run({ dimensions: 'A:b|\uD800\nB:c|d' }), {
    ok: false, error: { code: 'UNICODE', field: 'dimensions', row: null },
  });
  // A valid surrogate pair passes the UNICODE check, then fails grammar.
  assert.deepEqual(run({ dimensions: 'A:\u{1F600}|b\nB:c|d' }), {
    ok: false, error: { code: 'DIMENSION', field: 'dimensions', row: 1 },
  });
});

test('validation: schema — unknown, missing, wrong-typed, accessor, inherited', () => {
  const schema = { ok: false, error: { code: 'SCHEMA', field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run({}), schema);
  assert.deepEqual(run({ dimensions: 'A:a|b\nB:c|d', extra: 1 }), schema);
  assert.deepEqual(run({ dimensions: 42 }), schema);
  assert.deepEqual(run({ dimensions: undefined }), schema);
  const accessor = {};
  Object.defineProperty(accessor, 'dimensions', {
    enumerable: true,
    get() { return 'A:a|b\nB:c|d'; },
  });
  assert.deepEqual(run(accessor), schema);
  assert.deepEqual(run(Object.create({ dimensions: 'A:a|b\nB:c|d' })), schema);
});

test('malicious strings stay inert data', () => {
  const evil = '<script>alert(1)</script>';
  const out = run({ dimensions: `A:${evil}|b\nB:c|d` });
  assert.equal(out.ok, false);
  assert.equal(out.error.code, 'DIMENSION');
});

test('capacity: 5x5x5x4x4 mother set (2,000) runs; 6x6x6x5x2 (2,160) refused', () => {
  const big = 'A:a|b|c|d|e\nB:a|b|c|d|e\nC:a|b|c|d|e\nD:a|b|c|d\nE:a|b|c|d';
  const started = Date.now();
  const out = run({ dimensions: big });
  assert.equal(out.ok, true);
  assert.equal(out.result.spaceSize, 2000);
  independentCheck(big, out.result);
  assert.ok(Date.now() - started < 5000, 'greedy over 2,000 candidates finishes quickly');
  assert.deepEqual(run({ dimensions: 'A:a|b|c|d|e|f\nB:a|b|c|d|e|f\nC:a|b|c|d|e|f\nD:a|b|c|d|e\nE:a|b' }), {
    ok: false, error: { code: 'PRODUCT_LIMIT', field: 'dimensions', row: null },
  });
});
