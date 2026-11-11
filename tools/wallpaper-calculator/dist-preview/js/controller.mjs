// Draft / work-generation controller for the Wallpaper Calculator.
// No DOM access: the app wires this to the form, the controller talks to a
// Worker through the injected createWorker factory, and tests drive it with
// a fake worker whose completion is controllable.
//
// The draft is a whole core input object (mode-dependent key set, wall and
// opening rows included), so edit() replaces the draft with the app's next
// full snapshot and detects change by deep comparison.
//
// States (SPEC userFlow): empty, dirty, busy, success, error, cancelled.
// - run() invalidates any old result, bumps the generation, and posts the
//   current draft snapshot to a fresh worker. Only a reply carrying the
//   current generation while still busy is accepted; late replies are
//   dropped, never resurrected.
// - edit() during busy terminates the worker and goes dirty; after a
//   result or error it clears the outcome and goes dirty; from empty it
//   stays empty (nothing to revoke). An unchanged snapshot changes nothing.
// - cancel() terminates the worker and keeps the draft; a late reply after
//   cancelling cannot revive the result.
// - reset() stops work, restores the defaults, and returns to empty.

import { DEFAULTS, EXAMPLE } from "./core/wallpaper.mjs";

export const WORKER_ERROR = { code: "WORKER_ERROR", field: null, row: null };

function deepCopy(value) {
  return structuredClone(value);
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]),
  );
}

export function createController({ createWorker, onChange = () => {} }) {
  let generation = 0;
  let state = "empty";
  let draft = deepCopy(DEFAULTS);
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
      draft: deepCopy(draft),
      isExample,
      result,
      error,
      reportAvailable: state === "success" && result !== null,
    };
  }

  function run() {
    terminateWorker();
    generation += 1;
    result = null;
    error = null;
    state = "busy";
    const snapshot = deepCopy(draft);
    const postedGeneration = generation;
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
      if (generation !== postedGeneration || state !== "busy") return;
      const data = event.data;
      if (data === null || typeof data !== "object" || data.generation !== postedGeneration) return;
      terminateWorker();
      if (data.ok === true) {
        result = data.result;
        error = null;
        state = "success";
      } else {
        result = null;
        error = data.error ?? { ...WORKER_ERROR };
        state = "error";
      }
      emit();
    };
    worker.onerror = () => {
      if (generation !== postedGeneration || state !== "busy") return;
      terminateWorker();
      result = null;
      error = { ...WORKER_ERROR };
      state = "error";
      emit();
    };
    try {
      worker.postMessage({ snapshot, generation: postedGeneration });
    } catch {
      terminateWorker();
      result = null;
      error = { ...WORKER_ERROR };
      state = "error";
    }
    emit();
    return getPublicState();
  }

  // Replace the draft with the app's next full snapshot. Only an actual
  // change revokes an outcome or a running job.
  function edit(nextDraft) {
    const changed = !deepEqual(nextDraft, draft);
    draft = deepCopy(nextDraft);
    isExample = false;
    if (!changed) {
      emit();
      return getPublicState();
    }
    if (state === "busy") {
      terminateWorker();
      generation += 1;
      result = null;
      error = null;
      state = "dirty";
    } else if (state === "success" || state === "error" || state === "cancelled") {
      result = null;
      error = null;
      state = "dirty";
    }
    emit();
    return getPublicState();
  }

  function loadExample() {
    const wasBusy = state === "busy";
    draft = deepCopy(EXAMPLE);
    isExample = true;
    if (wasBusy) {
      terminateWorker();
      generation += 1;
      result = null;
      error = null;
      state = "dirty";
    } else if (state === "success" || state === "error" || state === "cancelled") {
      result = null;
      error = null;
      state = "dirty";
    }
    emit();
    return getPublicState();
  }

  function cancel() {
    if (state !== "busy") {
      emit();
      return getPublicState();
    }
    terminateWorker();
    generation += 1;
    result = null;
    error = null;
    state = "cancelled";
    emit();
    return getPublicState();
  }

  function reset() {
    terminateWorker();
    generation += 1;
    draft = deepCopy(DEFAULTS);
    isExample = false;
    result = null;
    error = null;
    state = "empty";
    emit();
    return getPublicState();
  }

  function destroy() {
    terminateWorker();
    generation += 1;
  }

  return { getState: getPublicState, run, edit, loadExample, cancel, reset, destroy };
}
