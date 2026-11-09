// Run-state machine transitions (SPEC userFlow), beyond the literal flow
// fixtures: busy re-submit ignored, wrong-runId settle ignored, cancel,
// reset, error on invalid draft, fail() for form-level errors, edit
// invalidating a pending run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, validate } from '../public/js/core/solve.mjs';
import { createFlow } from '../public/js/core/flow.mjs';

const GAPS = {
  charged: 3,
  devices: [
    { name: 'A', runtime: 30, runs: [{ start: 0, end: 20 }, { start: 40, end: 65 }] },
    { name: 'B', runtime: 20, runs: [{ start: 10, end: 50 }] },
  ],
};
const SIMULTANEOUS = {
  charged: 1,
  devices: [
    { name: 'Z', runtime: 10, runs: [{ start: 5, end: 10 }] },
    { name: 'A', runtime: 10, runs: [{ start: 5, end: 10 }] },
  ],
};

test('initial state is empty; edit makes it dirty and clears any result', () => {
  const flow = createFlow({ validate, solve });
  assert.deepStrictEqual(flow.snapshot(), {
    phase: 'empty', draft: null, result: null, error: null, activeRunId: null,
  });
  flow.edit(GAPS);
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

test('run goes busy and only the matching runId settles', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(GAPS);
  flow.run(7);
  assert.equal(flow.snapshot().phase, 'busy');
  assert.equal(flow.snapshot().activeRunId, 7);
  flow.settle(8); // wrong runId: ignored, still busy
  assert.equal(flow.snapshot().phase, 'busy');
  assert.equal(flow.snapshot().result, null);
  const settled = flow.settle(7);
  assert.equal(settled.phase, 'ready');
  assert.equal(settled.result.required, 4);
});

test('re-submit while busy is ignored', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(GAPS);
  flow.run(1);
  flow.run(2); // ignored
  assert.equal(flow.snapshot().activeRunId, 1);
  flow.settle(2); // ignored
  assert.equal(flow.snapshot().phase, 'busy');
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'ready');
});

test('cancel from busy returns to dirty and keeps the draft; cancel otherwise is a no-op', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(GAPS);
  flow.run(1);
  const cancelled = flow.cancel();
  assert.equal(cancelled.phase, 'dirty');
  assert.deepStrictEqual(cancelled.draft, GAPS);
  assert.equal(cancelled.result, null);
  flow.settle(1); // late settle after cancel: ignored
  assert.equal(flow.snapshot().phase, 'dirty');
  const again = flow.cancel();
  assert.equal(again.phase, 'dirty');
});

test('invalid draft goes to error and keeps the draft', () => {
  const flow = createFlow({ validate, solve });
  const bad = {
    charged: 1,
    devices: [{ name: 'A', runtime: 10, runs: [{ start: 0, end: 20 }, { start: 10, end: 30 }] }],
  };
  flow.edit(bad);
  const s = flow.run(1);
  assert.equal(s.phase, 'error');
  assert.deepStrictEqual(s.error, { code: 'OVERLAP', path: '/devices/0/runs/1/start' });
  assert.deepStrictEqual(s.draft, bad);
  // Fixing the draft returns to dirty.
  const fixed = {
    charged: 1,
    devices: [{ name: 'A', runtime: 10, runs: [{ start: 0, end: 20 }] }],
  };
  assert.equal(flow.edit(fixed).phase, 'dirty');
  assert.equal(flow.edit(fixed).error, null);
});

test('run with no draft goes to error', () => {
  const flow = createFlow({ validate, solve });
  const s = flow.run(1);
  assert.equal(s.phase, 'error');
  assert.deepStrictEqual(s.error, { code: 'TYPE', path: '' });
});

test('fail() records form-level errors without touching the draft', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(GAPS);
  const fields = [{ id: 'charged', code: 'REQUIRED', message: 'required' }];
  const s = flow.fail({ code: 'FORM', path: '', fields });
  assert.equal(s.phase, 'error');
  assert.deepStrictEqual(s.error.fields, fields);
  assert.deepStrictEqual(s.draft, GAPS);
  // fail() while busy is ignored.
  flow.edit(GAPS);
  flow.run(1);
  flow.fail({ code: 'FORM', path: '', fields });
  assert.equal(flow.snapshot().phase, 'busy');
});

test('reset clears a busy run and returns to empty', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(GAPS);
  flow.run(1);
  const s = flow.reset();
  assert.deepStrictEqual(s, {
    phase: 'empty', draft: null, result: null, error: null, activeRunId: null,
  });
  flow.settle(1); // no pending run anymore
  assert.equal(flow.snapshot().phase, 'empty');
});

test('edit invalidates a pending run', () => {
  const flow = createFlow({ validate, solve });
  flow.edit(GAPS);
  flow.run(1);
  flow.edit(SIMULTANEOUS);
  assert.equal(flow.snapshot().phase, 'dirty');
  assert.equal(flow.snapshot().activeRunId, null);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, 'dirty');
  assert.equal(flow.snapshot().result, null);
});
