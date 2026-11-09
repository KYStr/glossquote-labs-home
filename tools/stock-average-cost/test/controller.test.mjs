// Controller tests: state machine with generation discipline, driven by a
// controllable fake worker. Covers the three SPEC controller fixtures plus
// edit-while-busy, stale-generation, worker-error, and download paths.
// The drafts and the late results come from the vendored SPEC fixtures.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createController, DEFAULT_DRAFT } from '../public/js/controller.mjs';
import { run as coreRun } from '../public/js/core/calculate.mjs';

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = JSON.parse(
  readFileSync(path.join(toolRoot, 'test/fixtures.json'), 'utf8'),
);
const fixture = (id) => fixtures.cases.find((c) => c.id === id);

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

test('initial state is empty with the SPEC default draft', () => {
  const { controller } = makeController();
  const state = controller.getState();
  assert.equal(state.status, 'empty');
  assert.deepEqual(state.draft, {
    feeRateBps: '0',
    trades: [{ side: 'buy', shares: '', price: '' }],
  });
  assert.equal(state.reportAvailable, false);
  assert.equal(controller.download(), null);
});

test('state-dirty-error fixture', async () => {
  const { input, expected } = fixture('state-dirty-error');
  const { controller, created } = makeController();

  controller.setDraft(input.initial);
  controller.run();
  assert.equal(controller.getState().status, 'busy');
  await tick();
  assert.equal(created.length, 1);
  const gen1 = created[0].messages[0].generation;
  assert.deepEqual(created[0].messages, [{
    generation: gen1,
    feeRateBps: input.initial.feeRateBps,
    trades: input.initial.trades,
  }]);

  // The worker answers with the true core result for the initial draft
  // (identical to the fifo-sell-two-lots fixture input).
  const trueResult = coreRun(input.initial).result;
  created[0].deliver({ generation: gen1, ok: true, result: trueResult });
  const afterRun = controller.getState();
  assert.equal(afterRun.status, expected.afterRun.state);
  assert.equal(afterRun.reportAvailable, expected.afterRun.reportAvailable);
  assert.equal(created[0].terminated, true, 'worker stops after success');
  assert.notEqual(controller.download(), null);
  assert.equal(controller.download().filename, 'stock-average-cost-report.json');

  controller.setDraft(input.edit);
  const afterEdit = controller.getState();
  assert.equal(afterEdit.status, expected.afterEdit.state);
  assert.equal(afterEdit.reportAvailable, expected.afterEdit.reportAvailable);
  assert.equal(afterEdit.result, null);
  assert.equal(controller.download(), null);

  controller.run();
  await tick();
  const gen2 = created[1].messages[0].generation;
  created[1].deliver({
    generation: gen2,
    ok: false,
    error: { code: 'OVERSOLD', field: 'trades', row: 2 },
  });
  const afterRerun = controller.getState();
  assert.equal(afterRerun.status, expected.afterRerun.state);
  assert.equal(afterRerun.reportAvailable, expected.afterRerun.reportAvailable);
  assert.deepEqual(afterRerun.error, expected.afterRerun.error);
});

test('state-cancel-late fixture', async () => {
  const { input, expected } = fixture('state-cancel-late');
  const { controller, created } = makeController();

  controller.setDraft(input.draft);
  controller.run();
  await tick();
  const whilePending = controller.getState();
  assert.equal(whilePending.status, expected.whilePending.state);
  assert.equal(whilePending.reportAvailable, expected.whilePending.reportAvailable);

  controller.cancel();
  const afterCancel = controller.getState();
  assert.equal(afterCancel.status, expected.afterCancel.state);
  assert.equal(afterCancel.reportAvailable, expected.afterCancel.reportAvailable);
  assert.deepEqual(afterCancel.draft, expected.afterCancel.draft);
  assert.equal(created[0].terminated, true);

  // The late result of the cancelled generation must not revive anything.
  const gen1 = created[0].messages[0].generation;
  created[0].deliver({ generation: gen1, ok: true, result: input.lateResult });
  const afterLate = controller.getState();
  assert.equal(afterLate.status, expected.afterLateResult.state);
  assert.equal(afterLate.reportAvailable, expected.afterLateResult.reportAvailable);
  assert.equal(afterLate.result, null);

  controller.reset();
  const afterReset = controller.getState();
  assert.equal(afterReset.status, expected.afterReset.state);
  assert.equal(afterReset.reportAvailable, expected.afterReset.reportAvailable);
  assert.deepEqual(afterReset.draft, expected.afterReset.draft);
});

test('state-replace-late fixture', async () => {
  const { input, expected } = fixture('state-replace-late');
  const { controller, created } = makeController();

  controller.setDraft(input.olderDraft);
  controller.run();
  await tick();
  assert.equal(created.length, 1);
  const gen1 = created[0].messages[0].generation;

  // Starting the newer work retires the older generation.
  controller.setDraft(input.newerDraft);
  controller.run();
  await tick();
  assert.equal(created.length, 2);
  assert.equal(created[0].terminated, true);
  const gen2 = created[1].messages[0].generation;
  assert.notEqual(gen2, gen1);

  created[1].deliver({
    generation: gen2,
    ok: false,
    error: { code: 'OVERSOLD', field: 'trades', row: 2 },
  });
  const afterNewer = controller.getState();
  assert.equal(afterNewer.status, expected.afterNewerResult.state);
  assert.equal(afterNewer.reportAvailable, expected.afterNewerResult.reportAvailable);
  assert.deepEqual(afterNewer.error, expected.afterNewerResult.error);

  // The older generation's late success must not replace the current error.
  created[0].deliver({ generation: gen1, ok: true, result: input.olderLateResult });
  const afterOlder = controller.getState();
  assert.equal(afterOlder.status, expected.afterOlderLateResult.state);
  assert.equal(afterOlder.reportAvailable, expected.afterOlderLateResult.reportAvailable);
  assert.deepEqual(afterOlder.error, expected.afterOlderLateResult.error);
});

test('editing while busy cancels the work and lands in dirty', async () => {
  const { controller, created } = makeController();
  controller.setDraft({ feeRateBps: '0', trades: [{ side: 'buy', shares: '10', price: '5' }] });
  controller.run();
  await tick();
  assert.equal(controller.getState().status, 'busy');

  controller.setDraft({ feeRateBps: '0', trades: [{ side: 'buy', shares: '11', price: '5' }] });
  const state = controller.getState();
  assert.equal(state.status, 'dirty');
  assert.equal(created[0].terminated, true);

  const gen1 = created[0].messages[0].generation;
  created[0].deliver({ generation: gen1, ok: true, result: coreRun({ feeRateBps: '0', trades: [{ side: 'buy', shares: '10', price: '5' }] }).result });
  assert.equal(controller.getState().status, 'dirty');
  assert.equal(controller.getState().result, null);
});

test('setting the draft back to the default returns to empty', () => {
  const { controller } = makeController();
  controller.setDraft({ feeRateBps: '5', trades: [{ side: 'sell', shares: '3', price: '9' }] });
  assert.equal(controller.getState().status, 'dirty');
  controller.setDraft({
    feeRateBps: DEFAULT_DRAFT.feeRateBps,
    trades: [{ side: 'buy', shares: '', price: '' }],
  });
  assert.equal(controller.getState().status, 'empty');
});

test('worker error becomes WORKER_ERROR and keeps the draft', async () => {
  const { controller, created } = makeController();
  const draft = { feeRateBps: '0', trades: [{ side: 'buy', shares: '10', price: '5' }] };
  controller.setDraft(draft);
  controller.run();
  await tick();
  created[0].fail();
  const state = controller.getState();
  assert.equal(state.status, 'error');
  assert.deepEqual(state.error, { code: 'WORKER_ERROR', field: null, row: null });
  assert.deepEqual(state.draft, draft);
});

test('worker factory failure becomes WORKER_ERROR', async () => {
  const controller = createController({
    createWorker: () => { throw new Error('no worker'); },
    onChange: () => {},
  });
  controller.setDraft({ feeRateBps: '0', trades: [{ side: 'buy', shares: '10', price: '5' }] });
  controller.run();
  await tick();
  const state = controller.getState();
  assert.equal(state.status, 'error');
  assert.deepEqual(state.error, { code: 'WORKER_ERROR', field: null, row: null });
});

test('malformed worker message becomes INTERNAL', async () => {
  const { controller, created } = makeController();
  controller.setDraft({ feeRateBps: '0', trades: [{ side: 'buy', shares: '10', price: '5' }] });
  controller.run();
  await tick();
  const gen = created[0].messages[0].generation;
  created[0].deliver({ generation: gen, ok: 'yes' });
  const state = controller.getState();
  assert.equal(state.status, 'error');
  assert.deepEqual(state.error, { code: 'INTERNAL', field: null, row: null });
});

test('a second run supersedes the first; its late message is discarded', async () => {
  const { controller, created } = makeController();
  const draft = { feeRateBps: '0', trades: [{ side: 'buy', shares: '10', price: '5' }] };
  controller.setDraft(draft);
  controller.run();
  await tick();
  controller.run();
  await tick();
  assert.equal(created.length, 2);
  const gen1 = created[0].messages[0].generation;
  const gen2 = created[1].messages[0].generation;
  created[0].deliver({ generation: gen1, ok: true, result: coreRun(draft).result });
  assert.equal(controller.getState().status, 'busy', 'stale success must not land');
  created[1].deliver({ generation: gen2, ok: true, result: coreRun(draft).result });
  assert.equal(controller.getState().status, 'success');
});

test('cancel outside busy is a no-op; dispose keeps state', async () => {
  const { controller } = makeController();
  assert.equal(controller.cancel().status, 'empty');
  controller.setDraft({ feeRateBps: '0', trades: [{ side: 'buy', shares: '10', price: '5' }] });
  assert.equal(controller.cancel().status, 'dirty');
  assert.equal(controller.dispose().status, 'dirty');
});

test('setDraft rejects malformed drafts', () => {
  const { controller } = makeController();
  assert.throws(() => controller.setDraft(null), TypeError);
  assert.throws(() => controller.setDraft({ feeRateBps: 0, trades: [] }), TypeError);
  assert.throws(() => controller.setDraft({ feeRateBps: '0', trades: [{ side: 'buy', shares: 1, price: '1' }] }), TypeError);
});
