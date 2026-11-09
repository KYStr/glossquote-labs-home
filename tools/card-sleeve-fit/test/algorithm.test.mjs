// Algorithm properties for Card Sleeve Stock Fit (SPEC implementation).
// Expected values are hand-derived from the SPEC's rules, never from the
// implementation's output.
import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, solveDetailed, solveSteps } from '../public/js/core/solve.mjs';

function compatible(card, sleeve, minGap, maxGap) {
  const dw = sleeve.w - card.w;
  const dh = sleeve.h - card.h;
  return dw >= minGap && dw <= maxGap && dh >= minGap && dh <= maxGap;
}

test('three-card reassign chain: A moves to S2 so B takes S1, C stays short', () => {
  const input = {
    minGap: 0,
    maxGap: 20,
    cards: [
      { name: 'A', w: 630, h: 880, qty: 1 },
      { name: 'B', w: 620, h: 880, qty: 1 },
      { name: 'C', w: 615, h: 880, qty: 1 },
    ],
    sleeves: [
      { name: 'S1', w: 630, h: 880, stock: 1 },
      { name: 'S2', w: 650, h: 880, stock: 1 },
    ],
  };
  assert.deepStrictEqual(solve(input), {
    status: 'ok',
    result: {
      covered: 2,
      cardRows: [
        { name: 'A', missing: 0, use: [{ sleeve: 'S2', qty: 1 }] },
        { name: 'B', missing: 0, use: [{ sleeve: 'S1', qty: 1 }] },
        { name: 'C', missing: 1, use: [] },
      ],
      sleeveRows: [
        { name: 'S1', remaining: 0 },
        { name: 'S2', remaining: 0 },
      ],
    },
  });
});

test('gap boundaries: exactly minGap / maxGap on each axis are compatible', () => {
  const atBounds = {
    minGap: 5,
    maxGap: 25,
    cards: [{ name: 'A', w: 635, h: 880, qty: 1 }],
    sleeves: [{ name: 'S', w: 640, h: 905, stock: 1 }],
  };
  assert.equal(solve(atBounds).result.covered, 1);
  // One axis one tenth below minGap -> incompatible.
  const belowMin = {
    minGap: 5,
    maxGap: 25,
    cards: [{ name: 'A', w: 635, h: 880, qty: 1 }],
    sleeves: [{ name: 'S', w: 639, h: 905, stock: 1 }],
  };
  assert.equal(solve(belowMin).result.covered, 0);
  // One axis one tenth above maxGap -> incompatible.
  const aboveMax = {
    minGap: 5,
    maxGap: 25,
    cards: [{ name: 'A', w: 635, h: 880, qty: 1 }],
    sleeves: [{ name: 'S', w: 640, h: 906, stock: 1 }],
  };
  assert.equal(solve(aboveMax).result.covered, 0);
});

test('no compatible sleeve: covered 0, full missing, full stock remains', () => {
  const input = {
    minGap: 0,
    maxGap: 20,
    cards: [{ name: 'A', w: 635, h: 880, qty: 4 }],
    sleeves: [{ name: 'S', w: 700, h: 900, stock: 9 }],
  };
  assert.deepStrictEqual(solve(input), {
    status: 'ok',
    result: {
      covered: 0,
      cardRows: [{ name: 'A', missing: 4, use: [] }],
      sleeveRows: [{ name: 'S', remaining: 9 }],
    },
  });
});

test('conservation + compatibility on a mixed case', () => {
  const input = {
    minGap: 0,
    maxGap: 30,
    cards: [
      { name: 'A', w: 630, h: 880, qty: 10 },
      { name: 'B', w: 620, h: 870, qty: 7 },
      { name: 'C', w: 600, h: 860, qty: 3 },
    ],
    sleeves: [
      { name: 'S1', w: 635, h: 885, stock: 6 },
      { name: 'S2', w: 650, h: 900, stock: 9 },
      { name: 'S3', w: 610, h: 870, stock: 4 },
    ],
  };
  const { result } = solve(input);
  const totalQty = input.cards.reduce((s, c) => s + c.qty, 0);
  const totalStock = input.sleeves.reduce((s, v) => s + v.stock, 0);
  const used = result.cardRows.reduce(
    (s, r) => s + r.use.reduce((a, u) => a + u.qty, 0), 0);
  const missing = result.cardRows.reduce((s, r) => s + r.missing, 0);
  const remaining = result.sleeveRows.reduce((s, r) => s + r.remaining, 0);
  assert.equal(used, result.covered);
  assert.equal(used + missing, totalQty);
  assert.equal(remaining, totalStock - result.covered);
  for (const row of result.cardRows) {
    const card = input.cards.find((c) => c.name === row.name);
    assert.equal(row.missing + row.use.reduce((s, u) => s + u.qty, 0), card.qty);
    for (const u of row.use) {
      const sleeve = input.sleeves.find((v) => v.name === u.sleeve);
      assert.ok(compatible(card, sleeve, input.minGap, input.maxGap),
        `${card.name} must only use a compatible sleeve, got ${u.sleeve}`);
    }
  }
});

test('max case: 8x500 cards, 8x1000 sleeves, all compatible -> 4000 covered within bounds', () => {
  const input = {
    minGap: 0,
    maxGap: 20,
    cards: Array.from({ length: 8 }, (_, i) => ({ name: `C${i}`, w: 635, h: 880, qty: 500 })),
    sleeves: Array.from({ length: 8 }, (_, i) => ({ name: `S${i}`, w: 640, h: 890, stock: 1000 })),
  };
  const { reply, stats } = solveDetailed(input);
  assert.equal(reply.result.covered, 4000);
  assert.equal(reply.result.cardRows.every((r) => r.missing === 0), true);
  assert.ok(stats.nodes <= 18, `nodes ${stats.nodes} must be <= 18`);
  assert.ok(stats.arcs <= 160, `arcs ${stats.arcs} must be <= 160`);
  assert.ok(stats.augmentations <= 4000, `augmentations ${stats.augmentations} must be <= 4000`);
  assert.equal(stats.nodes, 18);
  assert.equal(stats.arcs, 160);
});

test('solve is deterministic and does not mutate its input', () => {
  const input = {
    minGap: 0,
    maxGap: 20,
    cards: [
      { name: 'A', w: 630, h: 880, qty: 2 },
      { name: 'B', w: 620, h: 880, qty: 1 },
    ],
    sleeves: [
      { name: 'S1', w: 630, h: 880, stock: 1 },
      { name: 'S2', w: 650, h: 880, stock: 2 },
    ],
  };
  const before = JSON.stringify(input);
  const first = solve(input);
  const second = solve(input);
  assert.deepStrictEqual(first, second);
  assert.equal(JSON.stringify(input), before);
  const frozen = JSON.parse(before);
  Object.freeze(frozen);
  Object.freeze(frozen.cards);
  Object.freeze(frozen.sleeves);
  assert.deepStrictEqual(solve(frozen), first);
});

test('batched solver: progress yields are multiples of 4096 and the reply matches solve()', () => {
  const input = {
    minGap: 0,
    maxGap: 20,
    cards: Array.from({ length: 8 }, (_, i) => ({ name: `C${i}`, w: 635, h: 880, qty: 500 })),
    sleeves: Array.from({ length: 8 }, (_, i) => ({ name: `S${i}`, w: 640, h: 890, stock: 1000 })),
  };
  const { stats } = solveDetailed(input);
  const iterator = solveSteps(input);
  const yields = [];
  let out = iterator.next();
  while (!out.done) {
    yields.push(out.value);
    out = iterator.next();
  }
  const { stats: _ignored, ...reply } = out.value;
  assert.deepStrictEqual(reply, solve(input));
  for (const y of yields) {
    assert.equal(y.type, 'progress');
    assert.equal(y.steps % 4096, 0, `progress steps ${y.steps} must be a multiple of 4096`);
  }
  const stepsSeen = yields.map((y) => y.steps);
  assert.deepStrictEqual(stepsSeen, [...stepsSeen].sort((a, b) => a - b));
  assert.equal(yields.length, Math.floor(stats.steps / 4096));
  // The generator can be abandoned mid-run without side effects: creating
  // one and never driving it changes nothing for a later solve().
  solveSteps(input);
  assert.deepStrictEqual(solve(input), reply);
});

test('batched solver on a small input yields no progress and returns the reply', () => {
  const input = {
    minGap: 0,
    maxGap: 20,
    cards: [{ name: 'A', w: 630, h: 880, qty: 1 }],
    sleeves: [{ name: 'S', w: 640, h: 890, stock: 1 }],
  };
  const iterator = solveSteps(input);
  const out = iterator.next();
  assert.equal(out.done, true);
  const { stats: _ignored, ...reply } = out.value;
  assert.deepStrictEqual(reply, solve(input));
});
