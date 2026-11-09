// Run-state machine transitions (SPEC userFlow), beyond the literal flow
// fixtures: busy re-submit ignored, wrong-runId settle ignored, cancel,
// reset, blank submit, error on invalid draft, fail() for form-level
// errors, and a stale error reply that must not overwrite a newer state.
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

test('initial state is empty; edit makes it dirty and clears any result', () => {
  const flow = createFlow({ validate, solve });
  assert.deepStrictEqual(flow.snapshot(), {
    phase: 'empty', draft: null, result: null, error: null, activeRunId: null,
  });
  flow.edit(REASSIGN);
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
  flow.edit(REASSIGN);
  flow.run(1);
  const ignored = flow.run(2);
  assert.equal(ignored.phase, 'busy');
  assert.equal(ignored.activeRunId, 1);
  flow.settle(2); // wrong runId: ignored
  assert.equal(flow.snapshot().phase, 'busy');
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'ready');
  assert.equal(flow.snapshot().result.covered, 2);
});

test('cancel from busy returns to dirty and keeps the draft', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(REASSIGN);
  flow.run(1);
  const after = flow.cancel();
  assert.equal(after.phase, 'dirty');
  assert.equal(after.activeRunId, null);
  assert.deepStrictEqual(after.draft, REASSIGN);
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
  flow.edit(REASSIGN);
  assert.equal(flow.cancel().phase, 'dirty');
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.cancel().phase, 'ready');
});

test('run with an invalid draft goes to error with the core error', () => {
  const flow = createFlow({ validate, solve });
  flow.edit({ minGap: 25, maxGap: 10, cards: REASSIGN.cards, sleeves: REASSIGN.sleeves });
  const after = flow.run(1);
  assert.equal(after.phase, 'error');
  assert.deepStrictEqual(after.error, { code: 'ORDER', path: '/maxGap' });
  assert.equal(after.result, null);
  // Fixing the draft returns to dirty.
  flow.edit(REASSIGN);
  assert.equal(flow.snapshot().phase, 'dirty');
  assert.equal(flow.snapshot().error, null);
});

test('blank submit (null draft) goes to error with TYPE at the root', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(null);
  assert.equal(flow.snapshot().phase, 'empty');
  const after = flow.run(1);
  assert.equal(after.phase, 'error');
  assert.deepStrictEqual(after.error, { code: 'TYPE', path: '' });
});

test('fail() records a form-level error without touching the draft; ignored while busy', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(REASSIGN);
  const after = flow.fail({ code: 'TYPE', path: '/cards/0/w' });
  assert.equal(after.phase, 'error');
  assert.deepStrictEqual(after.error, { code: 'TYPE', path: '/cards/0/w' });
  assert.deepStrictEqual(after.draft, REASSIGN);
  flow.edit(REASSIGN);
  flow.run(1);
  assert.deepStrictEqual(flow.fail({ code: 'RANGE', path: '/minGap' }).phase, 'busy');
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'ready');
});

test('settle accepts a precomputed reply instead of re-solving', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(REASSIGN);
  flow.run(1);
  const reply = solve(REASSIGN);
  const after = flow.settle(1, reply);
  assert.equal(after.phase, 'ready');
  assert.deepStrictEqual(after.result, REASSIGN_RESULT);
});

test('a stale error reply cannot overwrite a newer ready state', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(REASSIGN);
  flow.run(1);
  flow.cancel();
  flow.edit(SHORT_STOCK);
  flow.run(2);
  flow.settle(2);
  assert.equal(flow.snapshot().phase, 'ready');
  // A late error reply from run 1 arrives afterwards: ignored.
  flow.settle(1, { status: 'error', error: { code: 'ORDER', path: '/maxGap' } });
  const state = flow.snapshot();
  assert.equal(state.phase, 'ready');
  assert.equal(state.result.covered, 2);
  assert.equal(state.error, null);
});

test('reset returns to empty and clears draft, result and error', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(REASSIGN);
  flow.run(1);
  flow.settle(1);
  const after = flow.reset();
  assert.deepStrictEqual(after, {
    phase: 'empty', draft: null, result: null, error: null, activeRunId: null,
  });
});

test('loading the example draft is an edit: phase dirty, no result yet', () => {
  const flow = createFlow({ validate, solve });
  const after = flow.edit(REASSIGN);
  assert.equal(after.phase, 'dirty');
  assert.equal(after.result, null);
  flow.run(1);
  flow.settle(1);
  assert.deepStrictEqual(flow.snapshot().result, REASSIGN_RESULT);
});
