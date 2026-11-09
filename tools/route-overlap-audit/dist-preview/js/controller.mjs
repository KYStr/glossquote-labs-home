// Route Overlap Audit — draft / work-generation controller.
// Pure state machine over the Worker boundary. No DOM access: the app wires
// DOM events to this controller and renders its snapshots. A fake Worker
// (createWorker returning an object with postMessage/terminate/onmessage)
// makes every state transition unit-testable in Node.
//
// States (SPEC userFlow):
//   empty     — initial load / reset, no result, draft is the default.
//   dirty     — any draft change after the pristine state, or after an
//               outcome existed: the old result/download is revoked.
//   busy      — a run is in flight; only the current generation is accepted.
//   success   — the report matches the current snapshot; download available.
//   error     — the run failed; the draft is kept, no result.
//   cancelled — the run was cancelled; the draft is kept, no result.
//
// Generation rule: every run increments the generation. A Worker reply whose
// generation is not the current one, or whose Worker is no longer the live
// one, is discarded. Editing while busy terminates the Worker and revokes
// the in-flight run. A successful run also stops the Worker.

import { serializeReport, REPORT_FILENAME } from './core/core.mjs';

export { REPORT_FILENAME };

export const DEFAULT_DRAFT = Object.freeze({ routes: '' });

export function createController({ createWorker }) {
  if (typeof createWorker !== 'function') {
    throw new TypeError('createWorker is required');
  }

  let state = 'empty';
  let draft = { routes: '' };
  let result = null;
  let report = null;
  let error = null;
  let generation = 0;
  let worker = null;
  const listeners = new Set();

  function snapshot() {
    return {
      state,
      draft: { ...draft },
      result,
      // The report ({filename, text}) exists only while the state is success;
      // the app turns it into a Blob URL only on an explicit download click.
      report,
      reportAvailable: report !== null,
      error,
    };
  }

  function emit() {
    const snap = snapshot();
    for (const listener of listeners) listener(snap);
    return snap;
  }

  function terminateWorker() {
    if (worker !== null) {
      try {
        worker.terminate();
      } catch {
        // Termination is best-effort; the generation guard still applies.
      }
      worker = null;
    }
  }

  function revokeOutcome() {
    result = null;
    report = null;
    error = null;
  }

  // Replace the draft. Any content change revokes the previous outcome and
  // moves the state to dirty (editing while busy also stops the old job).
  function setDraft(next) {
    const routes = typeof next === 'string'
      ? next
      : (next && typeof next.routes === 'string' ? next.routes : '');
    if (routes === draft.routes) return snapshot();
    draft = { routes };
    if (state === 'busy') terminateWorker();
    revokeOutcome();
    state = 'dirty';
    return emit();
  }

  // Start a run of the current draft snapshot. Ignored while a run is busy;
  // the UI disables the primary action in that state.
  function runAudit() {
    if (state === 'busy') return snapshot();
    terminateWorker();
    generation += 1;
    const runGeneration = generation;
    revokeOutcome();
    state = 'busy';
    emit();

    let current;
    try {
      current = createWorker();
    } catch {
      state = 'error';
      error = { code: 'WORKER_ERROR', field: null, row: null };
      return emit();
    }
    worker = current;
    current.onmessage = (event) => {
      const data = event && event.data;
      if (!data || data.generation !== runGeneration) return;
      if (worker !== current) return;
      terminateWorker();
      if (data.ok) {
        const serialized = serializeReport(data.result);
        if (!serialized.ok) {
          state = 'error';
          error = serialized.error;
          result = null;
          report = null;
        } else {
          result = data.result;
          report = { filename: REPORT_FILENAME, text: serialized.text };
          state = 'success';
          error = null;
        }
      } else {
        state = 'error';
        error = data.error || { code: 'INTERNAL', field: null, row: null };
        result = null;
        report = null;
      }
      emit();
    };
    current.onerror = () => {
      if (worker !== current) return;
      terminateWorker();
      state = 'error';
      error = { code: 'WORKER_ERROR', field: null, row: null };
      result = null;
      report = null;
      emit();
    };
    try {
      current.postMessage({ generation: runGeneration, input: { routes: draft.routes } });
    } catch {
      terminateWorker();
      state = 'error';
      error = { code: 'WORKER_ERROR', field: null, row: null };
      emit();
    }
    return snapshot();
  }

  function cancel() {
    if (state !== 'busy') return snapshot();
    terminateWorker();
    revokeOutcome();
    state = 'cancelled';
    return emit();
  }

  function reset() {
    terminateWorker();
    draft = { routes: '' };
    revokeOutcome();
    state = 'empty';
    return emit();
  }

  // Release the Worker without changing state (pagehide). A bfcache return
  // is handled by the app calling reset().
  function dispose() {
    terminateWorker();
    return snapshot();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getState() {
    return snapshot();
  }

  return { setDraft, runAudit, cancel, reset, dispose, subscribe, getState };
}
