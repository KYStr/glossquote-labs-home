// Draft / sequence controller for the VO2max Calculator.
// No DOM access: the app wires this to the form (the onChange callback
// is the view adapter), the draft is persisted through the injected
// storage adapter, and computation runs in a Worker built through the
// injected createWorker factory. Tests drive it with a fake worker
// whose completion is controllable.
//
// States (SPEC section 2): idle, dirty, submitting, success, error,
// unavailable.
// - The sequence starts at 1 when the controller is created (after the
//   stored draft is restored, if any). Every edit, reset and
//   load-example increments it, and so does every run that passes local
//   validation and submits to the Worker. A run that fails local
//   validation never posts, so it leaves the sequence unchanged; this
//   is the reading the pinned fixture sequences require (see
//   HANDOFF.md).
// - run() validates the draft locally first (the pure core). A local
//   failure goes straight to `error` with the core's error and no
//   worker is created. A valid draft is posted to a fresh worker.
// - A Worker reply is accepted only when its `sequence` equals the
//   current sequence, its echoed draft deep-equals the current draft,
//   and the controller is still `submitting`; late replies are dropped,
//   never resurrected.
// - edit() during `submitting` terminates the worker and goes `dirty`;
//   after a result, error or unavailable state it clears the outcome
//   and goes `dirty`; from `idle` it stays `idle`.
// - A second run press while `submitting` is ignored.
// - Worker construction, script loading or messaging failure goes to
//   `unavailable` (never a fabricated result); local validation still
//   runs and can produce the pinned error state.
// - reset() is synchronous and restores the pinned default draft
//   byte-for-byte.

import {
  DEFAULTS,
  EXAMPLE,
  FIELDS,
  STATUS_TEXT,
  STORAGE_KEY,
  isDraftShapeValid,
  run as coreRun,
} from "./core/vo2max.mjs";

export const WORKER_ERROR = { code: "WORKER_ERROR", field: null, row: null };

function draftEquals(a, b) {
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  return FIELDS.every((field) => a[field] === b[field]);
}

export function createController({ createWorker, storage = null, onChange = () => {} }) {
  let sequence = 1;
  let state = "idle";
  let draft = { ...DEFAULTS };
  let isExample = false;
  let result = null;
  let error = null;
  let worker = null;
  let statusOverride = null;

  // Restore a stored draft. A stored value that fails the schema gate
  // is discarded and the default draft is used; loading never throws.
  if (storage !== null && storage !== undefined) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (typeof raw === "string" && raw !== "") {
        const parsed = JSON.parse(raw);
        if (isDraftShapeValid(parsed)) draft = { ...parsed };
      }
    } catch {
      // A corrupt stored draft is not an error state for the UI.
    }
  }

  function emit() {
    onChange(getPublicState());
  }

  function persist() {
    if (storage === null || storage === undefined) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Persistence is best-effort; a full or blocked store must not
      // break calculation.
    }
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
    if (state === "submitting") return getPublicState();
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
    state = "submitting";
    const postedSequence = sequence;
    const snapshot = { ...draft };
    let nextWorker;
    try {
      nextWorker = createWorker();
    } catch {
      state = "unavailable";
      emit();
      return getPublicState();
    }
    worker = nextWorker;
    worker.onmessage = (event) => {
      const data = event === null || event === undefined ? null : event.data;
      if (data === null || typeof data !== "object") return;
      if (data.sequence !== sequence || state !== "submitting") return;
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
      if (postedSequence !== sequence || state !== "submitting") return;
      terminateWorker();
      result = null;
      error = null;
      state = "unavailable";
      emit();
    };
    try {
      worker.postMessage({ sequence: postedSequence, draft: snapshot });
    } catch {
      terminateWorker();
      result = null;
      error = null;
      state = "unavailable";
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
    sequence += 1;
    if (changed) {
      if (state === "submitting") {
        terminateWorker();
        result = null;
        error = null;
        state = "dirty";
      } else if (state === "success" || state === "error" || state === "unavailable") {
        result = null;
        error = null;
        state = "dirty";
      }
    }
    persist();
    emit();
    return getPublicState();
  }

  function loadExample() {
    const wasSubmitting = state === "submitting";
    draft = { ...EXAMPLE };
    isExample = true;
    statusOverride = { ...STATUS_TEXT.example };
    sequence += 1;
    if (wasSubmitting) {
      terminateWorker();
      result = null;
      error = null;
      state = "dirty";
    } else if (state === "success" || state === "error" || state === "unavailable") {
      result = null;
      error = null;
      state = "dirty";
    }
    persist();
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
    state = "idle";
    statusOverride = { ...STATUS_TEXT.reset };
    persist();
    emit();
    return getPublicState();
  }

  function destroy() {
    terminateWorker();
    sequence += 1;
  }

  return { getState: getPublicState, run, edit, loadExample, reset, destroy };
}
