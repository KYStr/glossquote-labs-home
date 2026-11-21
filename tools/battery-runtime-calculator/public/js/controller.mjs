// Draft / work-generation controller for the Battery Runtime Calculator.
// No DOM access: the app wires this to the form, the controller talks to a
// Worker through the injected createWorker factory, and tests drive it
// with a fake worker whose completion is controllable.
//
// States (SPEC userFlow): empty, dirty, busy, success, error, cancelled.
// - run() invalidates any old result, bumps the generation, and posts the
//   current draft snapshot to a fresh worker. Only a reply carrying the
//   current generation while still busy is accepted; late replies are
//   dropped, never resurrected. An empty depthOfDischargePercent in the
//   draft is omitted from the snapshot, so it counts as absent (100%).
// - edit() during busy terminates the worker and goes dirty; after a
//   result or error it clears the outcome and goes dirty; from empty it
//   stays empty (nothing to revoke). Changing the mode rebuilds the
//   draft so it holds only the new mode's fields (values shared with
//   the old mode are kept, the rest start empty); inapplicable patch
//   keys are ignored.
// - cancel() terminates the worker and keeps the draft; a late reply
//   after cancelling cannot revive the result.
// - reset() stops work, restores the defaults, and returns to empty.

import { DEFAULTS, EXAMPLE, MODE_FIELDS } from "./core/battery-runtime-calculator.mjs";

export const WORKER_ERROR = { code: "WORKER_ERROR", field: null, row: null };

function cloneDraft(draft) {
  return { ...draft };
}

function canonicalDraft(draft) {
  const keys = Object.keys(draft).sort();
  return JSON.stringify(keys.map((key) => [key, draft[key]]));
}

function draftsEqual(a, b) {
  return canonicalDraft(a) === canonicalDraft(b);
}

function snapshotOf(draft) {
  const snapshot = { ...draft };
  if (snapshot.depthOfDischargePercent === "" || snapshot.depthOfDischargePercent === undefined) {
    delete snapshot.depthOfDischargePercent;
  }
  return snapshot;
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
    const snapshot = snapshotOf(draft);
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

  function edit(patch) {
    let nextDraft;
    if (
      typeof patch.mode === "string" &&
      patch.mode !== draft.mode &&
      Object.hasOwn(MODE_FIELDS, patch.mode)
    ) {
      // Mode switch: rebuild the draft from the new mode's fields only.
      nextDraft = { mode: patch.mode };
      for (const field of MODE_FIELDS[patch.mode]) {
        if (field in patch) nextDraft[field] = patch[field];
        else if (field in draft) nextDraft[field] = draft[field];
        else nextDraft[field] = "";
      }
    } else {
      nextDraft = cloneDraft(draft);
      for (const [key, value] of Object.entries(patch)) {
        if (key === "mode") {
          if (value === draft.mode) nextDraft.mode = value;
        } else if (MODE_FIELDS[draft.mode].includes(key)) {
          nextDraft[key] = value;
        }
      }
    }
    const changed = !draftsEqual(nextDraft, draft);
    draft = nextDraft;
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
