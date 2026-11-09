// Controller tests for Binary Record Inspector.
// The three controller fixtures come from docs/specs/.../fixtures.json;
// a controllable fake Worker stands in for the real module Worker.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { run } from '../public/js/core/inspector.mjs';
import { Controller } from '../public/js/controller.mjs';

const fixturesUrl = new URL(
  '../../../docs/specs/binary-record-inspector/fixtures.json',
  import.meta.url,
);
const fixtures = JSON.parse(await readFile(fixturesUrl, 'utf8'));
const byId = Object.fromEntries(fixtures.cases.map((c) => [c.id, c]));

class FakeWorker {
  constructor() {
    this.messages = [];
    this.terminated = false;
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
    if (typeof this.onmessage === 'function') this.onmessage({ data });
  }
}

function makeController(workers) {
  return new Controller({
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
  });
}

test('fixture state-dirty-error', () => {
  const fixture = byId['state-dirty-error'];
  const workers = [];
  const controller = makeController(workers);

  controller.setDraft(fixture.input.initial);
  controller.run();
  assert.equal(workers.length, 1);
  const firstGeneration = workers[0].messages[0].generation;
  workers[0].deliver({ generation: firstGeneration, ...run(fixture.input.initial) });
  assert.equal(controller.state, fixture.expected.afterRun.state);
  assert.equal(controller.reportAvailable, fixture.expected.afterRun.reportAvailable);

  controller.setDraft(fixture.input.edit);
  assert.equal(controller.state, fixture.expected.afterEdit.state);
  assert.equal(controller.reportAvailable, fixture.expected.afterEdit.reportAvailable);

  controller.run();
  const secondGeneration = workers[1].messages[0].generation;
  workers[1].deliver({ generation: secondGeneration, ...run(fixture.input.edit) });
  assert.equal(controller.state, fixture.expected.afterRerun.state);
  assert.equal(controller.reportAvailable, fixture.expected.afterRerun.reportAvailable);
  assert.deepEqual(controller.error, fixture.expected.afterRerun.error);
});

test('fixture state-cancel-late', () => {
  const fixture = byId['state-cancel-late'];
  const workers = [];
  const controller = makeController(workers);

  controller.setDraft(fixture.input.draft);
  controller.run();
  assert.equal(controller.state, fixture.expected.whilePending.state);
  assert.equal(controller.reportAvailable, fixture.expected.whilePending.reportAvailable);

  controller.cancel();
  assert.equal(controller.state, fixture.expected.afterCancel.state);
  assert.equal(controller.reportAvailable, fixture.expected.afterCancel.reportAvailable);
  assert.deepEqual(controller.draft, fixture.expected.afterCancel.draft);
  assert.equal(workers[0].terminated, true);

  // The delayed success of the cancelled generation must not resurrect it.
  const cancelledGeneration = workers[0].messages[0].generation;
  workers[0].deliver({ generation: cancelledGeneration, ok: true, result: fixture.input.lateResult });
  assert.equal(controller.state, fixture.expected.afterLateResult.state);
  assert.equal(controller.reportAvailable, fixture.expected.afterLateResult.reportAvailable);

  controller.reset();
  assert.equal(controller.state, fixture.expected.afterReset.state);
  assert.equal(controller.reportAvailable, fixture.expected.afterReset.reportAvailable);
  assert.deepEqual(controller.draft, fixture.expected.afterReset.draft);
});

test('fixture state-replace-late', () => {
  const fixture = byId['state-replace-late'];
  const workers = [];
  const controller = makeController(workers);

  controller.setDraft(fixture.input.olderDraft);
  controller.run();
  assert.equal(workers[0].terminated, false);

  controller.setDraft(fixture.input.newerDraft);
  assert.equal(workers[0].terminated, true);
  controller.run();
  const newerGeneration = workers[1].messages[0].generation;
  workers[1].deliver({ generation: newerGeneration, ...run(fixture.input.newerDraft) });
  assert.equal(controller.state, fixture.expected.afterNewerResult.state);
  assert.equal(controller.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(controller.error, fixture.expected.afterNewerResult.error);

  // The older job's late success must not overwrite the current error.
  const olderGeneration = workers[0].messages[0].generation;
  workers[0].deliver({ generation: olderGeneration, ok: true, result: fixture.input.olderLateResult });
  assert.equal(controller.state, fixture.expected.afterOlderLateResult.state);
  assert.equal(controller.reportAvailable, fixture.expected.afterOlderLateResult.reportAvailable);
  assert.deepEqual(controller.error, fixture.expected.afterOlderLateResult.error);
});

test('edit during busy terminates the worker and discards its late reply', () => {
  const workers = [];
  const controller = makeController(workers);
  controller.setDraft({ hex: 'ff', layout: 'a\t0\tu8' });
  controller.run();
  assert.equal(controller.state, 'busy');
  controller.setDraft({ hex: '00', layout: 'a\t0\tu8' });
  assert.equal(workers[0].terminated, true);
  assert.equal(controller.state, 'dirty');
  const busyGeneration = workers[0].messages[0].generation;
  workers[0].deliver({ generation: busyGeneration, ok: true, result: { byteCount: 1, fields: [] } });
  assert.equal(controller.state, 'dirty');
  assert.equal(controller.reportAvailable, false);
});

test('worker creation failure becomes WORKER_ERROR', () => {
  const controller = new Controller({
    createWorker: () => {
      throw new Error('no worker');
    },
  });
  controller.setDraft({ hex: 'ff', layout: 'a\t0\tu8' });
  controller.run();
  assert.equal(controller.state, 'error');
  assert.deepEqual(controller.error, { code: 'WORKER_ERROR', field: null, row: null });
});

test('loadExample fills the endian-and-sign case and goes dirty', () => {
  const workers = [];
  const controller = makeController(workers);
  controller.loadExample();
  assert.deepEqual(controller.draft, {
    hex: 'FF 80 00 01',
    layout: 'a\t0\tu16be\nb\t0\tu16le\nc\t1\ti8',
  });
  assert.equal(controller.state, 'dirty');
});

test('clearing both fields back to the default returns to empty', () => {
  const workers = [];
  const controller = makeController(workers);
  controller.setDraft({ hex: 'ff', layout: 'a\t0\tu8' });
  assert.equal(controller.state, 'dirty');
  controller.setDraft({ hex: '', layout: '' });
  assert.equal(controller.state, 'empty');
});
