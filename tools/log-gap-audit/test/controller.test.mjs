// Controller state tests: the 3 controller fixtures from fixtures.json,
// driven with a fake worker whose delivery time the test controls.
// Late results must never revive a cancelled, replaced, or edited outcome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuditController, DEFAULT_DRAFT } from '../public/js/controller.mjs';

const specDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'docs',
  'specs',
  'log-gap-audit',
);
const fixtures = JSON.parse(await readFile(path.join(specDir, 'fixtures.json'), 'utf8'));
const byId = Object.fromEntries(fixtures.cases.map((c) => [c.id, c]));

class FakeWorker {
  constructor() {
    this.terminated = false;
    this.messages = [];
    this.onmessage = null;
    this.onerror = null;
  }

  postMessage(message) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  deliver(data) {
    if (this.onmessage) this.onmessage({ data });
  }

  fail() {
    if (this.onerror) this.onerror(new Error('worker failed'));
  }
}

function makeController() {
  const workers = [];
  const controller = new AuditController({
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    onChange: () => {},
  });
  return { controller, workers };
}

const bothGapsResult = byId['both-gaps'].expected.result;

test('state-dirty-error: success, edit invalidates, rerun errors TIME row 2', async () => {
  const { controller, workers } = makeController();
  const initial = byId['state-dirty-error'].input.initial;
  const edit = byId['state-dirty-error'].input.edit;

  controller.setDraft(initial);
  assert.equal(controller.state, 'dirty');
  await controller.run();
  assert.equal(controller.state, 'busy');
  assert.equal(workers.length, 1);
  assert.deepEqual(workers[0].messages[0].input, initial);

  workers[0].deliver({ generation: workers[0].messages[0].generation, ok: true, result: bothGapsResult });
  assert.equal(controller.state, 'success');
  assert.deepEqual(controller.result, bothGapsResult);
  assert.notEqual(controller.downloadPayload(), null);
  assert.equal(workers[0].terminated, true); // worker stops after success

  controller.setDraft(edit);
  assert.equal(controller.state, 'dirty');
  assert.equal(controller.result, null);
  assert.equal(controller.downloadPayload(), null);

  await controller.run();
  assert.equal(controller.state, 'busy');
  workers[1].deliver({
    generation: workers[1].messages[0].generation,
    ok: false,
    error: { code: 'TIME', field: 'records', row: 2 },
  });
  assert.equal(controller.state, 'error');
  assert.deepEqual(controller.error, { code: 'TIME', field: 'records', row: 2 });
  assert.equal(controller.downloadPayload(), null);
});

test('state-cancel-late: cancel keeps the draft, late result cannot revive it, reset restores defaults', async () => {
  const { controller, workers } = makeController();
  const draft = byId['state-cancel-late'].input.draft;

  controller.setDraft(draft);
  await controller.run();
  assert.equal(controller.state, 'busy');
  assert.equal(controller.downloadPayload(), null);

  controller.cancel();
  assert.equal(controller.state, 'cancelled');
  assert.deepEqual(controller.draft, draft);
  assert.equal(controller.downloadPayload(), null);
  assert.equal(workers[0].terminated, true);

  workers[0].deliver({
    generation: workers[0].messages[0].generation,
    ok: true,
    result: byId['state-cancel-late'].input.lateResult,
  });
  assert.equal(controller.state, 'cancelled');
  assert.equal(controller.result, null);
  assert.equal(controller.downloadPayload(), null);

  controller.reset();
  assert.equal(controller.state, 'empty');
  assert.deepEqual(controller.draft, DEFAULT_DRAFT);
  assert.equal(controller.downloadPayload(), null);
});

test('state-replace-late: newer error survives an older late success', async () => {
  const { controller, workers } = makeController();
  const olderDraft = byId['state-replace-late'].input.olderDraft;
  const newerDraft = byId['state-replace-late'].input.newerDraft;

  controller.setDraft(olderDraft);
  await controller.run();
  assert.equal(workers.length, 1);

  controller.setDraft(newerDraft);
  assert.equal(controller.state, 'dirty');
  assert.equal(workers[0].terminated, true);
  await controller.run();
  assert.equal(workers.length, 2);

  workers[1].deliver({
    generation: workers[1].messages[0].generation,
    ok: false,
    error: { code: 'TIME', field: 'records', row: 2 },
  });
  assert.equal(controller.state, 'error');
  assert.deepEqual(controller.error, { code: 'TIME', field: 'records', row: 2 });

  workers[0].deliver({
    generation: workers[0].messages[0].generation,
    ok: true,
    result: byId['state-replace-late'].input.olderLateResult,
  });
  assert.equal(controller.state, 'error');
  assert.deepEqual(controller.error, { code: 'TIME', field: 'records', row: 2 });
  assert.equal(controller.result, null);
  assert.equal(controller.downloadPayload(), null);
});

test('editing while busy terminates the job and goes dirty', async () => {
  const { controller, workers } = makeController();
  controller.setDraft({ records: '10\t0\n13\t1500', threshold: '1000' });
  await controller.run();
  assert.equal(controller.state, 'busy');
  controller.setDraft({ records: '10\t0\n13\t1500\n14\t2500' });
  assert.equal(controller.state, 'dirty');
  assert.equal(workers[0].terminated, true);
  assert.equal(controller.downloadPayload(), null);
});

test('reset while busy terminates the job and empties the draft', async () => {
  const { controller, workers } = makeController();
  controller.setDraft({ records: '10\t0', threshold: '1000' });
  await controller.run();
  controller.reset();
  assert.equal(controller.state, 'empty');
  assert.deepEqual(controller.draft, DEFAULT_DRAFT);
  assert.equal(workers[0].terminated, true);
});

test('loadExample marks the example and waits for a manual run', () => {
  const { controller } = makeController();
  controller.loadExample();
  assert.equal(controller.state, 'dirty');
  assert.equal(controller.exampleLoaded, true);
  assert.deepEqual(controller.draft, { records: '10\t0\n13\t1500\n14\t2500', threshold: '1000' });
  controller.setDraft({ records: '1\t0' });
  assert.equal(controller.exampleLoaded, false);
});

test('loadFile fills records; a late buffer is discarded', async () => {
  const { controller } = makeController();
  let resolveSlow;
  const slow = new Promise((resolve) => { resolveSlow = resolve; });
  const slowFile = { arrayBuffer: () => slow };
  const loadPromise = controller.loadFile(slowFile);
  controller.setDraft({ records: '9\t9', threshold: '1000' });
  resolveSlow(new TextEncoder().encode('1\t0\n2\t5'));
  await loadPromise;
  assert.deepEqual(controller.draft, { records: '9\t9', threshold: '1000' });

  const fastFile = { arrayBuffer: async () => new TextEncoder().encode('1\t0\n2\t5') };
  await controller.loadFile(fastFile);
  assert.equal(controller.draft.records, '1\t0\n2\t5');
  assert.equal(controller.state, 'dirty');
});

test('loadFile read failure is INTERNAL and keeps the draft', async () => {
  const { controller } = makeController();
  controller.setDraft({ records: '1\t0', threshold: '1000' });
  const failingFile = { arrayBuffer: async () => { throw new Error('read failed'); } };
  await controller.loadFile(failingFile);
  assert.equal(controller.state, 'error');
  assert.deepEqual(controller.error, { code: 'INTERNAL', field: null, row: null });
  assert.equal(controller.draft.records, '1\t0');
});

test('worker creation failure is WORKER_ERROR', async () => {
  const controller = new AuditController({
    createWorker: () => { throw new Error('no worker'); },
    onChange: () => {},
  });
  controller.setDraft({ records: '1\t0', threshold: '1000' });
  await controller.run();
  assert.equal(controller.state, 'error');
  assert.deepEqual(controller.error, { code: 'WORKER_ERROR', field: null, row: null });
});

test('worker onerror is WORKER_ERROR', async () => {
  const { controller, workers } = makeController();
  controller.setDraft({ records: '1\t0', threshold: '1000' });
  await controller.run();
  workers[0].fail();
  assert.equal(controller.state, 'error');
  assert.deepEqual(controller.error, { code: 'WORKER_ERROR', field: null, row: null });
});

test('a result for a stale generation is ignored even while busy', async () => {
  const { controller, workers } = makeController();
  controller.setDraft({ records: '1\t0', threshold: '1000' });
  await controller.run();
  workers[0].deliver({ generation: 999, ok: true, result: bothGapsResult });
  assert.equal(controller.state, 'busy');
  assert.equal(controller.result, null);
});
