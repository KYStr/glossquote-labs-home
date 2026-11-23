// Draft / work-generation controller for the HbA1c Converter.
// No DOM access: the app wires this to the form, the controller talks to
// a Worker through the injected createWorker factory, and tests drive it
// with a fake worker whose completion is controllable.
//
// States (SPEC userFlow): empty, dirty, busy, success, error, cancelled.
// - run() invalidates any old result, bumps the generation, and posts the
//   current draft snapshot to a fresh worker. Only a reply carrying the
//   current generation while still busy is accepted; late replies are
//   dropped, never resurrected.
// - edit() with a changed draft terminates any pending work and goes
//   dirty (any input change revokes the old result and download, per the
//   SPEC state table); an unchanged draft leaves the state alone.
// - cancel() terminates the worker and keeps the draft; a late reply
//   after cancelling cannot revive the result.
// - reset() stops work, restores the defaults, and returns to empty.

import { DEFAULT_DRAFT, EXAMPLE } from './core/convert.mjs';

export { DEFAULT_DRAFT, EXAMPLE };

export const WORKER_ERROR = { code: 'WORKER_ERROR', field: null, row: null };

export function createController({ createWorker, onChange = () => {} }) {
  let generation = 0;
  let state = 'empty';
  let draft = { ...DEFAULT_DRAFT };
  let isExample = false;
  let result = null;
  let error = null;
  let worker = null;

  function emit() {
    onChange(getPublicState());
  }

  function terminateWorker() {
    if (worker !== null) {
      try {
        worker.terminate();
      } catch {
        // Terminating a dead worker is not an error state for the UI.
      }
      worker = null;
    }
  }

  function getPublicState() {
    return {
      state,
      draft: { ...draft },
      isExample,
      result,
      error,
      reportAvailable: state === 'success' && result !== null,
    };
  }

  function run(nextDraft) {
    if (nextDraft !== undefined) draft = { ...nextDraft };
    terminateWorker();
    generation += 1;
    result = null;
    error = null;
    state = 'busy';
    const snapshot = { ...draft };
    const postedGeneration = generation;
    let nextWorker;
    try {
      nextWorker = createWorker();
    } catch {
      state = 'error';
      error = { ...WORKER_ERROR };
      emit();
      return getPublicState();
    }
    worker = nextWorker;
    worker.onmessage = (event) => {
      const data = event.data;
      if (data === null || typeof data !== 'object') return;
      // Compare against the live generation counter, not the captured
      // postedGeneration: a cancel, edit, reset, destroy or newer run
      // bumps the counter, so any reply from the superseded generation
      // is dropped even while a newer job is still busy.
      if (data.generation !== generation || state !== 'busy') return;
      terminateWorker();
      if (data.ok === true) {
        result = data.result;
        error = null;
        state = 'success';
      } else {
        result = null;
        error = data.error ?? { ...WORKER_ERROR };
        state = 'error';
      }
      emit();
    };
    worker.onerror = () => {
      // No generation rides on an error event: accept it only while
      // this worker is still the current one and a job is busy.
      if (worker !== nextWorker || state !== 'busy') return;
      terminateWorker();
      result = null;
      error = { ...WORKER_ERROR };
      state = 'error';
      emit();
    };
    try {
      worker.postMessage({ snapshot, generation: postedGeneration });
    } catch {
      terminateWorker();
      result = null;
      error = { ...WORKER_ERROR };
      state = 'error';
    }
    emit();
    return getPublicState();
  }

  function edit(nextDraft) {
    const changed = nextDraft.value !== draft.value || nextDraft.unit !== draft.unit;
    draft = { ...nextDraft };
    isExample = false;
    if (!changed) {
      emit();
      return getPublicState();
    }
    if (state === 'busy') {
      terminateWorker();
      generation += 1;
    }
    result = null;
    error = null;
    state = 'dirty';
    emit();
    return getPublicState();
  }

  function loadExample() {
    const wasBusy = state === 'busy';
    draft = { ...EXAMPLE };
    isExample = true;
    if (wasBusy) {
      terminateWorker();
      generation += 1;
      result = null;
      error = null;
      state = 'dirty';
    } else if (state === 'success' || state === 'error' || state === 'cancelled') {
      result = null;
      error = null;
      state = 'dirty';
    }
    emit();
    return getPublicState();
  }

  function cancel() {
    if (state !== 'busy') {
      emit();
      return getPublicState();
    }
    terminateWorker();
    generation += 1;
    result = null;
    error = null;
    state = 'cancelled';
    emit();
    return getPublicState();
  }

  function reset() {
    terminateWorker();
    generation += 1;
    draft = { ...DEFAULT_DRAFT };
    isExample = false;
    result = null;
    error = null;
    state = 'empty';
    emit();
    return getPublicState();
  }

  function destroy() {
    terminateWorker();
    generation += 1;
  }

  return { getState: getPublicState, run, edit, loadExample, cancel, reset, destroy };
}
