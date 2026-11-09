// Literal cases from docs/specs/battery-swap-plan/fixtures.json
// (spec-battery-swap-plan-20261109, schemaVersion 1), copied verbatim.
// Expected values are the SPEC's own, never generated from the code under test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, validate } from '../public/js/core/solve.mjs';
import { createFlow } from '../public/js/core/flow.mjs';

const SOLVE_CASES = [
  {
    id: 'battery-swap-plan.gaps-and-shortage',
    input: {
      charged: 3,
      devices: [
        { name: 'A', runtime: 30, runs: [{ start: 0, end: 20 }, { start: 40, end: 65 }] },
        { name: 'B', runtime: 20, runs: [{ start: 10, end: 50 }] },
      ],
    },
    expected: {
      status: 'ok',
      result: {
        required: 4,
        extra: 1,
        unused: 0,
        firstMissing: 4,
        events: [
          { minute: 0, device: 'A', kind: 'load', pack: 1 },
          { minute: 10, device: 'B', kind: 'load', pack: 2 },
          { minute: 30, device: 'B', kind: 'swap', pack: 3 },
          { minute: 50, device: 'A', kind: 'swap', pack: null },
        ],
      },
    },
  },
  {
    id: 'battery-swap-plan.simultaneous',
    input: {
      charged: 1,
      devices: [
        { name: 'Z', runtime: 10, runs: [{ start: 5, end: 10 }] },
        { name: 'A', runtime: 10, runs: [{ start: 5, end: 10 }] },
      ],
    },
    expected: {
      status: 'ok',
      result: {
        required: 2,
        extra: 1,
        unused: 0,
        firstMissing: 2,
        events: [
          { minute: 5, device: 'Z', kind: 'load', pack: 1 },
          { minute: 5, device: 'A', kind: 'load', pack: null },
        ],
      },
    },
  },
  {
    id: 'battery-swap-plan.exact-end',
    input: {
      charged: 2,
      devices: [
        { name: 'A', runtime: 20, runs: [{ start: 1420, end: 1440 }] },
      ],
    },
    expected: {
      status: 'ok',
      result: {
        required: 1,
        extra: 0,
        unused: 1,
        firstMissing: null,
        events: [
          { minute: 1420, device: 'A', kind: 'load', pack: 1 },
        ],
      },
    },
  },
  {
    id: 'battery-swap-plan.swap-after-gap',
    input: {
      charged: 2,
      devices: [
        { name: 'A', runtime: 10, runs: [{ start: 20, end: 21 }, { start: 0, end: 10 }] },
      ],
    },
    expected: {
      status: 'ok',
      result: {
        required: 2,
        extra: 0,
        unused: 0,
        firstMissing: null,
        events: [
          { minute: 0, device: 'A', kind: 'load', pack: 1 },
          { minute: 20, device: 'A', kind: 'swap', pack: 2 },
        ],
      },
    },
  },
  {
    id: 'battery-swap-plan.zero-stock',
    input: {
      charged: 0,
      devices: [
        { name: 'A', runtime: 10, runs: [{ start: 0, end: 1 }] },
      ],
    },
    expected: {
      status: 'ok',
      result: {
        required: 1,
        extra: 1,
        unused: 0,
        firstMissing: 1,
        events: [
          { minute: 0, device: 'A', kind: 'load', pack: null },
        ],
      },
    },
  },
  {
    id: 'battery-swap-plan.overlap',
    input: {
      charged: 2,
      devices: [
        { name: 'A', runtime: 10, runs: [{ start: 0, end: 20 }, { start: 10, end: 30 }] },
      ],
    },
    expected: {
      status: 'error',
      error: { code: 'OVERLAP', path: '/devices/0/runs/1/start' },
    },
  },
];

for (const c of SOLVE_CASES) {
  test(`solve: ${c.id}`, () => {
    assert.deepStrictEqual(solve(c.input), c.expected);
  });
}

// Flow cases: drive the op list through the real state machine and compare
// {phase, result} only; a ready result is the current valid result.
function driveFlow(ops) {
  const flow = createFlow({ validate, solve });
  for (const op of ops) {
    if (op.type === 'edit') flow.edit(op.draft);
    else if (op.type === 'run') flow.run(op.runId);
    else if (op.type === 'settle') flow.settle(op.runId);
    else if (op.type === 'cancel') flow.cancel();
    else if (op.type === 'reset') flow.reset();
    else throw new Error(`unknown flow op ${op.type}`);
  }
  const s = flow.snapshot();
  return { phase: s.phase, result: s.result };
}

const GAPS_DRAFT = {
  charged: 3,
  devices: [
    { name: 'A', runtime: 30, runs: [{ start: 0, end: 20 }, { start: 40, end: 65 }] },
    { name: 'B', runtime: 20, runs: [{ start: 10, end: 50 }] },
  ],
};
const SIMULTANEOUS_DRAFT = {
  charged: 1,
  devices: [
    { name: 'Z', runtime: 10, runs: [{ start: 5, end: 10 }] },
    { name: 'A', runtime: 10, runs: [{ start: 5, end: 10 }] },
  ],
};

const FLOW_CASES = [
  {
    id: 'battery-swap-plan.dirty-after-edit',
    input: [
      { type: 'edit', draft: GAPS_DRAFT },
      { type: 'run', runId: 1 },
      { type: 'settle', runId: 1 },
      { type: 'edit', draft: SIMULTANEOUS_DRAFT },
    ],
    expected: { phase: 'dirty', result: null },
  },
  {
    id: 'battery-swap-plan.cancel-then-late',
    input: [
      { type: 'edit', draft: GAPS_DRAFT },
      { type: 'run', runId: 1 },
      { type: 'cancel' },
      { type: 'edit', draft: SIMULTANEOUS_DRAFT },
      { type: 'run', runId: 2 },
      { type: 'settle', runId: 2 },
      { type: 'settle', runId: 1 },
    ],
    expected: {
      phase: 'ready',
      result: {
        required: 2,
        extra: 1,
        unused: 0,
        firstMissing: 2,
        events: [
          { minute: 5, device: 'Z', kind: 'load', pack: 1 },
          { minute: 5, device: 'A', kind: 'load', pack: null },
        ],
      },
    },
  },
];

for (const c of FLOW_CASES) {
  test(`flow: ${c.id}`, () => {
    assert.deepStrictEqual(driveFlow(c.input), c.expected);
  });
}
