// Controller tests for the Oven Temperature Converter.
// The three controller fixtures from the fixed SPEC fixtures are replayed
// against a manually scheduled controller, so completion order —
// including late results from stale generations — is fully controlled.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createController, DEFAULT_DRAFT } from '../public/js/controller.mjs';
import { FIXTURES } from './fixtures.mjs';

function harness() {
  const queue = [];
  const controller = createController({
    schedule: (fn) => { queue.push(fn); },
  });
  return {
    controller,
    queue,
    flushNext() {
      const fn = queue.shift();
      assert.ok(fn, 'expected a scheduled turn');
      fn();
    },
    flushAll() {
      while (queue.length > 0) queue.shift()();
    },
    pending: () => queue.length,
  };
}

const byId = (id) => FIXTURES.cases.find((c) => c.id === id);

test('fixture state-dirty-error', () => {
  const fixture = byId('state-dirty-error');
  const { controller, flushNext } = harness();

  controller.start(fixture.input.initial);
  flushNext();
  let snap = controller.snapshot();
  assert.equal(snap.state, fixture.expected.afterRun.state);
  assert.equal(snap.resultAvailable, fixture.expected.afterRun.resultAvailable);

  controller.edit(fixture.input.edit);
  snap = controller.snapshot();
  assert.equal(snap.state, fixture.expected.afterEdit.state);
  assert.equal(snap.resultAvailable, fixture.expected.afterEdit.resultAvailable);

  controller.start();
  flushNext();
  snap = controller.snapshot();
  assert.equal(snap.state, fixture.expected.afterRerun.state);
  assert.equal(snap.resultAvailable, fixture.expected.afterRerun.resultAvailable);
  assert.deepEqual(snap.error, fixture.expected.afterRerun.error);
});

test('fixture state-cancel-late', () => {
  const fixture = byId('state-cancel-late');
  const { controller, flushAll } = harness();

  controller.start(fixture.input.draft);
  let snap = controller.snapshot();
  assert.equal(snap.state, fixture.expected.whilePending.state);
  assert.equal(snap.resultAvailable, fixture.expected.whilePending.resultAvailable);

  controller.cancel();
  snap = controller.snapshot();
  assert.equal(snap.state, fixture.expected.afterCancel.state);
  assert.equal(snap.resultAvailable, fixture.expected.afterCancel.resultAvailable);
  assert.deepEqual(snap.draft, fixture.expected.afterCancel.draft);

  // The pending turn now fires with the late success: it must be dropped.
  flushAll();
  snap = controller.snapshot();
  assert.equal(snap.state, fixture.expected.afterLateResult.state);
  assert.equal(snap.resultAvailable, fixture.expected.afterLateResult.resultAvailable);

  controller.reset();
  snap = controller.snapshot();
  assert.equal(snap.state, fixture.expected.afterReset.state);
  assert.equal(snap.resultAvailable, fixture.expected.afterReset.resultAvailable);
  assert.deepEqual(snap.draft, fixture.expected.afterReset.draft);
  assert.deepEqual(snap.draft, { ...DEFAULT_DRAFT });
});

test('fixture state-replace-late', () => {
  const fixture = byId('state-replace-late');
  const { controller, queue, pending } = harness();

  controller.start(fixture.input.olderDraft); // generation 1, pending
  controller.start(fixture.input.newerDraft); // generation 2 replaces it
  assert.equal(pending(), 2);

  // Fire the newer job's turn first, exactly as the fixture narrates:
  // the newer work fails with RANGE.
  const [olderTurn, newerTurn] = queue.splice(0, queue.length);
  newerTurn();
  let snap = controller.snapshot();
  assert.equal(snap.state, fixture.expected.afterNewerResult.state);
  assert.equal(snap.resultAvailable, fixture.expected.afterNewerResult.resultAvailable);
  assert.deepEqual(snap.error, fixture.expected.afterNewerResult.error);

  // Now the older generation's late success arrives: it must be dropped
  // and the visible error preserved.
  olderTurn();
  snap = controller.snapshot();
  assert.equal(snap.state, fixture.expected.afterOlderLateResult.state);
  assert.equal(snap.resultAvailable, fixture.expected.afterOlderLateResult.resultAvailable);
  assert.deepEqual(snap.error, fixture.expected.afterOlderLateResult.error);
});

test('cancel outside busy is a no-op; dispose drops pending work', () => {
  const { controller, flushAll } = harness();
  controller.cancel();
  assert.equal(controller.snapshot().state, 'empty');

  controller.start({ value: '4', unit: 'gas', basis: 'conventional' });
  controller.dispose();
  flushAll();
  const snap = controller.snapshot();
  assert.equal(snap.state, 'busy'); // turn was dropped; nothing published
  assert.equal(snap.resultAvailable, false);
});

test('edit during busy cancels the pending publication', () => {
  const { controller, flushAll } = harness();
  controller.start({ value: '4', unit: 'gas', basis: 'conventional' });
  controller.edit({ value: '200', unit: 'celsius', basis: 'conventional' });
  flushAll();
  const snap = controller.snapshot();
  assert.equal(snap.state, 'dirty');
  assert.equal(snap.resultAvailable, false);
});
