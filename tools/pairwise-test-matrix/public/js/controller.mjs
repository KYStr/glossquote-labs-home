// Draft / work-generation controller. Pure logic, no DOM.
// Owns the state machine (empty, dirty, busy, success, error, cancelled),
// generation numbers, and the rule that only the current generation's
// result, received while busy, may land. The executor is injected:
//   executor.start(snapshot, generation) -> Promise<outcome>
//   executor.cancel() -> void (must reject the pending promise with an
//   error whose .code is 'CANCELLED' when there is one)
// Any other executor rejection surfaces as WORKER_ERROR. The browser
// executor runs the core in a module Worker; tests inject a fake with
// controllable completion time.

import { buildReport } from './core/pairwise.mjs';

export const DEFAULT_DRAFT = Object.freeze({ dimensions: '' });

export function createController(executor) {
  let state = 'empty';
  let draft = { dimensions: '' };
  let result = null;
  let error = null;
  let exampleLoaded = false;
  let generation = 0;
  let pendingGeneration = 0;
  const listeners = new Set();

  function snapshot() {
    return {
      state,
      draft: { ...draft },
      result,
      error,
      exampleLoaded,
      reportAvailable: state === 'success' && result !== null,
    };
  }

  function emit() {
    const s = snapshot();
    for (const fn of listeners) fn(s);
  }

  function invalidateWork() {
    result = null;
    error = null;
  }

  // Any draft change: terminate running work and invalidate old results.
  // From empty/dirty the state does not change; from busy it becomes
  // dirty; from success/error/cancelled it becomes dirty.
  function setDraft(dimensions) {
    const changed = dimensions !== draft.dimensions;
    draft = { dimensions };
    exampleLoaded = false;
    if (state === 'busy') {
      executor.cancel();
      pendingGeneration = 0;
      invalidateWork();
      state = 'dirty';
    } else if (state === 'success' || state === 'error' || state === 'cancelled') {
      invalidateWork();
      state = 'dirty';
    }
    if (changed) emit();
    return snapshot();
  }

  function loadExample(dimensions) {
    setDraft(dimensions);
    exampleLoaded = true;
    emit();
    return snapshot();
  }

  function run() {
    const input = { dimensions: draft.dimensions };
    if (state === 'busy') {
      // Replacing running work: terminate it first (SPEC implementation).
      executor.cancel();
    }
    generation += 1;
    const gen = generation;
    pendingGeneration = gen;
    invalidateWork();
    state = 'busy';
    emit();
    let started;
    try {
      started = executor.start(input, gen);
    } catch (err) {
      if (pendingGeneration === gen && state === 'busy') {
        error = { code: 'WORKER_ERROR', field: null, row: null };
        state = 'error';
        pendingGeneration = 0;
        emit();
      }
      return snapshot();
    }
    Promise.resolve(started).then(
      (outcome) => {
        if (pendingGeneration !== gen || state !== 'busy') return; // late: ignore
        pendingGeneration = 0;
        if (outcome && outcome.ok) {
          result = outcome.result;
          error = null;
          state = 'success';
        } else if (outcome && outcome.error) {
          error = outcome.error;
          result = null;
          state = 'error';
        } else {
          error = { code: 'WORKER_ERROR', field: null, row: null };
          result = null;
          state = 'error';
        }
        emit();
      },
      (err) => {
        if (err && err.code === 'CANCELLED') return; // superseded or cancelled
        if (pendingGeneration !== gen || state !== 'busy') return;
        pendingGeneration = 0;
        error = { code: 'WORKER_ERROR', field: null, row: null };
        result = null;
        state = 'error';
        emit();
      },
    );
    return snapshot();
  }

  function cancel() {
    if (state !== 'busy') return snapshot();
    executor.cancel();
    pendingGeneration = 0;
    invalidateWork();
    state = 'cancelled';
    emit();
    return snapshot();
  }

  function reset() {
    if (state === 'busy') {
      executor.cancel();
      pendingGeneration = 0;
    }
    draft = { dimensions: '' };
    exampleLoaded = false;
    invalidateWork();
    state = 'empty';
    emit();
    return snapshot();
  }

  // Report for the current successful result, or null when no report
  // is available. Over the byte cap it returns the OUTPUT_LIMIT failure.
  function report() {
    if (state !== 'success' || !result) return null;
    return buildReport(result);
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { snapshot, setDraft, loadExample, run, cancel, reset, report, onChange };
}
