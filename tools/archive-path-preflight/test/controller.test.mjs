// Controller tests: state machine with generation discipline, driven by a
// controllable fake worker. Covers the three SPEC controller fixtures plus
// edit-while-busy, stale-generation, worker-error, and OUTPUT_LIMIT paths.

import assert from 'node:assert/strict';
import test from 'node:test';
import { createController } from '../public/js/controller.mjs';

const INITIAL = 'D\tdata\nF\tdata/a.txt\nF\tdata/b.txt';
const CLEAN_RESULT = {
  rowCount: 3,
  unsafe: [],
  conflicts: [],
  safeWithinPolicy: true,
};

function makeFactory(created) {
  return ({ onMessage, onError }) => {
    const handle = {
      messages: [],
      terminated: false,
      postMessage(message) {
        this.messages.push(message);
      },
      terminate() {
        this.terminated = true;
      },
      deliver(payload) {
        onMessage(payload);
      },
      fail() {
        onError();
      },
    };
    created.push(handle);
    return handle;
  };
}

async function tick() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

function makeController() {
  const created = [];
  const seen = [];
  const controller = createController({
    createWorker: makeFactory(created),
    onChange: (state) => seen.push(state.status),
  });
  return { controller, created, seen };
}

test('state-dirty-error fixture', async () => {
  const { controller, created } = makeController();
  assert.equal(controller.getState().status, 'empty');

  controller.setDraft(INITIAL);
  assert.equal(controller.getState().status, 'dirty');

  controller.run();
  assert.equal(controller.getState().status, 'busy');
  await tick();
  assert.equal(created.length, 1);
  const gen1 = created[0].messages[0].generation;
  assert.deepEqual(created[0].messages, [{ generation: gen1, entries: INITIAL }]);

  created[0].deliver({ generation: gen1, ok: true, result: CLEAN_RESULT });
  const afterRun = controller.getState();
  assert.equal(afterRun.status, 'success');
  assert.equal(afterRun.reportAvailable, true);
  assert.equal(created[0].terminated, true, 'worker stops after success');

  controller.setDraft('L\tx');
  const afterEdit = controller.getState();
  assert.equal(afterEdit.status, 'dirty');
  assert.equal(afterEdit.reportAvailable, false);
  assert.equal(afterEdit.result, null);

  controller.run();
  await tick();
  const gen2 = created[1].messages[0].generation;
  created[1].deliver({
    generation: gen2,
    ok: false,
    error: { code: 'ROW_FORMAT', field: 'entries', row: 1 },
  });
  const afterRerun = controller.getState();
  assert.equal(afterRerun.status, 'error');
  assert.equal(afterRerun.reportAvailable, false);
  assert.deepEqual(afterRerun.error, { code: 'ROW_FORMAT', field: 'entries', row: 1 });
});

test('state-cancel-late fixture', async () => {
  const { controller, created } = makeController();
  controller.setDraft(INITIAL);
  controller.run();
  await tick();
  assert.equal(controller.getState().status, 'busy');
  assert.equal(controller.getState().reportAvailable, false);

  controller.cancel();
  const afterCancel = controller.getState();
  assert.equal(afterCancel.status, 'cancelled');
  assert.equal(afterCancel.reportAvailable, false);
  assert.deepEqual(afterCancel.draft, { entries: INITIAL });
  assert.equal(created[0].terminated, true);

  // The late result of the cancelled generation must not revive anything.
  const gen1 = created[0].messages[0].generation;
  created[0].deliver({ generation: gen1, ok: true, result: CLEAN_RESULT });
  const afterLate = controller.getState();
  assert.equal(afterLate.status, 'cancelled');
  assert.equal(afterLate.reportAvailable, false);

  controller.reset();
  const afterReset = controller.getState();
  assert.equal(afterReset.status, 'empty');
  assert.deepEqual(afterReset.draft, { entries: '' });
  assert.equal(afterReset.reportAvailable, false);
});

test('state-replace-late fixture', async () => {
  const { controller, created } = makeController();
  controller.setDraft(INITIAL);
  controller.run();
  await tick();
  assert.equal(created.length, 1);

  // A newer draft starts newer work while the older work is still pending.
  controller.setDraft('L\tx');
  assert.equal(controller.getState().status, 'dirty');
  assert.equal(created[0].terminated, true, 'editing terminates the old work');
  controller.run();
  await tick();
  assert.equal(created.length, 2);
  const gen2 = created[1].messages[0].generation;

  created[1].deliver({
    generation: gen2,
    ok: false,
    error: { code: 'ROW_FORMAT', field: 'entries', row: 1 },
  });
  const afterNewer = controller.getState();
  assert.equal(afterNewer.status, 'error');
  assert.equal(afterNewer.reportAvailable, false);
  assert.deepEqual(afterNewer.error, { code: 'ROW_FORMAT', field: 'entries', row: 1 });

  // The older generation's late success must not replace the current error.
  const gen1 = created[0].messages[0].generation;
  created[0].deliver({ generation: gen1, ok: true, result: CLEAN_RESULT });
  const afterOlderLate = controller.getState();
  assert.equal(afterOlderLate.status, 'error');
  assert.equal(afterOlderLate.reportAvailable, false);
  assert.deepEqual(afterOlderLate.error, { code: 'ROW_FORMAT', field: 'entries', row: 1 });
});

test('stale generation ignored while busy; current generation wins', async () => {
  const { controller, created } = makeController();
  controller.setDraft(INITIAL);
  controller.run();
  await tick();
  controller.run(); // Supersedes the first run.
  await tick();
  assert.equal(created.length, 2);
  assert.equal(created[0].terminated, true);
  const gen1 = created[0].messages[0].generation;
  const gen2 = created[1].messages[0].generation;

  created[0].deliver({ generation: gen1, ok: true, result: CLEAN_RESULT });
  assert.equal(controller.getState().status, 'busy', 'stale success ignored');
  created[1].deliver({ generation: gen2, ok: true, result: CLEAN_RESULT });
  assert.equal(controller.getState().status, 'success');
});

test('worker error keeps the draft and reports WORKER_ERROR', async () => {
  const { controller, created } = makeController();
  controller.setDraft(INITIAL);
  controller.run();
  await tick();
  created[0].fail();
  const state = controller.getState();
  assert.equal(state.status, 'error');
  assert.deepEqual(state.error, { code: 'WORKER_ERROR', field: null, row: null });
  assert.deepEqual(state.draft, { entries: INITIAL });
  assert.equal(state.reportAvailable, false);
});

test('factory rejection reports WORKER_ERROR', async () => {
  const controller = createController({
    createWorker: () => {
      throw new Error('no worker');
    },
  });
  controller.setDraft(INITIAL);
  controller.run();
  await tick();
  assert.equal(controller.getState().status, 'error');
  assert.deepEqual(controller.getState().error, {
    code: 'WORKER_ERROR',
    field: null,
    row: null,
  });
});

test('oversized report becomes OUTPUT_LIMIT error, not success', async () => {
  const { controller, created } = makeController();
  controller.setDraft(INITIAL);
  controller.run();
  await tick();
  const huge = {
    rowCount: 500,
    unsafe: Array.from({ length: 60000 }, () => ({
      line: 500,
      code: 'PATH_LIMIT',
      segment: null,
    })),
    conflicts: [],
    safeWithinPolicy: false,
  };
  const gen1 = created[0].messages[0].generation;
  created[0].deliver({ generation: gen1, ok: true, result: huge });
  const state = controller.getState();
  assert.equal(state.status, 'error');
  assert.deepEqual(state.error, { code: 'OUTPUT_LIMIT', field: null, row: null });
  assert.equal(state.reportAvailable, false);
});

test('download payload only on success; reset clears everything', async () => {
  const { controller, created } = makeController();
  assert.equal(controller.download(), null);
  controller.setDraft(INITIAL);
  controller.run();
  await tick();
  const gen1 = created[0].messages[0].generation;
  created[0].deliver({ generation: gen1, ok: true, result: CLEAN_RESULT });
  const payload = controller.download();
  assert.equal(payload.filename, 'archive-path-preflight-report.json');
  assert.equal(
    payload.text,
    '{"conflicts":[],"rowCount":3,"safeWithinPolicy":true,"unsafe":[]}\n',
  );
  controller.reset();
  assert.equal(controller.download(), null);
  assert.equal(controller.getState().status, 'empty');
});

test('cancel when not busy is a no-op; clearing the draft returns to empty', () => {
  const { controller } = makeController();
  assert.equal(controller.cancel().status, 'empty');
  controller.setDraft(INITIAL);
  assert.equal(controller.getState().status, 'dirty');
  controller.setDraft('');
  assert.equal(controller.getState().status, 'empty');
});
