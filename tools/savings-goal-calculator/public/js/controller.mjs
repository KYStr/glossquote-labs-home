// Draft / sequence controller for the Savings Goal Calculator.
// No DOM access: the app wires this to the form (the onChange callback
// is the view adapter), and computation runs in a Worker built through
// the injected createWorker factory. Tests drive it with a fake worker
// whose completion is controllable. The draft lives only in this page
// (SPEC forbids persistent storage); switching language or leaving
// the page discards it.
//
// States (SPEC section 2): empty, dirty, busy, success, error,
// cancelled.
// - The sequence starts at 1 when the controller is created. Every
//   edit, reset, load-example and cancel increments it, and so does
//   every run that passes local validation and submits to the Worker.
//   A run that fails local validation never posts, so it leaves the
//   sequence unchanged; this is the reading the pinned fixture
//   sequences require (see HANDOFF.md).
// - run() validates the draft locally first (the pure core). A local
//   failure goes straight to `error` with the core's error and no
//   worker is created. A valid draft is posted to a fresh worker.
// - A Worker reply is accepted only when its `sequence` equals the
//   current sequence, its echoed draft deep-equals the current draft,
//   and the controller is still `busy`; late replies are dropped,
//   never resurrected.
// - cancel() while `busy` terminates the worker and goes `cancelled`,
//   keeping the draft; a late reply after cancel is dropped. Cancel
//   from any other state is a no-op.
// - edit() during `busy` terminates the worker and goes `dirty`;
//   after a result, error or cancelled state it clears the outcome
//   and goes `dirty`; from `empty` it stays `empty`.
// - A second run press while `busy` is ignored.
// - Worker construction, script loading or messaging failure goes to
//   `error` with WORKER_ERROR (never a fabricated result); local
//   validation still runs and can produce the pinned error state.
// - reset() is synchronous and restores the pinned default draft
//   byte-for-byte and the `empty` state.

import {
  DEFAULTS,
  EXAMPLE,
  FIELDS,
  STATUS_TEXT,
  run as coreRun,
} from "./core/savings-goal.mjs";

export const WORKER_ERROR = { code: "WORKER_ERROR", field: null, row: null };

function draftEquals(a, b) {
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  return FIELDS.every((field) => a[field] === b[field]);
}

export function createController({ createWorker, onChange = () => {} }) {
  let sequence = 1;
  let state = "empty";
  let draft = { ...DEFAULTS };
  let isExample = false;
  let result = null;
  let input = null;
  let error = null;
  let worker = null;
  let statusOverride = null;

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
      sequence,
      draft: { ...draft },
      isExample,
      result,
      input,
      error,
      reportAvailable: state === "success" && result !== null && input !== null,
      status: statusOverride === null ? { ...STATUS_TEXT[state] } : { ...statusOverride },
    };
  }

  function run() {
    if (state === "busy") return getPublicState();
    statusOverride = null;
    const outcome = coreRun(draft);
    if (!outcome.ok) {
      result = null;
      input = null;
      error = outcome.error;
      state = "error";
      emit();
      return getPublicState();
    }
    terminateWorker();
    sequence += 1;
    result = null;
    input = null;
    error = null;
    state = "busy";
    const postedSequence = sequence;
    const snapshot = { ...draft };
    let nextWorker;
    try {
      nextWorker = createWorker();
    } catch {
      state = "error";
      error = { ...WORKER_ERROR };
      emit();
      return getPublicState();
    }
    worker = nextWorker;
    worker.onmessage = (event) => {
      const data = event === null || event === undefined ? null : event.data;
      if (data === null || typeof data !== "object") return;
      if (data.sequence !== sequence || state !== "busy") return;
      if (!draftEquals(data.draft, draft)) return;
      terminateWorker();
      const reply = data.outcome;
      if (reply !== null && typeof reply === "object" && reply.ok === true) {
        result = reply.result;
        input = { ...data.draft };
        error = null;
        state = "success";
      } else if (reply !== null && typeof reply === "object" && reply.ok === false) {
        result = null;
        input = null;
        error = reply.error ?? { ...WORKER_ERROR };
        state = "error";
      } else {
        result = null;
        input = null;
        error = { ...WORKER_ERROR };
        state = "error";
      }
      emit();
    };
    worker.onerror = () => {
      if (postedSequence !== sequence || state !== "busy") return;
      terminateWorker();
      result = null;
      input = null;
      error = { ...WORKER_ERROR };
      state = "error";
      emit();
    };
    try {
      worker.postMessage({ sequence: postedSequence, draft: snapshot });
    } catch {
      terminateWorker();
      result = null;
      input = null;
      error = { ...WORKER_ERROR };
      state = "error";
    }
    emit();
    return getPublicState();
  }

  function cancel() {
    if (state !== "busy") return getPublicState();
    terminateWorker();
    sequence += 1;
    result = null;
    input = null;
    error = null;
    state = "cancelled";
    statusOverride = null;
    emit();
    return getPublicState();
  }

  function edit(patch) {
    const nextDraft = { ...draft, ...patch };
    const changed = FIELDS.some((field) => nextDraft[field] !== draft[field]);
    draft = nextDraft;
    isExample = false;
    statusOverride = null;
    sequence += 1;
    if (changed) {
      if (state === "busy") {
        terminateWorker();
        result = null;
        input = null;
        error = null;
        state = "dirty";
      } else if (state === "success" || state === "error" || state === "cancelled") {
        result = null;
        input = null;
        error = null;
        state = "dirty";
      }
    }
    emit();
    return getPublicState();
  }

  function loadExample() {
    const wasBusy = state === "busy";
    draft = { ...EXAMPLE };
    isExample = true;
    statusOverride = { ...STATUS_TEXT.example };
    sequence += 1;
    if (wasBusy) {
      terminateWorker();
      result = null;
      input = null;
      error = null;
      state = "dirty";
    } else if (state === "success" || state === "error" || state === "cancelled") {
      result = null;
      input = null;
      error = null;
      state = "dirty";
    }
    emit();
    return getPublicState();
  }

  function reset() {
    terminateWorker();
    sequence += 1;
    draft = { ...DEFAULTS };
    isExample = false;
    result = null;
    input = null;
    error = null;
    state = "empty";
    statusOverride = { ...STATUS_TEXT.reset };
    emit();
    return getPublicState();
  }

  function destroy() {
    terminateWorker();
    sequence += 1;
  }

  return { getState: getPublicState, run, cancel, edit, loadExample, reset, destroy };
}
