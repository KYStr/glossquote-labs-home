// Controller tests for the HbA1c Converter.
// The three controller fixtures from the fixed SPEC fixtures are replayed
// against a controller driven by a fake worker whose completion is fully
// controlled, so completion order — including late results from stale
// generations — is deterministic. The fake worker computes nothing: the
// test delivers either the core's real outcome or the fixture's literal
// late result, as the fixture narrates.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createController, DEFAULT_DRAFT } from '../public/js/controller.mjs';
import { run } from '../public/js/core/convert.mjs';
import { FIXTURES } from './fixtures.mjs';

function harness() {
  const workers = [];
  const controller = createController({
    createWorker: () => {
      const worker = {
        posted: [],
        terminated: false,
        onmessage: null,
        onerror: null,
        postMessage(message) {
          this.posted.push(message);
        },
        terminate() {
          this.terminated = true;
        },
        // Deliver a reply as if it came from the real worker.
        deliver(payload) {
          if (this.onmessage !== null) this.onmessage({ data: payload });
        },
        // Deliver the real core outcome for the posted snapshot.
        deliverReal() {
          const message = this.posted[this.posted.length - 1];
          const outcome = run(message.snapshot);
          this.deliver({ generation: message.generation, ...outcome });
        },
      };
      workers.push(worker);
      return worker;
    },
  });
  return { controller, workers };
}

const byId = (id) => FIXTURES.cases.find((c) => c.id === id);

test('fixture state-dirty-error', () => {
  const fixture = byId('state-dirty-error');
  const { controller, workers } = harness();

  controller.run(fixture.input.initial);
  workers[0].deliverReal();
  let snap = controller.getState();
  assert.equal(snap.state, fixture.expected.afterRun.state);
  assert.equal(snap.reportAvailable, fixture.expected.afterRun.reportAvailable);

  controller.edit(fixture.input.edit);
  snap = controller.getState();
  assert.equal(snap.state, fixture.expected.afterEdit.state);
  assert.equal(snap.reportAvailable, fixture.expected.afterEdit.reportAvailable);

  controller.run();
  workers[1].deliverReal();
  snap = controller.getState();
  assert.equal(snap.state, fixture.expected.afterRerun.state);
  assert.equal(snap.reportAvailable, fixture.expected.afterRerun.reportAvailable);
  assert.deepEqual(snap.error, fixture.expected.afterRerun.error);
});

test('fixture state-cancel-late', () => {
  const fixture = byId('state-cancel-late');
  const { controller, workers } = harness();

  controller.run(fixture.input.draft);
  let snap = controller.getState();
  assert.equal(snap.state, fixture.expected.whilePending.state);
  assert.equal(snap.reportAvailable, fixture.expected.whilePending.reportAvailable);

  controller.cancel();
  snap = controller.getState();
  assert.equal(snap.state, fixture.expected.afterCancel.state);
  assert.equal(snap.reportAvailable, fixture.expected.afterCancel.reportAvailable);
  assert.deepEqual(snap.draft, fixture.expected.afterCancel.draft);

  // The pending turn now fires with the late success: it must be dropped.
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: fixture.input.lateResult,
  });
  snap = controller.getState();
  assert.equal(snap.state, fixture.expected.afterLateResult.state);
  assert.equal(snap.reportAvailable, fixture.expected.afterLateResult.reportAvailable);

  controller.reset();
  snap = controller.getState();
  assert.equal(snap.state, fixture.expected.afterReset.state);
  assert.equal(snap.reportAvailable, fixture.expected.afterReset.reportAvailable);
  assert.deepEqual(snap.draft, fixture.expected.afterReset.draft);
  assert.deepEqual(snap.draft, { ...DEFAULT_DRAFT });
});

test('fixture state-replace-late', () => {
  const fixture = byId('state-replace-late');
  const { controller, workers } = harness();

  controller.run(fixture.input.olderDraft); // generation 1, pending
  controller.run(fixture.input.newerDraft); // generation 2 replaces it
  assert.equal(workers.length, 2);
  assert.equal(workers[0].terminated, true);

  // Fire the newer job first, exactly as the fixture narrates:
  // the newer work fails with RANGE.
  workers[1].deliverReal();
  let snap = controller.getState();
  assert.equal(snap.state, fixture.expected.afterNewerResult.state);
  assert.equal(snap.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(snap.error, fixture.expected.afterNewerResult.error);

  // Now the older generation's late success arrives: it must be dropped
  // and the visible error preserved.
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: fixture.input.olderLateResult,
  });
  snap = controller.getState();
  assert.equal(snap.state, fixture.expected.afterOlderLateResult.state);
  assert.equal(snap.reportAvailable, fixture.expected.afterOlderLateResult.reportAvailable);
  assert.deepEqual(snap.error, fixture.expected.afterOlderLateResult.error);
});

test('cancel outside busy is a no-op; destroy drops pending work', () => {
  const { controller, workers } = harness();
  controller.cancel();
  assert.equal(controller.getState().state, 'empty');

  controller.run({ value: '7', unit: 'a1c-percent' });
  controller.destroy();
  workers[0].deliverReal();
  const snap = controller.getState();
  assert.equal(snap.state, 'busy'); // turn was dropped; nothing published
  assert.equal(snap.reportAvailable, false);
});

test('edit during busy cancels the pending publication', () => {
  const { controller, workers } = harness();
  controller.run({ value: '7', unit: 'a1c-percent' });
  controller.edit({ value: '8', unit: 'a1c-percent' });
  workers[0].deliverReal();
  const snap = controller.getState();
  assert.equal(snap.state, 'dirty');
  assert.equal(snap.reportAvailable, false);
});

test('unchanged edit leaves the state alone', () => {
  const { controller } = harness();
  controller.edit({ value: '7', unit: 'a1c-percent' });
  assert.equal(controller.getState().state, 'empty');
  controller.run({ value: '7', unit: 'a1c-percent' });
  controller.edit({ value: '7', unit: 'a1c-percent' });
  assert.equal(controller.getState().state, 'busy');
});

test('worker creation failure becomes WORKER_ERROR', () => {
  const controller = createController({
    createWorker: () => { throw new Error('no worker'); },
  });
  const snap = controller.run({ value: '7', unit: 'a1c-percent' });
  assert.equal(snap.state, 'error');
  assert.deepEqual(snap.error, { code: 'WORKER_ERROR', field: null, row: null });
  assert.equal(snap.reportAvailable, false);
});
