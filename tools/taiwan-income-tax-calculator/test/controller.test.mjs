// Controller tests driven by the literal SPEC controller fixtures
// (test/fixtures.json, vendored from spec candidate d92e4046). A fake worker
// with test-controlled delivery stands in for the real module Worker; the
// responses delivered are the fixtures' literal values, not core output.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createController } from '../public/js/core/controller.mjs';
import { DEFAULT_DRAFT } from '../public/js/core/core.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(await readFile(path.join(here, 'fixtures.json'), 'utf8'));
const byId = new Map(fixtures.cases.map((entry) => [entry.id, entry]));

function harness() {
  const workers = [];
  const controller = createController({
    createWorker() {
      const worker = {
        onmessage: null,
        messages: [],
        terminated: false,
        postMessage(message) { this.messages.push(message); },
        terminate() { this.terminated = true; },
        deliver(payload) { if (this.onmessage) this.onmessage({ data: payload }); },
      };
      workers.push(worker);
      return worker;
    },
  });
  return { controller, workers };
}

function checkpoints(controller) {
  const snap = controller.snapshot();
  return { state: snap.state, reportAvailable: snap.reportAvailable };
}

test('fixture state-dirty-error', () => {
  const fixture = byId.get('state-dirty-error');
  const { controller, workers } = harness();

  controller.edit(fixture.input.initial);
  controller.run();
  assert.equal(controller.snapshot().state, 'busy');
  const first = workers[0];
  assert.deepStrictEqual(first.messages[0].input, fixture.input.initial);
  first.deliver({ generation: first.messages[0].generation, response: { ok: true, result: byId.get('single-salary-five-percent').expected.result } });
  assert.deepStrictEqual(checkpoints(controller), fixture.expected.afterRun);
  assert.equal(first.terminated, true, 'worker stops after success');

  controller.edit(fixture.input.edit);
  assert.deepStrictEqual(checkpoints(controller), fixture.expected.afterEdit);

  controller.run();
  const second = workers[1];
  second.deliver({
    generation: second.messages[0].generation,
    response: { ok: false, error: fixture.expected.afterRerun.error },
  });
  const snap = controller.snapshot();
  assert.equal(snap.state, fixture.expected.afterRerun.state);
  assert.equal(snap.reportAvailable, fixture.expected.afterRerun.reportAvailable);
  assert.deepStrictEqual(snap.error, fixture.expected.afterRerun.error);
  assert.equal(controller.getReport(), null);
});

test('fixture state-cancel-late', () => {
  const fixture = byId.get('state-cancel-late');
  const { controller, workers } = harness();

  controller.edit(fixture.input.draft);
  controller.run();
  assert.deepStrictEqual(checkpoints(controller), fixture.expected.whilePending);

  const worker = workers[0];
  const generation = worker.messages[0].generation;
  controller.cancel();
  assert.equal(worker.terminated, true);
  let snap = controller.snapshot();
  assert.deepStrictEqual(
    { state: snap.state, reportAvailable: snap.reportAvailable, draft: snap.draft },
    fixture.expected.afterCancel,
  );

  // The late success from the cancelled generation must not revive.
  worker.deliver({ generation, response: { ok: true, result: fixture.input.lateResult } });
  snap = controller.snapshot();
  assert.deepStrictEqual(
    { state: snap.state, reportAvailable: snap.reportAvailable },
    fixture.expected.afterLateResult,
  );
  assert.equal(snap.result, null);

  controller.reset();
  snap = controller.snapshot();
  assert.deepStrictEqual(
    { state: snap.state, reportAvailable: snap.reportAvailable, draft: snap.draft },
    fixture.expected.afterReset,
  );
  assert.deepStrictEqual(snap.draft, { ...DEFAULT_DRAFT });
});

test('fixture state-replace-late', () => {
  const fixture = byId.get('state-replace-late');
  const { controller, workers } = harness();

  controller.edit(fixture.input.olderDraft);
  controller.run();
  const older = workers[0];
  const olderGeneration = older.messages[0].generation;

  // Starting newer work supersedes and terminates the older worker.
  controller.edit(fixture.input.newerDraft);
  controller.run();
  assert.equal(older.terminated, true);
  const newer = workers[1];
  newer.deliver({
    generation: newer.messages[0].generation,
    response: { ok: false, error: fixture.expected.afterNewerResult.error },
  });
  let snap = controller.snapshot();
  assert.equal(snap.state, fixture.expected.afterNewerResult.state);
  assert.equal(snap.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);
  assert.deepStrictEqual(snap.error, fixture.expected.afterNewerResult.error);

  // The older worker's late success must not replace the current error.
  older.deliver({ generation: olderGeneration, response: { ok: true, result: fixture.input.olderLateResult } });
  snap = controller.snapshot();
  assert.equal(snap.state, fixture.expected.afterOlderLateResult.state);
  assert.equal(snap.reportAvailable, fixture.expected.afterOlderLateResult.reportAvailable);
  assert.deepStrictEqual(snap.error, fixture.expected.afterOlderLateResult.error);
});

test('worker factory failure surfaces WORKER_ERROR and keeps the draft', () => {
  const controller = createController({
    createWorker() { throw new Error('no worker available'); },
  });
  controller.edit({ ...DEFAULT_DRAFT, grossSalary: '720000' });
  controller.run();
  const snap = controller.snapshot();
  assert.equal(snap.state, 'error');
  assert.deepStrictEqual(snap.error, { code: 'WORKER_ERROR', field: null, row: null });
  assert.equal(snap.draft.grossSalary, '720000');
});

test('a message with a foreign generation is ignored while busy', () => {
  const { controller, workers } = harness();
  controller.edit({ ...DEFAULT_DRAFT, grossSalary: '720000' });
  controller.run();
  const worker = workers[0];
  worker.deliver({ generation: worker.messages[0].generation + 99, response: { ok: true, result: {} } });
  assert.equal(controller.snapshot().state, 'busy');
  controller.cancel();
  assert.equal(controller.snapshot().state, 'cancelled');
});
