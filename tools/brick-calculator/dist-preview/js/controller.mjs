// Draft / work-generation controller for the Brick Calculator.
// No DOM access: the app wires this to the form, the controller talks
// to a Worker through the injected createWorker factory, and tests
// drive it with a fake worker whose completion is controllable.
//
// States (SPEC userFlow): empty, dirty, busy, success, error,
// cancelled.
// - run() invalidates any old result, bumps the generation, and posts
//   the current draft snapshot to a fresh worker. Only a reply
//   carrying the current generation while still busy is accepted; late
//   replies are dropped, never resurrected.
// - edit() during busy terminates the worker and goes dirty; after a
//   result or error it clears the outcome and goes dirty; from empty
//   it stays empty (nothing to revoke).
// - cancel() terminates the worker and keeps the draft; a late reply
//   after cancelling cannot revive the result.
// - reset() stops work, restores the defaults, and returns to empty.
// The public state exposes reportAvailable: the fixed report download
// (brick-calculator-report.json) exists only on success.
//
// The draft holds the SPEC's reset-default shape: wallLengthM,
// wallHeightM, openings, brickPreset, jointMm, wastePct. The three
// custom brick dimensions live in the draft only while brickPreset
// is "custom" (they are added, blank, when custom is chosen and
// removed when another preset is chosen); the posted snapshot never
// carries them for a non-custom preset, matching the SPEC's rule
// that a non-custom preset carrying them is SCHEMA.

import { DEFAULTS, EXAMPLE } from "./core/brick-calculator.mjs";

export const WORKER_ERROR = { code: "WORKER_ERROR", field: null, row: null };

const CUSTOM_DIM_FIELDS = ["brickLengthMm", "brickHeightMm", "brickWidthMm"];

export function createController({ createWorker, onChange = () => {} }) {
  let generation = 0;
  let state = "empty";
  let draft = { ...DEFAULTS, openings: [...DEFAULTS.openings] };
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

  function copyDraft(source) {
    const copy = { ...source };
    if (Array.isArray(copy.openings)) {
      copy.openings = copy.openings.map((row) => ({ ...row }));
    }
    return copy;
  }

  function getPublicState() {
    return {
      state,
      draft: copyDraft(draft),
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
    const snapshot = copyDraft(draft);
    if (snapshot.brickPreset !== "custom") {
      for (const field of CUSTOM_DIM_FIELDS) delete snapshot[field];
    }
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

  function applyPresetTransition(nextDraft, patch) {
    if (patch.brickPreset === "custom") {
      for (const field of CUSTOM_DIM_FIELDS) {
        if (!(field in nextDraft)) nextDraft[field] = "";
      }
    } else if (patch.brickPreset !== undefined) {
      for (const field of CUSTOM_DIM_FIELDS) delete nextDraft[field];
    }
  }

  function edit(patch) {
    const nextDraft = copyDraft(draft);
    for (const key of Object.keys(patch)) nextDraft[key] = patch[key];
    applyPresetTransition(nextDraft, patch);
    const changed = Object.keys(patch).some((key) => {
      if (key === "openings") return true;
      return nextDraft[key] !== draft[key];
    }) || (patch.brickPreset !== undefined && patch.brickPreset !== draft.brickPreset);
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
    draft = copyDraft(EXAMPLE);
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
    draft = copyDraft(DEFAULTS);
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
