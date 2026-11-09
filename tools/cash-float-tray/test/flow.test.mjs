// Run-state machine transitions (SPEC userFlow), beyond the literal flow
// fixtures: busy re-submit ignored, wrong-runId settle ignored, cancel,
// reset, error on invalid draft, fail() for form-level errors, edit
// invalidating a pending run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, validate } from '../public/js/core/solve.mjs';
import { createFlow } from '../public/js/core/flow.mjs';

const EXACT = {
  targetMinor: 10,
  denominations: [
    { valueMinor: 6, count: 1 },
    { valueMinor: 4, count: 2 },
    { valueMinor: 3, count: 3 },
  ],
};
const NON_GREEDY = {
  targetMinor: 9,
  denominations: [
    { valueMinor: 4, count: 1 },
    { valueMinor: 8, count: 1 },
    { valueMinor: 5, count: 1 },
  ],
};

test('initial state is empty; edit makes it dirty and clears any result', () => {
  const flow = createFlow({ validate, solve });
  assert.deepStrictEqual(flow.snapshot(), {
    phase: 'empty', draft: null, result: null, error: null, activeRunId: null,
  });
  flow.edit(EXACT);
  assert.equal(flow.snapshot().phase, 'dirty');
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'ready');
  assert.notEqual(flow.snapshot().result, null);
  const after = flow.edit(null);
  assert.deepStrictEqual(
    { phase: after.phase, result: after.result, error: after.error },
    { phase: 'empty', result: null, error: null },
  );
});

test('run while busy is ignored; the first runId stays active', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(EXACT);
  flow.run(1);
  const ignored = flow.run(2);
  assert.equal(ignored.phase, 'busy');
  assert.equal(ignored.activeRunId, 1);
  flow.settle(2); // wrong runId: ignored
  assert.equal(flow.snapshot().phase, 'busy');
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'ready');
  assert.equal(flow.snapshot().result.keptMinor, 10);
});

test('cancel from busy returns to dirty and keeps the draft', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(EXACT);
  flow.run(1);
  const after = flow.cancel();
  assert.equal(after.phase, 'dirty');
  assert.equal(after.activeRunId, null);
  assert.deepStrictEqual(after.draft, EXACT);
  assert.equal(after.result, null);
  flow.settle(1); // settle after cancel: ignored
  assert.equal(flow.snapshot().phase, 'dirty');
  // The same draft can run again under a new runId.
  flow.run(2);
  flow.settle(2);
  assert.equal(flow.snapshot().phase, 'ready');
});

test('cancel when not busy is a no-op', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(EXACT);
  assert.equal(flow.cancel().phase, 'dirty');
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.cancel().phase, 'ready');
});

test('invalid draft at run goes to error and keeps the draft', () => {
  const flow = createFlow({ validate, solve });
  const bad = {
    targetMinor: 5,
    denominations: [
      { valueMinor: 5, count: 1 },
      { valueMinor: 5, count: 1 },
    ],
  };
  flow.edit(bad);
  const after = flow.run(1);
  assert.equal(after.phase, 'error');
  assert.deepStrictEqual(after.error, { code: 'DUPLICATE', path: '/denominations/1/valueMinor' });
  assert.deepStrictEqual(after.draft, bad);
  // Fixing the draft returns to dirty.
  flow.edit(EXACT);
  assert.equal(flow.snapshot().phase, 'dirty');
  assert.equal(flow.snapshot().error, null);
});

test('run with no draft is an error; settle with no active run is ignored', () => {
  const flow = createFlow({ validate, solve });
  const after = flow.run(1);
  assert.equal(after.phase, 'error');
  assert.deepStrictEqual(after.error, { code: 'REQUIRED', path: '/targetMinor' });
  assert.equal(flow.settle(1).phase, 'error');
});

test('fail() records a form-level error without touching the draft', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(EXACT);
  const after = flow.fail({ code: 'REQUIRED', path: '/targetMinor', field: 'target' });
  assert.equal(after.phase, 'error');
  assert.equal(after.error.code, 'REQUIRED');
  assert.deepStrictEqual(after.draft, EXACT);
  flow.edit(NON_GREEDY); // correcting returns to dirty
  assert.equal(flow.snapshot().phase, 'dirty');
});

test('reset clears everything, including a busy run', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(EXACT);
  flow.run(1);
  const after = flow.reset();
  assert.deepStrictEqual(after, {
    phase: 'empty', draft: null, result: null, error: null, activeRunId: null,
  });
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'empty');
});

test('an older error reply cannot overwrite a newer state', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(EXACT);
  flow.run(1);
  flow.cancel();
  flow.edit(NON_GREEDY);
  flow.run(2);
  flow.settle(2);
  assert.equal(flow.snapshot().phase, 'ready');
  assert.equal(flow.snapshot().result.keptMinor, 9);
  flow.settle(1);
  assert.equal(flow.snapshot().result.keptMinor, 9);
});
