// Literal cases from docs/specs/card-sleeve-fit/fixtures.json
// (spec-card-sleeve-fit-20261109, schemaVersion 1), copied verbatim.
// Expected values are the SPEC's own, never generated from the code under test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, validate } from '../public/js/core/solve.mjs';
import { createFlow } from '../public/js/core/flow.mjs';

const REASSIGN = {
  minGap: 0,
  maxGap: 20,
  cards: [
    { name: 'A', w: 630, h: 880, qty: 1 },
    { name: 'B', w: 620, h: 880, qty: 1 },
  ],
  sleeves: [
    { name: 'S1', w: 630, h: 880, stock: 1 },
    { name: 'S2', w: 650, h: 880, stock: 1 },
  ],
};
const REASSIGN_RESULT = {
  covered: 2,
  cardRows: [
    { name: 'A', missing: 0, use: [{ sleeve: 'S2', qty: 1 }] },
    { name: 'B', missing: 0, use: [{ sleeve: 'S1', qty: 1 }] },
  ],
  sleeveRows: [
    { name: 'S1', remaining: 0 },
    { name: 'S2', remaining: 0 },
  ],
};

const SHORT_STOCK = {
  minGap: 5,
  maxGap: 25,
  cards: [{ name: 'A', w: 635, h: 880, qty: 3 }],
  sleeves: [
    { name: 'S1', w: 640, h: 905, stock: 2 },
    { name: 'S2', w: 630, h: 900, stock: 10 },
  ],
};
const SHORT_STOCK_RESULT = {
  covered: 2,
  cardRows: [
    { name: 'A', missing: 1, use: [{ sleeve: 'S1', qty: 2 }] },
  ],
  sleeveRows: [
    { name: 'S1', remaining: 0 },
    { name: 'S2', remaining: 10 },
  ],
};

const SOLVE_CASES = [
  {
    id: 'card-sleeve-fit.reassign',
    input: REASSIGN,
    expected: { status: 'ok', result: REASSIGN_RESULT },
  },
  {
    id: 'card-sleeve-fit.short-stock',
    input: SHORT_STOCK,
    expected: { status: 'ok', result: SHORT_STOCK_RESULT },
  },
  {
    id: 'card-sleeve-fit.exact-fit',
    input: {
      minGap: 0,
      maxGap: 0,
      cards: [{ name: 'A', w: 635, h: 880, qty: 1 }],
      sleeves: [{ name: 'S', w: 635, h: 880, stock: 2 }],
    },
    expected: {
      status: 'ok',
      result: {
        covered: 1,
        cardRows: [{ name: 'A', missing: 0, use: [{ sleeve: 'S', qty: 1 }] }],
        sleeveRows: [{ name: 'S', remaining: 1 }],
      },
    },
  },
  {
    id: 'card-sleeve-fit.empty-stock',
    input: {
      minGap: 0,
      maxGap: 20,
      cards: [{ name: 'A', w: 635, h: 880, qty: 2 }],
      sleeves: [{ name: 'S', w: 640, h: 890, stock: 0 }],
    },
    expected: {
      status: 'ok',
      result: {
        covered: 0,
        cardRows: [{ name: 'A', missing: 2, use: [] }],
        sleeveRows: [{ name: 'S', remaining: 0 }],
      },
    },
  },
  {
    id: 'card-sleeve-fit.gap-order',
    input: {
      minGap: 25,
      maxGap: 10,
      cards: [{ name: 'A', w: 635, h: 880, qty: 1 }],
      sleeves: [{ name: 'S', w: 640, h: 890, stock: 1 }],
    },
    expected: {
      status: 'error',
      error: { code: 'ORDER', path: '/maxGap' },
    },
  },
  {
    id: 'card-sleeve-fit.duplicate-sleeve',
    input: {
      minGap: 0,
      maxGap: 20,
      cards: [{ name: 'A', w: 635, h: 880, qty: 1 }],
      sleeves: [
        { name: 'S', w: 640, h: 890, stock: 1 },
        { name: 'S', w: 645, h: 890, stock: 2 },
      ],
    },
    expected: {
      status: 'error',
      error: { code: 'DUPLICATE', path: '/sleeves/1/name' },
    },
  },
];

for (const c of SOLVE_CASES) {
  test(c.id, () => {
    assert.deepStrictEqual(solve(c.input), c.expected);
  });
}

// --- Flow fixtures (controlled executor: edit/run/settle/cancel) ---

test('card-sleeve-fit.dirty-after-edit', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(REASSIGN);
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'ready');
  const after = flow.edit(SHORT_STOCK);
  assert.deepStrictEqual(
    { phase: after.phase, result: after.result },
    { phase: 'dirty', result: null },
  );
});

test('card-sleeve-fit.cancel-then-late', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(REASSIGN);
  flow.run(1);
  flow.cancel();
  flow.edit(SHORT_STOCK);
  flow.run(2);
  flow.settle(2);
  flow.settle(1); // late reply from the cancelled run: must be ignored
  const state = flow.snapshot();
  assert.deepStrictEqual(
    { phase: state.phase, result: state.result },
    { phase: 'ready', result: SHORT_STOCK_RESULT },
  );
});
