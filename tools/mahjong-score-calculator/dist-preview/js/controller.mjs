// Draft / work-generation controller for the Mahjong Score
// Calculator. No DOM access: the app wires this to the form, the
// controller talks to a Worker through the injected createWorker
// factory, and tests drive it with a fake worker whose completion
// timing they control.
//
// States (SPEC userFlow): empty, dirty, busy, success, error,
// cancelled.
// - run() invalidates any old result, bumps the generation, and
//   posts a deep snapshot of the current draft to a fresh worker.
//   Only a reply carrying the current generation while still busy
//   is accepted; late replies are dropped, never resurrected.
// - edit() replaces the draft; during busy it terminates the worker
//   and goes dirty; after a result, error, or cancellation it clears
//   the outcome and goes dirty; from empty it stays empty (nothing
//   to revoke yet).
// - cancel() terminates the worker and keeps the draft; a late
//   reply afterwards cannot revive the result.
// - reset() stops work, restores the SPEC defaults, returns to empty.
// reportAvailable is true exactly in the success state with a
// result; any edit, rerun, cancel, or reset revokes it (and with it
// the download).

import { DEFAULTS, EXAMPLE } from "./core/mahjong.mjs";

export const WORKER_ERROR = { code: "WORKER_ERROR", field: null, row: null };

function cloneDraft(draft) {
  return {
    ...draft,
    selected: { ...(draft.selected ?? {}) },
    overrides: { ...(draft.overrides ?? {}) },
  };
}

// Key-order-insensitive comparison for the JSON-shaped draft.
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

export function createController({ createWorker, onChange = () => {} }) {
  let generation = 0;
  let state = "empty";
  let draft = cloneDraft(DEFAULTS);
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
      draft: cloneDraft(draft),
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
    const snapshot = cloneDraft(draft);
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
      const data = event.data;
      if (data === null || typeof data !== "object") return;
      if (data.generation !== postedGeneration || state !== "busy") return;
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

  function edit(nextDraft) {
    const changed = canonical(nextDraft) !== canonical(draft);
    draft = cloneDraft(nextDraft);
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
    draft = cloneDraft(EXAMPLE);
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
    draft = cloneDraft(DEFAULTS);
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
