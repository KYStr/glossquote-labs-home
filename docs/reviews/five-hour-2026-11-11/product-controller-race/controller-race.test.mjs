import assert from 'node:assert/strict';
import { test } from 'node:test';

const tools = [
  'age-calculator',
  'bill-split-calculator',
  'clothing-size-converter',
  'dew-point-calculator',
  'feels-like-temperature',
  'period-cycle-calculator',
  'race-time-predictor',
  'salary-converter',
];
const controllerPath = slug =>
  new URL('../../../../tools/' + slug + '/public/js/controller.mjs', import.meta.url);
const transitions = [
  ['run again', () => {}],
  ['cancel, then run', controller => controller.cancel()],
  ['edit, then run', controller => {
    const [field, value] = Object.entries(controller.getState().draft)[0];
    controller.edit({ [field]: value + ' changed' });
    assert.equal(controller.getState().state, 'dirty');
  }],
  ['reset, then run', controller => controller.reset()],
];
const outcomes = [
  ['success', { ok: true, result: { marker: 'old result' } }],
  ['validation error', { ok: false, error: { code: 'EMPTY', field: 'input', row: null } }],
];
const currentResult = { marker: 'current result' };

function setup(createController) {
  const workers = [];
  const stateChanges = [];
  const controller = createController({
    createWorker() {
      const worker = {
        terminated: false,
        postMessage(message) {
          this.posted = structuredClone(message);
        },
        terminate() {
          this.terminated = true;
        },
      };
      workers.push(worker);
      return worker;
    },
    onChange(state) {
      stateChanges.push(structuredClone(state));
    },
  });
  controller.loadExample();
  controller.run();
  return { controller, workers, stateChanges };
}

function assertBusy(controller, worker) {
  const state = controller.getState();
  assert.equal(state.state, 'busy');
  assert.equal(state.result, null);
  assert.equal(state.error, null);
  assert.equal(state.reportAvailable, false);
  assert.equal(worker.terminated, false);
}

function assertCurrentSuccess(controller, worker) {
  worker.onmessage({ data: { generation: worker.posted.generation, ok: true, result: currentResult } });
  const state = controller.getState();
  assert.equal(state.state, 'success');
  assert.deepEqual(state.result, currentResult);
  assert.equal(state.error, null);
  assert.equal(state.reportAvailable, true);
  assert.equal(worker.terminated, true);
}

for (const slug of tools) {
  const { createController } = await import(controllerPath(slug));
  for (const [route, transition] of transitions) {
    for (const [outcome, payload] of outcomes) {
      test(slug + ': ignores stale ' + outcome + ' after ' + route, () => {
        const { controller, workers, stateChanges } = setup(createController);
        const old = workers[0];
        const retainedCallback = old.onmessage;
        transition(controller);
        controller.run();
        const current = workers[1];
        assert.notEqual(current.posted.generation, old.posted.generation);
        assert.equal(old.terminated, true);
        assertBusy(controller, current);
        const before = structuredClone(controller.getState());
        const emittedBefore = stateChanges.length;

        retainedCallback({ data: { generation: old.posted.generation, ...payload } });

        assertBusy(controller, current);
        assert.deepEqual(controller.getState(), before);
        assert.equal(stateChanges.length, emittedBefore);
        assertCurrentSuccess(controller, current);
      });
    }
  }

  test(slug + ': settles current success', () => {
    const { controller, workers: [worker] } = setup(createController);
    assertCurrentSuccess(controller, worker);
  });

  test(slug + ': rejects wrong payload generation from the current worker', () => {
    const { controller, workers: [worker] } = setup(createController);
    worker.onmessage({ data: { generation: worker.posted.generation + 1, ok: true, result: currentResult } });
    assertBusy(controller, worker);
    assertCurrentSuccess(controller, worker);
  });

  test(slug + ': ignores stale onerror and accepts current validation error', () => {
    const { controller, workers, stateChanges } = setup(createController);
    const retainedError = workers[0].onerror;
    controller.run();
    const current = workers[1];
    const emittedBefore = stateChanges.length;
    retainedError({ message: 'stale' });
    assertBusy(controller, current);
    assert.equal(stateChanges.length, emittedBefore);

    const error = { code: 'EMPTY', field: 'input', row: null };
    current.onmessage({ data: { generation: current.posted.generation, ok: false, error } });
    const state = controller.getState();
    assert.equal(state.state, 'error');
    assert.deepEqual(state.error, error);
    assert.equal(state.result, null);
    assert.equal(state.reportAvailable, false);
    assert.equal(current.terminated, true);
  });
}
