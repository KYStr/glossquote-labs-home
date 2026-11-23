// Draft / work-generation controller for the Cocktail ABV
// Calculator. No DOM access: the app wires this to the form, the
// controller talks to a Worker through the injected createWorker
// factory, and tests drive it with a fake worker whose completion
// is controllable.
//
// The draft is { ingredients: [{ name?, volumeMl, abvPct }, ...] }
// with 2-6 rows. The app edits one field at a time (setField),
// adds rows (addRow, up to 6) and removes rows (removeRow, down to
// 2); editDraft replaces the whole draft at once (used by the
// tests). Every change follows the same dirty rule.
//
// States (SPEC userFlow): empty, dirty, busy, success, error,
// cancelled.
// - run() invalidates any old result, bumps the generation, and
//   posts the current draft snapshot to a fresh worker. Only a
//   reply carrying the current generation while still busy is
//   accepted; late replies are dropped, never resurrected.
// - edit during busy terminates the worker and goes dirty; after a
//   result or error it clears the outcome and goes dirty; from
//   empty it stays empty (nothing to revoke).
// - cancel() terminates the worker and keeps the draft; a late
//   reply after cancelling cannot revive the result.
// - reset() stops work, restores the defaults, and returns to
//   empty.
// The public state exposes reportAvailable: the fixed report
// download (cocktail-abv-report.json) exists only on success.

import { DEFAULTS, EXAMPLE, MAX_ROWS, MIN_ROWS } from "./core/cocktail-abv.mjs";

export const WORKER_ERROR = { code: "WORKER_ERROR", field: null, row: null };

function cloneDraft(draft) {
  return {
    ingredients: draft.ingredients.map((row) => ({ ...row })),
  };
}

function sameDraft(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
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

  function applyDraftChange(nextDraft) {
    const changed = !sameDraft(nextDraft, draft);
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

  function editDraft(nextDraft) {
    return applyDraftChange(nextDraft);
  }

  function setField(rowIndex, field, value) {
    const next = cloneDraft(draft);
    if (rowIndex < 0 || rowIndex >= next.ingredients.length) return getPublicState();
    if (!["name", "volumeMl", "abvPct"].includes(field)) return getPublicState();
    next.ingredients[rowIndex][field] = value;
    return applyDraftChange(next);
  }

  function addRow() {
    if (draft.ingredients.length >= MAX_ROWS) return getPublicState();
    const next = cloneDraft(draft);
    next.ingredients.push({ name: "", volumeMl: "", abvPct: "" });
    return applyDraftChange(next);
  }

  function removeRow(rowIndex) {
    if (draft.ingredients.length <= MIN_ROWS) return getPublicState();
    if (rowIndex < 0 || rowIndex >= draft.ingredients.length) return getPublicState();
    const next = cloneDraft(draft);
    next.ingredients.splice(rowIndex, 1);
    return applyDraftChange(next);
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

  return {
    getState: getPublicState,
    run,
    editDraft,
    setField,
    addRow,
    removeRow,
    loadExample,
    cancel,
    reset,
    destroy,
  };
}
