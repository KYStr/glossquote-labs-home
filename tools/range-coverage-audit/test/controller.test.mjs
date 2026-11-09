// Controller state-machine tests for Numeric Range Coverage Audit.
// The three controller fixtures from fixtures.json are reproduced here with a
// controllable fake runner (deferred promises), so late results can be
// injected exactly as the fixture scripts them.

import assert from 'node:assert/strict';
import test from 'node:test';
import { AuditController, DEFAULT_DRAFT } from '../public/js/core/controller.mjs';
import { runAudit } from '../public/js/core/range.mjs';

const GAP = { start: '0', end: '10', intervals: '0\t4\n3\t6\n8\t10' };
const GAP_RESULT = runAudit(GAP).result;
const BAD_EDIT = { start: '0', end: '1', intervals: '0\t1.001' };

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fakeRunner() {
  const calls = [];
  const runner = (snapshot, generation) => {
    const d = deferred();
    calls.push({ snapshot, generation, ...d });
    return d.promise;
  };
  runner.calls = calls;
  return runner;
}

function realRunner(snapshot) {
  return Promise.resolve(runAudit(snapshot));
}

test('initial state is empty with the default draft', () => {
  const controller = new AuditController({ runner: realRunner });
  assert.equal(controller.state, 'empty');
  assert.deepEqual(controller.draft, { start: '0', end: '10', intervals: '' });
  assert.equal(controller.reportAvailable, false);
  assert.equal(controller.result, null);
  assert.equal(controller.error, null);
});

test('run success moves empty to success with the result and a report', async () => {
  const controller = new AuditController({ runner: realRunner });
  controller.setDraft(GAP);
  assert.equal(controller.state, 'dirty');
  const started = controller.run();
  assert.equal(controller.state, 'busy');
  await started;
  assert.equal(controller.state, 'success');
  assert.deepEqual(controller.result, GAP_RESULT);
  assert.equal(controller.reportAvailable, true);
});

test('run while busy is ignored', async () => {
  const runner = fakeRunner();
  const controller = new AuditController({ runner });
  controller.setDraft(GAP);
  const first = controller.run();
  assert.equal(await controller.run(), false);
  assert.equal(runner.calls.length, 1);
  runner.calls[0].resolve({ ok: true, result: GAP_RESULT });
  await first;
  assert.equal(controller.state, 'success');
});

test('state-dirty-error: success, edit to invalid, rerun shows the error', async () => {
  const controller = new AuditController({ runner: realRunner });
  controller.setDraft(GAP);
  await controller.run();
  assert.deepEqual(
    { state: controller.state, reportAvailable: controller.reportAvailable },
    { state: 'success', reportAvailable: true },
  );
  controller.setDraft(BAD_EDIT);
  assert.deepEqual(
    { state: controller.state, reportAvailable: controller.reportAvailable },
    { state: 'dirty', reportAvailable: false },
  );
  await controller.run();
  assert.deepEqual(
    { state: controller.state, reportAvailable: controller.reportAvailable, error: controller.error },
    { state: 'error', reportAvailable: false, error: { code: 'OUTSIDE', field: 'intervals', row: 1 } },
  );
});

test('state-cancel-late: cancel keeps the draft, a late result cannot resurrect, reset restores defaults', async () => {
  const runner = fakeRunner();
  const controller = new AuditController({ runner });
  controller.setDraft(GAP);
  const runPromise = controller.run();
  assert.deepEqual(
    { state: controller.state, reportAvailable: controller.reportAvailable },
    { state: 'busy', reportAvailable: false },
  );
  assert.equal(controller.cancel(), true);
  assert.deepEqual(
    { state: controller.state, reportAvailable: controller.reportAvailable, draft: controller.draft },
    { state: 'cancelled', reportAvailable: false, draft: GAP },
  );
  runner.calls[0].resolve({ ok: true, result: GAP_RESULT });
  await runPromise;
  assert.deepEqual(
    { state: controller.state, reportAvailable: controller.reportAvailable },
    { state: 'cancelled', reportAvailable: false },
  );
  controller.reset();
  assert.deepEqual(
    { state: controller.state, reportAvailable: controller.reportAvailable, draft: controller.draft },
    { state: 'empty', reportAvailable: false, draft: { start: '0', end: '10', intervals: '' } },
  );
});

test('state-replace-late: newer error stands when the older success arrives late', async () => {
  const runner = fakeRunner();
  let terminated = 0;
  const controller = new AuditController({ runner, onCancelWork: () => { terminated += 1; } });
  controller.setDraft(GAP);
  const olderRun = controller.run();
  assert.equal(runner.calls.length, 1);
  // Starting the newer work: the edit terminates the older work first.
  controller.setDraft(BAD_EDIT);
  assert.equal(terminated, 1);
  assert.equal(controller.state, 'dirty');
  const newerRun = controller.run();
  assert.equal(runner.calls.length, 2);
  runner.calls[1].resolve({ ok: false, error: { code: 'OUTSIDE', field: 'intervals', row: 1 } });
  await newerRun;
  assert.deepEqual(
    { state: controller.state, reportAvailable: controller.reportAvailable, error: controller.error },
    { state: 'error', reportAvailable: false, error: { code: 'OUTSIDE', field: 'intervals', row: 1 } },
  );
  runner.calls[0].resolve({ ok: true, result: GAP_RESULT });
  await olderRun;
  assert.deepEqual(
    { state: controller.state, reportAvailable: controller.reportAvailable, error: controller.error },
    { state: 'error', reportAvailable: false, error: { code: 'OUTSIDE', field: 'intervals', row: 1 } },
  );
});

test('edit while busy terminates the old work and a late result is dropped', async () => {
  const runner = fakeRunner();
  let terminated = 0;
  const controller = new AuditController({ runner, onCancelWork: () => { terminated += 1; } });
  controller.setDraft(GAP);
  const runPromise = controller.run();
  controller.setDraft({ start: '0', end: '5', intervals: '' });
  assert.equal(controller.state, 'dirty');
  assert.equal(terminated, 1);
  runner.calls[0].resolve({ ok: true, result: GAP_RESULT });
  await runPromise;
  assert.equal(controller.state, 'dirty');
  assert.equal(controller.reportAvailable, false);
});

test('cancel from a non-busy state is a no-op', () => {
  const controller = new AuditController({ runner: realRunner });
  assert.equal(controller.cancel(), false);
  assert.equal(controller.state, 'empty');
});

test('a rejecting runner surfaces WORKER_ERROR and keeps the draft', async () => {
  const controller = new AuditController({
    runner: () => Promise.reject(new Error('boom')),
  });
  controller.setDraft(GAP);
  await controller.run();
  assert.equal(controller.state, 'error');
  assert.deepEqual(controller.error, { code: 'WORKER_ERROR', field: null, row: null });
  assert.deepEqual(controller.draft, GAP);
});

test('loadExample fills the draft and marks it dirty', async () => {
  const controller = new AuditController({ runner: realRunner });
  await controller.run(); // default draft (no intervals) succeeds with a whole-domain gap
  assert.equal(controller.state, 'success');
  controller.loadExample(GAP);
  assert.equal(controller.state, 'dirty');
  assert.deepEqual(controller.draft, GAP);
  assert.equal(controller.reportAvailable, false);
});

test('DEFAULT_DRAFT matches the SPEC reset values', () => {
  assert.deepEqual({ ...DEFAULT_DRAFT }, { start: '0', end: '10', intervals: '' });
});
