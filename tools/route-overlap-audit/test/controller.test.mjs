// Controller tests: the three state fixtures from fixtures.json plus
// generation guards (stale replies, wrong generation, worker errors),
// edit-while-busy, run-while-busy, and reset. A controllable fake Worker
// stands in for the real module Worker.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createController } from '../public/js/controller.mjs';
import { run } from '../public/js/core/core.mjs';

const fixtures = JSON.parse(
  await readFile(new URL('../../../docs/specs/route-overlap-audit/fixtures.json', import.meta.url), 'utf8'),
);
const byId = Object.fromEntries(fixtures.cases.map((c) => [c.id, c]));

function makeFakeWorker() {
  return {
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
    deliver(data) {
      if (this.onmessage) this.onmessage({ data });
    },
    fail() {
      if (this.onerror) this.onerror(new Error('worker failed'));
    },
  };
}

function makeController() {
  const workers = [];
  const controller = createController({
    createWorker: () => {
      const worker = makeFakeWorker();
      workers.push(worker);
      return worker;
    },
  });
  return { controller, workers };
}

function outcomeFor(routes) {
  const outcome = run({ routes });
  assert.equal(outcome.ok, true, routes);
  return { ok: true, result: outcome.result };
}

test('fixture state-dirty-error: run, edit to invalid, rerun shows the error', () => {
  const fixture = byId['state-dirty-error'];
  const { controller, workers } = makeController();
  controller.setDraft(fixture.input.initial.routes);
  controller.runAudit();
  assert.equal(controller.getState().state, 'busy');
  assert.equal(workers.length, 1);
  workers[0].deliver({ generation: 1, ...outcomeFor(fixture.input.initial.routes) });
  let state = controller.getState();
  assert.equal(state.state, fixture.expected.afterRun.state);
  assert.equal(state.reportAvailable, fixture.expected.afterRun.reportAvailable);
  assert.ok(state.report);
  assert.equal(state.report.filename, 'route-overlap-audit-report.json');

  controller.setDraft(fixture.input.edit.routes);
  state = controller.getState();
  assert.equal(state.state, fixture.expected.afterEdit.state);
  assert.equal(state.reportAvailable, fixture.expected.afterEdit.reportAvailable);
  assert.equal(state.result, null);

  controller.runAudit();
  assert.equal(workers.length, 2);
  workers[1].deliver({
    generation: 2,
    ok: false,
    error: { code: 'PATTERN', field: 'routes', row: 1 },
  });
  state = controller.getState();
  assert.equal(state.state, fixture.expected.afterRerun.state);
  assert.equal(state.reportAvailable, fixture.expected.afterRerun.reportAvailable);
  assert.deepEqual(state.error, fixture.expected.afterRerun.error);
});

test('fixture state-cancel-late: cancel keeps the draft, late reply cannot revive, reset restores empty', () => {
  const fixture = byId['state-cancel-late'];
  const { controller, workers } = makeController();
  controller.setDraft(fixture.input.draft.routes);
  controller.runAudit();
  let state = controller.getState();
  assert.equal(state.state, fixture.expected.whilePending.state);
  assert.equal(state.reportAvailable, fixture.expected.whilePending.reportAvailable);
  assert.equal(workers[0].terminated, false);

  controller.cancel();
  state = controller.getState();
  assert.equal(state.state, fixture.expected.afterCancel.state);
  assert.equal(state.reportAvailable, fixture.expected.afterCancel.reportAvailable);
  assert.deepEqual(state.draft, fixture.expected.afterCancel.draft);
  assert.equal(workers[0].terminated, true);

  workers[0].deliver({ generation: 1, ok: true, result: fixture.input.lateResult });
  state = controller.getState();
  assert.equal(state.state, fixture.expected.afterLateResult.state);
  assert.equal(state.reportAvailable, fixture.expected.afterLateResult.reportAvailable);

  controller.reset();
  state = controller.getState();
  assert.equal(state.state, fixture.expected.afterReset.state);
  assert.equal(state.reportAvailable, fixture.expected.afterReset.reportAvailable);
  assert.deepEqual(state.draft, fixture.expected.afterReset.draft);
});

test('fixture state-replace-late: newer error survives an older late success', () => {
  const fixture = byId['state-replace-late'];
  const { controller, workers } = makeController();
  controller.setDraft(fixture.input.olderDraft.routes);
  controller.runAudit();
  assert.equal(workers.length, 1);
  // Starting the newer job: edit first (terminates the older job), then run.
  controller.setDraft(fixture.input.newerDraft.routes);
  assert.equal(controller.getState().state, 'dirty');
  assert.equal(workers[0].terminated, true);
  controller.runAudit();
  assert.equal(workers.length, 2);
  workers[1].deliver({
    generation: 2,
    ok: false,
    error: { code: 'PATTERN', field: 'routes', row: 1 },
  });
  let state = controller.getState();
  assert.equal(state.state, fixture.expected.afterNewerResult.state);
  assert.equal(state.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(state.error, fixture.expected.afterNewerResult.error);

  workers[0].deliver({ generation: 1, ok: true, result: fixture.input.olderLateResult });
  state = controller.getState();
  assert.equal(state.state, fixture.expected.afterOlderLateResult.state);
  assert.equal(state.reportAvailable, fixture.expected.afterOlderLateResult.reportAvailable);
  assert.deepEqual(state.error, fixture.expected.afterOlderLateResult.error);
});

test('guards: wrong generation ignored, edit while busy terminates, run while busy ignored', () => {
  const { controller, workers } = makeController();
  controller.setDraft('GET\t/users/:id\nGET\t/users/new');
  controller.runAudit();
  controller.runAudit(); // ignored while busy
  assert.equal(workers.length, 1);
  workers[0].deliver({ generation: 99, ok: true, result: { routeCount: 2, overlaps: [] } });
  assert.equal(controller.getState().state, 'busy');
  controller.setDraft('GET\t/users/:id\nGET\t/users/other');
  assert.equal(controller.getState().state, 'dirty');
  assert.equal(workers[0].terminated, true);
  assert.equal(controller.getState().result, null);
});

test('guards: worker creation failure and worker error become WORKER_ERROR', () => {
  const throwing = createController({
    createWorker: () => { throw new Error('no worker'); },
  });
  throwing.setDraft('GET\t/a');
  throwing.runAudit();
  assert.equal(throwing.getState().state, 'error');
  assert.equal(throwing.getState().error.code, 'WORKER_ERROR');

  const { controller, workers } = makeController();
  controller.setDraft('GET\t/a');
  controller.runAudit();
  workers[0].fail();
  assert.equal(controller.getState().state, 'error');
  assert.equal(controller.getState().error.code, 'WORKER_ERROR');
  assert.equal(workers[0].terminated, true);
});

test('run with invalid input surfaces the core error; reset from success clears the report', () => {
  const { controller, workers } = makeController();
  controller.setDraft('GET\t/*rest/a');
  controller.runAudit();
  workers[0].deliver({ generation: 1, ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.equal(controller.getState().state, 'error');
  assert.deepEqual(controller.getState().error, { code: 'PATTERN', field: 'routes', row: 1 });
  assert.equal(controller.getState().reportAvailable, false);

  controller.setDraft('GET\t/a\nGET\t/a');
  controller.runAudit();
  workers[1].deliver({ generation: 2, ...outcomeFor('GET\t/a\nGET\t/a') });
  assert.equal(controller.getState().state, 'success');
  assert.equal(controller.getState().reportAvailable, true);
  controller.reset();
  const state = controller.getState();
  assert.equal(state.state, 'empty');
  assert.deepEqual(state.draft, { routes: '' });
  assert.equal(state.reportAvailable, false);
  assert.equal(state.result, null);
});

test('unchanged draft does not change state; cancel outside busy is a no-op', () => {
  const { controller } = makeController();
  assert.equal(controller.getState().state, 'empty');
  controller.setDraft('');
  assert.equal(controller.getState().state, 'empty');
  controller.cancel();
  assert.equal(controller.getState().state, 'empty');
});
