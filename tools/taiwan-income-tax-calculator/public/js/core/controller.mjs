// DOM-free controller for the Taiwan Income Tax Calculator.
//
// Owns the draft, the work generation counter, and the worker lifecycle.
// States: empty -> dirty -> busy -> success | error | cancelled, per SPEC.
// A worker result is accepted only from the current worker handle, with the
// current generation, while busy — late results from superseded work can
// never revive an old result (SPEC controller fixtures).

import { DEFAULT_DRAFT, serializeReport } from './core.mjs';

function copyDraft(draft) {
  return Object.assign({}, draft);
}

function workerError() {
  return { code: 'WORKER_ERROR', field: null, row: null };
}

export function createController(options) {
  const createWorker = options && options.createWorker;
  const onChange = options && typeof options.onChange === 'function' ? options.onChange : null;

  let state = 'empty';
  let draft = copyDraft(DEFAULT_DRAFT);
  let result = null;
  let error = null;
  let generation = 0;
  let worker = null;

  function snapshot() {
    return {
      state,
      draft: copyDraft(draft),
      result: result === null ? null : Object.assign({}, result),
      error: error === null ? null : Object.assign({}, error),
      reportAvailable: state === 'success',
    };
  }

  function notify() {
    if (onChange) onChange(snapshot());
  }

  function stopWorker() {
    if (worker !== null) {
      const current = worker;
      worker = null;
      try { current.terminate(); } catch { /* already gone */ }
    }
  }

  // Any edit invalidates the previous result and download immediately.
  function edit(nextDraft) {
    stopWorker();
    generation += 1;
    draft = copyDraft(nextDraft);
    result = null;
    error = null;
    state = 'dirty';
    notify();
  }

  function run() {
    stopWorker();
    generation += 1;
    const gen = generation;
    const input = copyDraft(draft);
    result = null;
    error = null;
    if (typeof createWorker !== 'function') {
      state = 'error';
      error = workerError();
      notify();
      return;
    }
    let handle;
    try {
      handle = createWorker();
    } catch {
      state = 'error';
      error = workerError();
      notify();
      return;
    }
    worker = handle;
    state = 'busy';
    handle.onmessage = (event) => {
      if (handle !== worker) return; // superseded worker
      if (state !== 'busy') return; // cancelled / reset meanwhile
      const data = event ? event.data : null;
      if (data === null || typeof data !== 'object' || data.generation !== gen) return;
      stopWorker();
      const response = data.response;
      if (response !== null && typeof response === 'object' && response.ok === true) {
        result = response.result;
        error = null;
        state = 'success';
      } else if (response !== null && typeof response === 'object' && response.ok === false
        && response.error !== null && typeof response.error === 'object') {
        result = null;
        error = {
          code: response.error.code,
          field: response.error.field ?? null,
          row: null,
        };
        state = 'error';
      } else {
        result = null;
        error = workerError();
        state = 'error';
      }
      notify();
    };
    try {
      handle.postMessage({ generation: gen, input });
    } catch {
      stopWorker();
      state = 'error';
      error = workerError();
    }
    notify();
  }

  function cancel() {
    if (state !== 'busy') return;
    stopWorker();
    generation += 1;
    result = null;
    error = null;
    state = 'cancelled';
    notify();
  }

  function reset() {
    stopWorker();
    generation += 1;
    draft = copyDraft(DEFAULT_DRAFT);
    result = null;
    error = null;
    state = 'empty';
    notify();
  }

  // pagehide: stop work without changing the visible state.
  function dispose() {
    stopWorker();
    generation += 1;
  }

  // The report exists only for the current successful snapshot.
  function getReport() {
    if (state !== 'success' || result === null) return null;
    return serializeReport(result);
  }

  return { edit, run, cancel, reset, dispose, getReport, snapshot };
}
