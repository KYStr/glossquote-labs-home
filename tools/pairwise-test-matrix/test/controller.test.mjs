// Controller tests: the SPEC's three controller fixtures plus
// generation guards, using a fake executor with controllable completion.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createController } from '../public/js/controller.mjs';

const fixtures = JSON.parse(
  await readFile(new URL('../../../docs/specs/pairwise-test-matrix/fixtures.json', import.meta.url), 'utf8'),
);
const byId = Object.fromEntries(fixtures.cases.map((c) => [c.id, c]));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function makeFake() {
  const jobs = new Map();
  return {
    executor: {
      start(snapshot, generation) {
        return new Promise((resolve, reject) => {
          jobs.set(generation, { snapshot, resolve, reject });
        });
      },
      cancel() {
        for (const [gen, job] of jobs) {
          jobs.delete(gen);
          job.reject(Object.assign(new Error('cancelled'), { code: 'CANCELLED' }));
        }
      },
    },
    pending() { return [...jobs.keys()]; },
    complete(generation, outcome) {
      const job = jobs.get(generation);
      if (job) {
        jobs.delete(generation);
        job.resolve(outcome);
      }
    },
    fail(generation, code) {
      const job = jobs.get(generation);
      if (job) {
        jobs.delete(generation);
        job.reject(Object.assign(new Error(code), { code }));
      }
    },
  };
}

const BINARY = byId['binary-triple'].expected.result;
const LARGE = byId['large-product'].input.dimensions;

test('fixture state-dirty-error', async () => {
  const f = byId['state-dirty-error'];
  const fake = makeFake();
  const c = createController(fake.executor);
  c.setDraft(f.input.initial.dimensions);
  c.run();
  assert.equal(c.snapshot().state, 'busy');
  fake.complete(1, { ok: true, result: BINARY });
  await flush();
  let s = c.snapshot();
  assert.equal(s.state, f.expected.afterRun.state);
  assert.equal(s.reportAvailable, f.expected.afterRun.reportAvailable);
  c.setDraft(f.input.edit.dimensions);
  s = c.snapshot();
  assert.equal(s.state, f.expected.afterEdit.state);
  assert.equal(s.reportAvailable, f.expected.afterEdit.reportAvailable);
  c.run();
  fake.complete(2, { ok: false, error: { code: 'PRODUCT_LIMIT', field: 'dimensions', row: null } });
  await flush();
  s = c.snapshot();
  assert.equal(s.state, f.expected.afterRerun.state);
  assert.equal(s.reportAvailable, f.expected.afterRerun.reportAvailable);
  assert.deepEqual(s.error, f.expected.afterRerun.error);
});

test('fixture state-cancel-late', async () => {
  const f = byId['state-cancel-late'];
  const fake = makeFake();
  const c = createController(fake.executor);
  c.setDraft(f.input.draft.dimensions);
  c.run();
  let s = c.snapshot();
  assert.equal(s.state, f.expected.whilePending.state);
  assert.equal(s.reportAvailable, f.expected.whilePending.reportAvailable);
  c.cancel();
  s = c.snapshot();
  assert.equal(s.state, f.expected.afterCancel.state);
  assert.equal(s.reportAvailable, f.expected.afterCancel.reportAvailable);
  assert.deepEqual(s.draft, f.expected.afterCancel.draft);
  fake.complete(1, { ok: true, result: f.input.lateResult }); // late: must not revive
  await flush();
  s = c.snapshot();
  assert.equal(s.state, f.expected.afterLateResult.state);
  assert.equal(s.reportAvailable, f.expected.afterLateResult.reportAvailable);
  c.reset();
  s = c.snapshot();
  assert.equal(s.state, f.expected.afterReset.state);
  assert.equal(s.reportAvailable, f.expected.afterReset.reportAvailable);
  assert.deepEqual(s.draft, f.expected.afterReset.draft);
});

test('fixture state-replace-late', async () => {
  const f = byId['state-replace-late'];
  const fake = makeFake();
  const c = createController(fake.executor);
  c.setDraft(f.input.olderDraft.dimensions);
  c.run(); // generation 1, pending
  assert.deepEqual(fake.pending(), [1]);
  c.setDraft(f.input.newerDraft.dimensions); // edit cancels job 1
  await flush();
  assert.equal(c.snapshot().state, 'dirty');
  c.run(); // generation 2
  assert.deepEqual(fake.pending(), [2]);
  fake.complete(2, { ok: false, error: { code: 'PRODUCT_LIMIT', field: 'dimensions', row: null } });
  await flush();
  let s = c.snapshot();
  assert.equal(s.state, f.expected.afterNewerResult.state);
  assert.deepEqual(s.error, f.expected.afterNewerResult.error);
  fake.complete(1, { ok: true, result: f.input.olderLateResult }); // stale: ignored
  await flush();
  s = c.snapshot();
  assert.equal(s.state, f.expected.afterOlderLateResult.state);
  assert.equal(s.reportAvailable, f.expected.afterOlderLateResult.reportAvailable);
  assert.deepEqual(s.error, f.expected.afterOlderLateResult.error);
});

test('run while busy replaces the running job', async () => {
  const fake = makeFake();
  const c = createController(fake.executor);
  c.setDraft('A:0|1\nB:0|1\nC:0|1');
  c.run();
  assert.deepEqual(fake.pending(), [1]);
  c.run(); // replace: job 1 cancelled, job 2 started
  assert.deepEqual(fake.pending(), [2]);
  await flush();
  assert.equal(c.snapshot().state, 'busy');
  fake.complete(2, { ok: true, result: BINARY });
  await flush();
  assert.equal(c.snapshot().state, 'success');
});

test('edit during busy terminates work and goes dirty', async () => {
  const fake = makeFake();
  const c = createController(fake.executor);
  c.setDraft('A:0|1\nB:0|1\nC:0|1');
  c.run();
  c.setDraft('A:0|1\nB:0|1');
  assert.equal(c.snapshot().state, 'dirty');
  assert.deepEqual(fake.pending(), []);
  await flush();
  assert.equal(c.snapshot().state, 'dirty');
});

test('executor failure surfaces as WORKER_ERROR and keeps the draft', async () => {
  const fake = makeFake();
  const c = createController(fake.executor);
  c.setDraft('A:0|1\nB:0|1\nC:0|1');
  c.run();
  fake.fail(1, 'WORKER_ERROR');
  await flush();
  const s = c.snapshot();
  assert.equal(s.state, 'error');
  assert.deepEqual(s.error, { code: 'WORKER_ERROR', field: null, row: null });
  assert.deepEqual(s.draft, { dimensions: 'A:0|1\nB:0|1\nC:0|1' });
});

test('report is available only in success and matches the snapshot', async () => {
  const fake = makeFake();
  const c = createController(fake.executor);
  assert.equal(c.report(), null);
  c.setDraft('A:0|1\nB:0|1\nC:0|1');
  c.run();
  fake.complete(1, { ok: true, result: BINARY });
  await flush();
  const rep = c.report();
  assert.equal(rep.ok, true);
  assert.equal(
    rep.text,
    '{"cases":[{"gain":3,"values":["0","0","0"]},{"gain":3,"values":["0","1","1"]},{"gain":3,"values":["1","0","1"]},{"gain":3,"values":["1","1","0"]}],"dimensions":["A","B","C"],"pairCount":12,"spaceSize":8}\n',
  );
  assert.equal(rep.bytes, new TextEncoder().encode(rep.text).length);
  c.setDraft(LARGE);
  assert.equal(c.report(), null);
});

test('loadExample marks the example and waits for a manual run', () => {
  const fake = makeFake();
  const c = createController(fake.executor);
  const s = c.loadExample('A:0|1\nB:0|1\nC:0|1');
  assert.equal(s.exampleLoaded, true);
  assert.equal(s.state, 'empty');
  assert.deepEqual(fake.pending(), []);
});
