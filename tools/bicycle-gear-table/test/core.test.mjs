// Core tests for bicycle-gear-table.
// Expected values are copied verbatim from docs/specs/bicycle-gear-table/
// fixtures.json (solve cases) or hand-derived from the SPEC's own rules;
// never generated from the implementation under test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, formatTenths, parseIntegerField, EXAMPLE } from '../public/js/core/bicycle-gear-table.mjs';

const groupRatios = {
  wheelMm: 2100,
  cadence: 80,
  front: [40, 20],
  rear: [10, 20],
};

const twoCogs = {
  wheelMm: 2000,
  cadence: 60,
  front: [30],
  rear: [20, 30],
};

test('fixture bicycle-gear-table.group-ratios (verbatim)', () => {
  assert.deepStrictEqual(solve(groupRatios), {
    status: 'ok',
    result: {
      groups: [
        { ratio: [1, 1], combos: [[20, 20]], rollTenthsMm: 21000, speedTenthsKmh: 101 },
        { ratio: [2, 1], combos: [[40, 20], [20, 10]], rollTenthsMm: 42000, speedTenthsKmh: 202 },
        { ratio: [4, 1], combos: [[40, 10]], rollTenthsMm: 84000, speedTenthsKmh: 403 },
      ],
    },
  });
});

test('fixture bicycle-gear-table.two-cogs (verbatim)', () => {
  assert.deepStrictEqual(solve(twoCogs), {
    status: 'ok',
    result: {
      groups: [
        { ratio: [1, 1], combos: [[30, 30]], rollTenthsMm: 20000, speedTenthsKmh: 72 },
        { ratio: [3, 2], combos: [[30, 20]], rollTenthsMm: 30000, speedTenthsKmh: 108 },
      ],
    },
  });
});

test('fixture bicycle-gear-table.zero-rpm (verbatim)', () => {
  assert.deepStrictEqual(solve({ wheelMm: 2000, cadence: 0, front: [21], rear: [14] }), {
    status: 'ok',
    result: {
      groups: [
        { ratio: [3, 2], combos: [[21, 14]], rollTenthsMm: 30000, speedTenthsKmh: 0 },
      ],
    },
  });
});

test('fixture bicycle-gear-table.half-up (verbatim)', () => {
  assert.deepStrictEqual(solve({ wheelMm: 1250, cadence: 10, front: [1], rear: [1] }), {
    status: 'ok',
    result: {
      groups: [
        { ratio: [1, 1], combos: [[1, 1]], rollTenthsMm: 12500, speedTenthsKmh: 8 },
      ],
    },
  });
});

test('fixture bicycle-gear-table.sub-unity (verbatim)', () => {
  assert.deepStrictEqual(solve({ wheelMm: 1000, cadence: 50, front: [1], rear: [3] }), {
    status: 'ok',
    result: {
      groups: [
        { ratio: [1, 3], combos: [[1, 3]], rollTenthsMm: 3333, speedTenthsKmh: 10 },
      ],
    },
  });
});

test('fixture bicycle-gear-table.duplicate-tooth (verbatim)', () => {
  assert.deepStrictEqual(
    solve({ wheelMm: 2100, cadence: 80, front: [40, 40], rear: [10, 20] }),
    { status: 'error', error: { code: 'DUPLICATE', path: '/front/1' } },
  );
});

test('EXAMPLE equals the group-ratios fixture input', () => {
  assert.deepStrictEqual(EXAMPLE, groupRatios);
});

test('combos inside a group follow front-index then rear-index order', () => {
  // Same ratios as group-ratios, but the front order is flipped, so the
  // ratio-2 group must list [20,10] before [40,20].
  assert.deepStrictEqual(
    solve({ wheelMm: 2100, cadence: 80, front: [20, 40], rear: [10, 20] }),
    {
      status: 'ok',
      result: {
        groups: [
          { ratio: [1, 1], combos: [[20, 20]], rollTenthsMm: 21000, speedTenthsKmh: 101 },
          { ratio: [2, 1], combos: [[20, 10], [40, 20]], rollTenthsMm: 42000, speedTenthsKmh: 202 },
          { ratio: [4, 1], combos: [[40, 10]], rollTenthsMm: 84000, speedTenthsKmh: 403 },
        ],
      },
    },
  );
});

test('groups sort by the exact ratio, not by any display string', () => {
  // 50/40 = 5/4 sorts before 50/10 = 5/1; rollout 2500 mm and 10000 mm,
  // speeds 9.0 and 36.0 km/h at 60 rpm (hand-derived).
  assert.deepStrictEqual(
    solve({ wheelMm: 2000, cadence: 60, front: [50], rear: [40, 10] }),
    {
      status: 'ok',
      result: {
        groups: [
          { ratio: [5, 4], combos: [[50, 40]], rollTenthsMm: 25000, speedTenthsKmh: 90 },
          { ratio: [5, 1], combos: [[50, 10]], rollTenthsMm: 100000, speedTenthsKmh: 360 },
        ],
      },
    },
  );
});

test('half-up rounding on a non-fixture fraction: 1/7', () => {
  // Rollout 1000/7 = 142.857... mm -> 142.9 (1429 tenths).
  // Speed 1000*1*1*60/(7*1_000_000) = 0.00857... km/h -> 0.0 (0 tenths).
  assert.deepStrictEqual(
    solve({ wheelMm: 1000, cadence: 1, front: [1], rear: [7] }),
    {
      status: 'ok',
      result: {
        groups: [
          { ratio: [1, 7], combos: [[1, 7]], rollTenthsMm: 1429, speedTenthsKmh: 0 },
        ],
      },
    },
  );
});

test('maximum bounds: the SPEC speed numerator 10,800,000,000', () => {
  // wheelMm 5000, ratio 120/1, cadence 300: rollout 600000 mm, speed
  // 5000*120*300*60/1_000_000 = 10800 km/h.
  assert.deepStrictEqual(
    solve({ wheelMm: 5000, cadence: 300, front: [120], rear: [1] }),
    {
      status: 'ok',
      result: {
        groups: [
          { ratio: [120, 1], combos: [[120, 1]], rollTenthsMm: 6000000, speedTenthsKmh: 108000 },
        ],
      },
    },
  );
});

test('a full 3x16 grid gives 48 pairs and groups every equal ratio', () => {
  const out = solve({
    wheelMm: 2000,
    cadence: 90,
    front: [30, 40, 50],
    rear: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
  });
  assert.equal(out.status, 'ok');
  const combos = out.result.groups.flatMap((g) => g.combos);
  assert.equal(combos.length, 48);
  // 40/20 and 30/15 share ratio 2/1 and sit in one group, front-index order.
  const two = out.result.groups.find((g) => g.ratio[0] === 2 && g.ratio[1] === 1);
  assert.deepStrictEqual(two.combos, [[30, 15], [40, 20], [50, 25]]);
  // Groups are strictly ascending by exact ratio.
  for (let i = 1; i < out.result.groups.length; i++) {
    const a = out.result.groups[i - 1].ratio;
    const b = out.result.groups[i].ratio;
    assert.ok(BigInt(a[0]) * BigInt(b[1]) < BigInt(b[0]) * BigInt(a[1]));
  }
});

test('SIZE: over the 65536-byte input cap, at the root path', () => {
  const big = { ...groupRatios, pad: 'x'.repeat(70000) };
  assert.deepStrictEqual(solve(big), { status: 'error', error: { code: 'SIZE', path: '' } });
});

test('SIZE boundary: exactly 65536 bytes is not SIZE (the next error wins)', () => {
  const base = { ...groupRatios };
  const overhead = JSON.stringify({ ...base, pad: '' }).length;
  const exact = { ...base, pad: 'x'.repeat(65536 - overhead) };
  assert.equal(new TextEncoder().encode(JSON.stringify(exact)).length, 65536);
  // Not SIZE; the unknown key is the first error after the size check.
  assert.deepStrictEqual(solve(exact), { status: 'error', error: { code: 'SHAPE', path: '' } });
  const oneMore = { ...base, pad: 'x'.repeat(65536 - overhead + 1) };
  assert.deepStrictEqual(solve(oneMore), { status: 'error', error: { code: 'SIZE', path: '' } });
});

test('unknown key -> SHAPE at the containing object; missing key -> SHAPE at the key path', () => {
  assert.deepStrictEqual(
    solve({ ...groupRatios, extra: 1 }),
    { status: 'error', error: { code: 'SHAPE', path: '' } },
  );
  const { cadence, ...noCadence } = groupRatios;
  assert.deepStrictEqual(
    solve(noCadence),
    { status: 'error', error: { code: 'SHAPE', path: '/cadence' } },
  );
});

test('non-object root -> TYPE at the root path', () => {
  assert.deepStrictEqual(solve(null), { status: 'error', error: { code: 'TYPE', path: '' } });
  assert.deepStrictEqual(solve([1, 2]), { status: 'error', error: { code: 'TYPE', path: '' } });
  assert.deepStrictEqual(solve('x'), { status: 'error', error: { code: 'TYPE', path: '' } });
});

test('TYPE: strings, fractions and -0 are not integers', () => {
  assert.deepStrictEqual(
    solve({ ...groupRatios, wheelMm: '2100' }),
    { status: 'error', error: { code: 'TYPE', path: '/wheelMm' } },
  );
  assert.deepStrictEqual(
    solve({ ...groupRatios, wheelMm: 2100.5 }),
    { status: 'error', error: { code: 'TYPE', path: '/wheelMm' } },
  );
  assert.deepStrictEqual(
    solve({ ...groupRatios, wheelMm: -0 }),
    { status: 'error', error: { code: 'TYPE', path: '/wheelMm' } },
  );
  assert.deepStrictEqual(
    solve({ ...groupRatios, front: ['40', 20] }),
    { status: 'error', error: { code: 'TYPE', path: '/front/0' } },
  );
});

test('RANGE: every bound, both sides, with fixed paths', () => {
  const cases = [
    [{ ...groupRatios, wheelMm: 99 }, '/wheelMm'],
    [{ ...groupRatios, wheelMm: 5001 }, '/wheelMm'],
    [{ ...groupRatios, cadence: 301 }, '/cadence'],
    [{ ...groupRatios, cadence: -1 }, '/cadence'],
    [{ ...groupRatios, front: [0] }, '/front/0'],
    [{ ...groupRatios, front: [121] }, '/front/0'],
    [{ ...groupRatios, rear: [0] }, '/rear/0'],
    [{ ...groupRatios, rear: [121] }, '/rear/0'],
    [{ ...groupRatios, front: [] }, '/front'],
    [{ ...groupRatios, front: [10, 20, 30, 40] }, '/front'],
    [{ ...groupRatios, rear: [] }, '/rear'],
    [{ ...groupRatios, rear: Array.from({ length: 17 }, (_, i) => i + 1) }, '/rear'],
  ];
  for (const [input, path] of cases) {
    assert.deepStrictEqual(solve(input), { status: 'error', error: { code: 'RANGE', path } });
  }
  // Boundary values themselves are legal.
  assert.equal(solve({ wheelMm: 100, cadence: 0, front: [1], rear: [120] }).status, 'ok');
  assert.equal(solve({ wheelMm: 5000, cadence: 300, front: [120], rear: [1] }).status, 'ok');
});

test('DUPLICATE in the rear array points at the second occurrence', () => {
  assert.deepStrictEqual(
    solve({ ...groupRatios, rear: [10, 20, 10] }),
    { status: 'error', error: { code: 'DUPLICATE', path: '/rear/2' } },
  );
});

test('same tooth front and rear is legal and gives ratio 1', () => {
  const out = solve({ wheelMm: 2000, cadence: 60, front: [30], rear: [30] });
  assert.deepStrictEqual(out.result.groups[0].ratio, [1, 1]);
});

test('field order: wheelMm is reported before a later bad field', () => {
  assert.deepStrictEqual(
    solve({ wheelMm: 99, cadence: 301, front: [40, 40], rear: [10] }),
    { status: 'error', error: { code: 'RANGE', path: '/wheelMm' } },
  );
  assert.deepStrictEqual(
    solve({ wheelMm: 2100, cadence: 80, front: [40, 40], rear: [200] }),
    { status: 'error', error: { code: 'DUPLICATE', path: '/front/1' } },
  );
});

test('parseIntegerField: form text rules', () => {
  assert.deepStrictEqual(parseIntegerField('0', 0, 300, '/cadence'), { value: 0 });
  assert.deepStrictEqual(parseIntegerField('120', 1, 120, '/front/0'), { value: 120 });
  for (const bad of ['', ' 40', '40 ', '040', '４０', '1e3', '+40', '-0', '-5', '40.5', '1234567890123']) {
    assert.deepStrictEqual(
      parseIntegerField(bad, 1, 120, '/front/0'),
      { error: { code: 'TYPE', path: '/front/0' } },
      bad,
    );
  }
  assert.deepStrictEqual(
    parseIntegerField('121', 1, 120, '/front/0'),
    { error: { code: 'RANGE', path: '/front/0' } },
  );
});

test('formatTenths formats one decimal place without re-rounding', () => {
  assert.equal(formatTenths(202, 'zh-Hant'), '20.2');
  assert.equal(formatTenths(0, 'en'), '0.0');
  assert.equal(formatTenths(3333, 'en'), '333.3');
  assert.equal(formatTenths(108000, 'en'), '10,800.0');
});
