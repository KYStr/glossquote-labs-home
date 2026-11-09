// Algorithm properties, hand-derived from SPEC implementation rules.
// Expected values are computed by hand here, never from the implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { solve } from '../public/js/core/solve.mjs';

function rowsOf(input) {
  const reply = solve(input);
  assert.equal(reply.status, 'ok');
  return reply.result;
}

test('single large note can be the best reachable sum below target', () => {
  // target 10: 9 alone (9) vs 6+5 (11, over) vs 5 (5) vs 6 (6).
  // Best reachable <= 10 is 9, shortfall 1.
  const r = rowsOf({
    targetMinor: 10,
    denominations: [
      { valueMinor: 9, count: 1 },
      { valueMinor: 6, count: 1 },
      { valueMinor: 5, count: 1 },
    ],
  });
  assert.equal(r.keptMinor, 9);
  assert.equal(r.shortfallMinor, 1);
  assert.deepStrictEqual(r.rows, [
    { valueMinor: 9, kept: 1, removed: 0 },
    { valueMinor: 6, kept: 0, removed: 1 },
    { valueMinor: 5, kept: 0, removed: 1 },
  ]);
});

test('tie-break by higher denomination: 6+4 beats 5+5 at target 10', () => {
  const r = rowsOf({
    targetMinor: 10,
    denominations: [
      { valueMinor: 5, count: 2 },
      { valueMinor: 6, count: 1 },
      { valueMinor: 4, count: 1 },
    ],
  });
  assert.equal(r.keptMinor, 10);
  assert.deepStrictEqual(r.rows, [
    { valueMinor: 6, kept: 1, removed: 0 },
    { valueMinor: 5, kept: 0, removed: 2 },
    { valueMinor: 4, kept: 1, removed: 0 },
  ]);
});

test('fewest pieces wins over more pieces at the same kept amount', () => {
  // target 12: 6+6 (2 pieces) vs 4+4+4 (3 pieces) vs 3x4.
  const r = rowsOf({
    targetMinor: 12,
    denominations: [
      { valueMinor: 6, count: 2 },
      { valueMinor: 4, count: 3 },
    ],
  });
  assert.equal(r.keptMinor, 12);
  assert.deepStrictEqual(r.rows, [
    { valueMinor: 6, kept: 2, removed: 0 },
    { valueMinor: 4, kept: 0, removed: 3 },
  ]);
});

test('count caps are respected: 3x99 can only keep 9 of target 10', () => {
  const r = rowsOf({
    targetMinor: 10,
    denominations: [{ valueMinor: 3, count: 99 }],
  });
  assert.deepStrictEqual(r, {
    totalMinor: 297, keptMinor: 9, removedMinor: 288, shortfallMinor: 1,
    rows: [{ valueMinor: 3, kept: 3, removed: 96 }],
  });
});

test('maximum target 10000 with 100x99 and 1x99 reaches 9999', () => {
  const r = rowsOf({
    targetMinor: 10000,
    denominations: [
      { valueMinor: 100, count: 99 },
      { valueMinor: 1, count: 99 },
    ],
  });
  assert.equal(r.totalMinor, 9999);
  assert.equal(r.keptMinor, 9999);
  assert.equal(r.shortfallMinor, 1);
});

test('input order does not matter; rows are always descending by value', () => {
  const a = rowsOf({
    targetMinor: 10,
    denominations: [
      { valueMinor: 3, count: 3 },
      { valueMinor: 6, count: 1 },
      { valueMinor: 4, count: 2 },
    ],
  });
  const b = rowsOf({
    targetMinor: 10,
    denominations: [
      { valueMinor: 4, count: 2 },
      { valueMinor: 3, count: 3 },
      { valueMinor: 6, count: 1 },
    ],
  });
  assert.deepStrictEqual(a, b);
  assert.deepStrictEqual(a.rows.map((r) => r.valueMinor), [6, 4, 3]);
});

test('conservation + reachability sweep over deterministic pseudo-random inputs', () => {
  // Tiny LCG so the sweep is reproducible without Math.random.
  let seed = 20261109;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed;
  };
  for (let iter = 0; iter < 300; iter += 1) {
    const n = 1 + (next() % 8);
    const values = new Set();
    const denominations = [];
    while (denominations.length < n) {
      const v = 1 + (next() % 50);
      if (values.has(v)) continue;
      values.add(v);
      denominations.push({ valueMinor: v, count: next() % 10 });
    }
    const target = next() % 500;
    const r = rowsOf({ targetMinor: target, denominations });
    // Conservation: total = kept + removed, shortfall = target - kept.
    assert.equal(r.totalMinor, r.keptMinor + r.removedMinor);
    assert.equal(r.shortfallMinor, target - r.keptMinor);
    assert.ok(r.keptMinor >= 0 && r.keptMinor <= target);
    assert.ok(r.shortfallMinor >= 0);
    // Per-row conservation and bounds.
    const sorted = [...denominations].sort((x, y) => y.valueMinor - x.valueMinor);
    for (let i = 0; i < sorted.length; i += 1) {
      assert.equal(r.rows[i].valueMinor, sorted[i].valueMinor);
      assert.equal(r.rows[i].kept + r.rows[i].removed, sorted[i].count);
      assert.ok(r.rows[i].kept >= 0 && r.rows[i].kept <= sorted[i].count);
    }
    // Kept sum matches the kept rows.
    const keptSum = r.rows.reduce((s, row) => s + row.valueMinor * row.kept, 0);
    assert.equal(keptSum, r.keptMinor);
  }
});

test('worst-case size (8 denoms, target 10000) still solves exactly', () => {
  const denominations = [
    { valueMinor: 1000, count: 99 },
    { valueMinor: 500, count: 99 },
    { valueMinor: 100, count: 99 },
    { valueMinor: 50, count: 99 },
    { valueMinor: 20, count: 99 },
    { valueMinor: 10, count: 99 },
    { valueMinor: 5, count: 99 },
    { valueMinor: 1, count: 99 },
  ];
  const r = rowsOf({ targetMinor: 10000, denominations });
  // 1000x10 exactly reaches 10000 with 10 pieces; nothing beats 10 pieces
  // at the full target (any 1000-heavy mix needs >= 10 pieces).
  assert.equal(r.keptMinor, 10000);
  assert.equal(r.shortfallMinor, 0);
  assert.equal(r.rows[0].kept, 10);
});
