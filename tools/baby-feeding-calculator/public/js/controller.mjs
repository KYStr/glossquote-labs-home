// Draft / sequence controller for the Baby Feeding Calculator.
// No DOM access: the app wires this to the form (the onChange callback
// is the view adapter), and computation runs in a Worker built through
// the injected createWorker factory. Tests drive it with a fake worker
// whose completion is controllable.
//
// States (SPEC section 2): empty, dirty, busy, success, error,
// cancelled.
// - The sequence starts at 1 when the controller is created. Every
//   edit that changes a field, reset, load-example, cancel of a busy
//   run, and every run that passes local validation and submits to
//   the Worker increments it. A run that fails local validation never
//   posts, so it leaves the sequence unchanged; this is the reading
//   the pinned fixtures require (state-replace-late: the newer,
//   locally invalid run creates no second worker and the older late
//   reply must not replace the error).
// - run() validates the draft locally first (the pure core). A local
//   failure goes straight to `error` with the core's error and no
//   worker is created. A valid draft is posted to a fresh worker.
// - A Worker reply is accepted only when its `sequence` equals the
//   current sequence, its echoed draft deep-equals the current draft,
//   and the controller is still `busy`; late replies are dropped,
//   never resurrected.
// - edit() during `busy` terminates the worker and goes `dirty`;
//   after a result, error, cancelled or empty state it clears the
//   outcome and goes `dirty` (any input change is dirty per SPEC
//   section 2); from `dirty` it stays `dirty`. An edit that changes
//   nothing changes no state.
// - cancel() only acts while `busy`: it terminates the worker, keeps
//   the draft, and goes `cancelled`. A late reply after cancel is
//   dropped. The draft is retained for retry.
// - Worker construction, script loading or messaging failure goes to
//   `unavailable`... there is no `unavailable` state in this SPEC's
//   table, so a worker failure is reported as `error` with
//   WORKER_ERROR and the draft is kept for retry; local validation
//   still runs and can produce the pinned error state.
// - reset() is synchronous and restores the pinned default draft
//   byte-for-byte and the `empty` state.
// - The draft lives only in memory. The SPEC forbids persistent
//   storage for this tool ("資料只保留在目前頁面草稿", no persistent
//   storage), so there is deliberately no storage adapter and no
//   draft is restored on load; leaving the page discards the draft.

import {
  DEFAULTS,
  EXAMPLE,
  FIELDS,
  STATUS_TEXT,
  run as coreRun,
} from "./core/baby-feeding.mjs";

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
      error,
      reportAvailable: state === "success" && result !== null,
      status: statusOverride === null ? { ...STATUS_TEXT[state] } : { ...statusOverride },
    };
  }

  function run() {
    if (state === "busy") return getPublicState();
    statusOverride = null;
    const outcome = coreRun(draft);
    if (!outcome.ok) {
      result = null;
      error = outcome.error;
      state = "error";
      emit();
      return getPublicState();
    }
    terminateWorker();
    sequence += 1;
    result = null;
    error = null;
    state = "busy";
    const postedSequence = sequence;
    const snapshot = { ...draft };
    let nextWorker;
    try {
      nextWorker = createWorker();
    } catch {
      result = null;
      error = { ...WORKER_ERROR };
      state = "error";
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
        error = null;
        state = "success";
      } else if (reply !== null && typeof reply === "object" && reply.ok === false) {
        result = null;
        error = reply.error ?? { ...WORKER_ERROR };
        state = "error";
      } else {
        result = null;
        error = { ...WORKER_ERROR };
        state = "error";
      }
      emit();
    };
    worker.onerror = () => {
      if (postedSequence !== sequence || state !== "busy") return;
      terminateWorker();
      result = null;
      error = { ...WORKER_ERROR };
      state = "error";
      emit();
    };
    try {
      worker.postMessage({ sequence: postedSequence, draft: snapshot });
    } catch {
      terminateWorker();
      result = null;
      error = { ...WORKER_ERROR };
      state = "error";
    }
    emit();
    return getPublicState();
  }

  function edit(patch) {
    const nextDraft = { ...draft, ...patch };
    const changed = FIELDS.some((field) => nextDraft[field] !== draft[field]);
    draft = nextDraft;
    isExample = false;
    statusOverride = null;
    if (changed) {
      sequence += 1;
      if (state === "busy") {
        terminateWorker();
        result = null;
        error = null;
        state = "dirty";
      } else if (state === "success" || state === "error" || state === "cancelled" || state === "empty") {
        result = null;
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
      error = null;
      state = "dirty";
    } else if (state === "success" || state === "error" || state === "cancelled" || state === "empty") {
      result = null;
      error = null;
      state = "dirty";
    }
    emit();
    return getPublicState();
  }

  function cancel() {
    if (state !== "busy") return getPublicState();
    terminateWorker();
    sequence += 1;
    result = null;
    error = null;
    state = "cancelled";
    statusOverride = null;
    emit();
    return getPublicState();
  }

  function reset() {
    terminateWorker();
    sequence += 1;
    draft = { ...DEFAULTS };
    isExample = false;
    result = null;
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

  return { getState: getPublicState, run, edit, loadExample, cancel, reset, destroy };
}
