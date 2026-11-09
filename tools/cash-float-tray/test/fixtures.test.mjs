// Literal cases from docs/specs/cash-float-tray/fixtures.json
// (spec-cash-float-tray-20261109, schemaVersion 1), copied verbatim.
// Expected values are the SPEC's own, never generated from the code under test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, validate } from '../public/js/core/solve.mjs';
import { createFlow } from '../public/js/core/flow.mjs';

const SOLVE_CASES = [
  {
    id: 'cash-float-tray.exact',
    input: {
      targetMinor: 10,
      denominations: [
        { valueMinor: 6, count: 1 },
        { valueMinor: 4, count: 2 },
        { valueMinor: 3, count: 3 },
      ],
    },
    expected: {
      status: 'ok',
      result: {
        totalMinor: 23, keptMinor: 10, removedMinor: 13, shortfallMinor: 0,
        rows: [
          { valueMinor: 6, kept: 1, removed: 0 },
          { valueMinor: 4, kept: 1, removed: 1 },
          { valueMinor: 3, kept: 0, removed: 3 },
        ],
      },
    },
  },
  {
    id: 'cash-float-tray.non-greedy',
    input: {
      targetMinor: 9,
      denominations: [
        { valueMinor: 4, count: 1 },
        { valueMinor: 8, count: 1 },
        { valueMinor: 5, count: 1 },
      ],
    },
    expected: {
      status: 'ok',
      result: {
        totalMinor: 17, keptMinor: 9, removedMinor: 8, shortfallMinor: 0,
        rows: [
          { valueMinor: 8, kept: 0, removed: 1 },
          { valueMinor: 5, kept: 1, removed: 0 },
          { valueMinor: 4, kept: 1, removed: 0 },
        ],
      },
    },
  },
  {
    id: 'cash-float-tray.tie',
    input: {
      targetMinor: 8,
      denominations: [
        { valueMinor: 3, count: 1 },
        { valueMinor: 5, count: 1 },
        { valueMinor: 4, count: 2 },
      ],
    },
    expected: {
      status: 'ok',
      result: {
        totalMinor: 16, keptMinor: 8, removedMinor: 8, shortfallMinor: 0,
        rows: [
          { valueMinor: 5, kept: 1, removed: 0 },
          { valueMinor: 4, kept: 0, removed: 2 },
          { valueMinor: 3, kept: 1, removed: 0 },
        ],
      },
    },
  },
  {
    id: 'cash-float-tray.zero-target',
    input: {
      targetMinor: 0,
      denominations: [
        { valueMinor: 5, count: 3 },
        { valueMinor: 1, count: 0 },
      ],
    },
    expected: {
      status: 'ok',
      result: {
        totalMinor: 15, keptMinor: 0, removedMinor: 15, shortfallMinor: 0,
        rows: [
          { valueMinor: 5, kept: 0, removed: 3 },
          { valueMinor: 1, kept: 0, removed: 0 },
        ],
      },
    },
  },
  {
    id: 'cash-float-tray.inexact',
    input: {
      targetMinor: 5,
      denominations: [
        { valueMinor: 4, count: 2 },
        { valueMinor: 3, count: 1 },
      ],
    },
    expected: {
      status: 'ok',
      result: {
        totalMinor: 11, keptMinor: 4, removedMinor: 7, shortfallMinor: 1,
        rows: [
          { valueMinor: 4, kept: 1, removed: 1 },
          { valueMinor: 3, kept: 0, removed: 1 },
        ],
      },
    },
  },
  {
    id: 'cash-float-tray.duplicate',
    input: {
      targetMinor: 5,
      denominations: [
        { valueMinor: 5, count: 1 },
        { valueMinor: 5, count: 2 },
      ],
    },
    expected: {
      status: 'error',
      error: { code: 'DUPLICATE', path: '/denominations/1/valueMinor' },
    },
  },
];

for (const c of SOLVE_CASES) {
  test(c.id, () => {
    assert.deepStrictEqual(solve(c.input), c.expected);
  });
}

// --- Flow fixtures (controlled executor: edit/run/settle/cancel) ---

const EXACT = SOLVE_CASES[0].input;
const NON_GREEDY = SOLVE_CASES[1].input;
const NON_GREEDY_RESULT = SOLVE_CASES[1].expected.result;

test('cash-float-tray.dirty-after-edit', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(EXACT);
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'ready');
  const after = flow.edit(NON_GREEDY);
  assert.deepStrictEqual(
    { phase: after.phase, result: after.result },
    { phase: 'dirty', result: null },
  );
});

test('cash-float-tray.cancel-then-late', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(EXACT);
  flow.run(1);
  flow.cancel();
  flow.edit(NON_GREEDY);
  flow.run(2);
  flow.settle(2);
  flow.settle(1); // late reply from the cancelled run: must be ignored
  const state = flow.snapshot();
  assert.deepStrictEqual(
    { phase: state.phase, result: state.result },
    { phase: 'ready', result: NON_GREEDY_RESULT },
  );
});
