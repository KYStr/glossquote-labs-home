import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createController, DEFAULT_DRAFT } from '../public/js/core/controller.mjs';
import { run } from '../public/js/core/graph.mjs';

const specDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..', 'docs', 'specs', 'dependency-reduction',
);
const fixtures = JSON.parse(await readFile(path.join(specDir, 'fixtures.json'), 'utf8'));
const controllerCases = fixtures.cases.filter((c) => c.kind === 'controller');

// A controllable fake runner: each run() call returns a deferred promise
// the test resolves or rejects by hand, like the SPEC's fake Worker.
function makeFakeRunner() {
  const calls = [];
  const runner = (input) => {
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    calls.push({ input, resolve, promise });
    return promise;
  };
  return { runner, calls };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test('fixture state-dirty-error', async () => {
  const c = controllerCases.find((x) => x.id === 'state-dirty-error');
  const { runner, calls } = makeFakeRunner();
  const controller = createController(runner);
  controller.setDraft(c.input.initial);
  controller.run();
  assert.equal(calls.length, 1);
  calls[0].resolve(run(c.input.initial));
  await tick();
  let snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterRun.state);
  assert.equal(snap.reportAvailable, c.expected.afterRun.reportAvailable);

  controller.setDraft(c.input.edit);
  snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterEdit.state);
  assert.equal(snap.reportAvailable, c.expected.afterEdit.reportAvailable);

  controller.run();
  calls[1].resolve(run(c.input.edit));
  await tick();
  snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterRerun.state);
  assert.equal(snap.reportAvailable, c.expected.afterRerun.reportAvailable);
  assert.deepEqual(snap.error, c.expected.afterRerun.error);
});

test('fixture state-cancel-late', async () => {
  const c = controllerCases.find((x) => x.id === 'state-cancel-late');
  const { runner, calls } = makeFakeRunner();
  const controller = createController(runner);
  controller.setDraft(c.input.draft);
  controller.run();
  let snap = controller.snapshot();
  assert.equal(snap.state, c.expected.whilePending.state);
  assert.equal(snap.reportAvailable, c.expected.whilePending.reportAvailable);

  controller.cancel();
  snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterCancel.state);
  assert.equal(snap.reportAvailable, c.expected.afterCancel.reportAvailable);
  assert.deepEqual(snap.draft, c.expected.afterCancel.draft);

  // The late result must not revive anything.
  calls[0].resolve({ ok: true, result: c.input.lateResult });
  await tick();
  snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterLateResult.state);
  assert.equal(snap.reportAvailable, c.expected.afterLateResult.reportAvailable);

  controller.reset();
  snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterReset.state);
  assert.equal(snap.reportAvailable, c.expected.afterReset.reportAvailable);
  assert.deepEqual(snap.draft, c.expected.afterReset.draft);
  assert.deepEqual(snap.draft, DEFAULT_DRAFT);
});

test('fixture state-replace-late', async () => {
  const c = controllerCases.find((x) => x.id === 'state-replace-late');
  const { runner, calls } = makeFakeRunner();
  const controller = createController(runner);
  controller.setDraft(c.input.olderDraft);
  controller.run();
  controller.setDraft(c.input.newerDraft);
  controller.run();
  assert.equal(calls.length, 2);
  calls[1].resolve(run(c.input.newerDraft));
  await tick();
  let snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterNewerResult.state);
  assert.equal(snap.reportAvailable, c.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(snap.error, c.expected.afterNewerResult.error);

  // The older run's late success must not overwrite the current error.
  calls[0].resolve({ ok: true, result: c.input.olderLateResult });
  await tick();
  snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterOlderLateResult.state);
  assert.equal(snap.reportAvailable, c.expected.afterOlderLateResult.reportAvailable);
  assert.deepEqual(snap.error, c.expected.afterOlderLateResult.error);
});

test('edit during busy abandons the run and goes dirty', async () => {
  let abandoned = 0;
  const { runner, calls } = makeFakeRunner();
  const controller = createController(runner, { onAbandon: () => { abandoned += 1; } });
  controller.setDraft({ modules: 'A\nB', edges: 'A>B' });
  controller.run();
  controller.setDraft({ modules: 'A\nB\nC', edges: 'A>B' });
  assert.equal(controller.snapshot().state, 'dirty');
  assert.equal(controller.snapshot().reportAvailable, false);
  assert.equal(abandoned, 1);
  calls[0].resolve(run({ modules: 'A\nB', edges: 'A>B' }));
  await tick();
  assert.equal(controller.snapshot().state, 'dirty');
});

test('cancel when idle is a no-op; reset clears everything', async () => {
  const { runner } = makeFakeRunner();
  const controller = createController(runner);
  assert.equal(controller.cancel().state, 'empty');
  controller.setDraft({ modules: 'A', edges: '' });
  assert.equal(controller.snapshot().state, 'dirty');
  const snap = controller.reset();
  assert.equal(snap.state, 'empty');
  assert.deepEqual(snap.draft, DEFAULT_DRAFT);
  assert.equal(snap.result, null);
  assert.equal(snap.error, null);
  assert.equal(snap.reportAvailable, false);
});

test('onChange fires on transitions and on async landing', async () => {
  const { runner, calls } = makeFakeRunner();
  const seen = [];
  const controller = createController(runner, { onChange: (s) => seen.push(s.state) });
  controller.setDraft({ modules: 'A', edges: '' });
  controller.run();
  calls[0].resolve({ ok: true, result: { status: 'acyclic', stages: [['A']], redundant: [], cycle: null } });
  await tick();
  await tick();
  assert.deepEqual(seen, ['dirty', 'busy', 'success']);
});
