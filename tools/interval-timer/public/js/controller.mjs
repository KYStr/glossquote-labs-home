// Draft / sequence controller for the Interval Timer.
// No DOM access: the app wires this to the form (the onChange callback
// is the view adapter), and computation runs in a Worker built through
// the injected createWorker factory. Tests drive it with a fake worker
// whose completion is controllable.
//
// States (SPEC userFlow): empty, dirty, busy, success, error, cancelled.
// - The sequence starts at 1 when the controller is created. Every
//   edit, reset and load-example increments it, and so does every run
//   that passes local validation and submits to the Worker. A run that
//   fails local validation never posts, so it leaves the sequence
//   unchanged; the state still moves to `error` with the core's error.
// - A new run while `busy` supersedes the pending one: the old worker
//   is terminated first (this is the reading the pinned
//   state-replace-late fixture requires).
// - A Worker reply is accepted only when its `sequence` equals the
//   current sequence and the controller is still `busy`; late replies
//   are dropped, never resurrected.
// - edit() from any state terminates pending work, clears the outcome
//   and goes `dirty` (SPEC userFlow: any input change revokes the old
//   result immediately).
// - cancel() while `busy` terminates the worker and goes `cancelled`,
//   keeping the draft; a late result afterwards cannot revive it.
// - Worker construction, script loading or messaging failure goes to
//   `error` with WORKER_ERROR (never a fabricated result); the draft is
//   kept for retry.
// - reset() is synchronous and restores the pinned default draft.

import {
  DEFAULTS,
  EXAMPLE,
  FIELDS,
  isDraftShapeValid,
  run as coreRun,
} from "./core/interval-timer.mjs";

export const WORKER_ERROR = { code: "WORKER_ERROR", field: null, row: null };

function draftEquals(a, b) {
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  return FIELDS.every((field) => a[field] === b[field]);
}

export function createController({ createWorker, onChange = () => {} }) {
  let sequence = 1;
  let state = "empty";
  let draft = { ...DEFAULTS };
  let result = null;
  let error = null;
  let worker = null;

  function getPublicState() {
    return {
      state,
      draft: { ...draft },
      result,
      error,
      reportAvailable: state === "success",
      sequence,
    };
  }

  function emit() {
    onChange(getPublicState());
  }

  function terminateWorker() {
    if (worker !== null) {
      try {
        worker.terminate();
      } catch {
        // Terminating a dead worker must not change the state.
      }
      worker = null;
    }
  }

  function edit(nextDraft) {
    if (!isDraftShapeValid(nextDraft)) return getPublicState();
    sequence += 1;
    terminateWorker();
    draft = { ...nextDraft };
    result = null;
    error = null;
    state = "dirty";
    emit();
    return getPublicState();
  }

  function loadExample() {
    return edit({ ...EXAMPLE });
  }

  function run() {
    if (state === "busy") terminateWorker();
    const outcome = coreRun({ ...draft });
    if (!outcome.ok) {
      result = null;
      error = outcome.error;
      state = "error";
      emit();
      return getPublicState();
    }
    sequence += 1;
    state = "busy";
    result = null;
    error = null;
    emit();
    const runSequence = sequence;
    const runDraft = { ...draft };
    let nextWorker;
    try {
      nextWorker = createWorker();
    } catch {
      error = WORKER_ERROR;
      state = "error";
      emit();
      return getPublicState();
    }
    worker = nextWorker;
    worker.onerror = () => {
      if (state !== "busy" || runSequence !== sequence) return;
      terminateWorker();
      error = WORKER_ERROR;
      state = "error";
      emit();
    };
    worker.onmessage = (messageEvent) => {
      const data = messageEvent?.data;
      if (state !== "busy" || runSequence !== sequence) return;
      if (!data || data.type !== "result" || data.sequence !== runSequence) return;
      if (!draftEquals(runDraft, draft)) return;
      terminateWorker();
      if (data.outcome?.ok) {
        result = data.outcome.result;
        error = null;
        state = "success";
      } else {
        result = null;
        error = data.outcome?.error ?? WORKER_ERROR;
        state = "error";
      }
      emit();
    };
    try {
      worker.postMessage({ type: "run", sequence: runSequence, input: runDraft });
    } catch {
      terminateWorker();
      error = WORKER_ERROR;
      state = "error";
      emit();
    }
    return getPublicState();
  }

  function cancel() {
    if (state !== "busy") return getPublicState();
    terminateWorker();
    result = null;
    error = null;
    state = "cancelled";
    emit();
    return getPublicState();
  }

  function reset() {
    sequence += 1;
    terminateWorker();
    draft = { ...DEFAULTS };
    result = null;
    error = null;
    state = "empty";
    emit();
    return getPublicState();
  }

  return { getPublicState, edit, loadExample, run, cancel, reset };
}
