// Draft / sequence controller for the Pet Feeding Calculator.
// No DOM access and no persistent storage: the draft lives only in
// this page (SPEC: the draft is kept in the current page only; the
// implementation section forbids persistent storage). The app wires
// this to the form (the onChange callback is the view adapter), and
// computation runs in a Worker built through the injected
// createWorker factory. Tests drive it with a fake worker whose
// completion is controllable.
//
// States (SPEC userFlow): empty, dirty, busy, success, error,
// cancelled.
// - The sequence starts at 1 when the controller is created. Every
//   edit, reset, load-example, cancel and worker-submitting run
//   increments it. A run that fails local validation never posts, so
//   it leaves the sequence unchanged; this is the reading the pinned
//   fixture sequences require (see HANDOFF.md).
// - run() validates the draft locally first (the pure core). A local
//   failure goes straight to `error` with the core's error and no
//   worker is created. A valid draft is posted to a fresh worker.
// - A Worker reply is accepted only when its `sequence` equals the
//   current sequence, its echoed draft deep-equals the current draft,
//   and the controller is still `busy`; late replies are dropped,
//   never resurrected.
// - edit() during `busy` terminates the worker and goes `dirty`;
//   after a result, error or cancelled state it clears the outcome
//   and goes `dirty`; from `empty` it goes `dirty` (any input change
//   is dirty per SPEC userFlow).
// - Switching species resets the life stage to `adult-neutered` when
//   the current stage does not belong to the new species (SPEC
//   userFlow); a stage shared by both species is kept.
// - cancel() during `busy` terminates the worker, keeps the draft,
//   and goes `cancelled`; the old result stays invalid.
// - A second run press while `busy` is ignored.
// - Worker construction, script loading or messaging failure goes to
//   `unavailable` (never a fabricated result); local validation still
//   runs and can produce the pinned error state.
// - reset() is synchronous and restores the pinned default draft
//   byte-for-byte, in the `empty` state.

import {
  DEFAULTS,
  EXAMPLE,
  FIELDS,
  MULTIPLIERS,
  STATUS_TEXT,
  run as coreRun,
} from "./core/pet-feeding.mjs";

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
      state = "unavailable";
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

  function edit(patch) {
    const nextDraft = { ...draft, ...patch };
    // Species switch: if the current life stage does not belong to
    // the new species, fall back to that species' adult-neutered
    // (SPEC userFlow); a shared stage name is kept.
    if (
      patch.species !== undefined &&
      patch.species !== draft.species &&
      (patch.species === "dog" || patch.species === "cat") &&
      patch.lifeStage === undefined &&
      !Object.hasOwn(MULTIPLIERS[patch.species], nextDraft.lifeStage)
    ) {
      nextDraft.lifeStage = "adult-neutered";
    }
    const changed = FIELDS.some((field) => nextDraft[field] !== draft[field]);
    draft = nextDraft;
    isExample = false;
    statusOverride = null;
    sequence += 1;
    if (changed) {
      if (state === "busy") {
        terminateWorker();
        result = null;
        error = null;
        state = "dirty";
      } else if (state === "success" || state === "error" || state === "cancelled") {
        result = null;
        error = null;
        state = "dirty";
      } else if (state === "empty") {
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
    } else if (state === "success" || state === "error" || state === "cancelled") {
      result = null;
      error = null;
      state = "dirty";
    } else if (state === "empty") {
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
