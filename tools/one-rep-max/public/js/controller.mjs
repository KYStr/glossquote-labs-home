// Draft / work-generation controller for the One-Rep Max Calculator.
// No DOM access: the app wires this to the form; evaluation is scheduled
// through the injected scheduler (a macrotask in the app, a controllable
// fake in tests) and every evaluation carries a generation number.
//
// States (SPEC userFlow): empty, dirty, busy, success, error, cancelled.
// - edit() merges field changes into the draft, terminates pending work,
//   and revokes any shown result or error immediately.
// - run() snapshots the draft and schedules the pure core evaluation.
// - cancel() terminates the pending generation; settle() only accepts
//   the currently pending generation, so a late completion can never
//   resurrect a revoked result.
// - reset() restores the pinned default draft and the empty state.

import { run } from "./core/one-rep-max.mjs";

export const DEFAULT_DRAFT = Object.freeze({ weight: "", reps: "", unit: "kg" });

const DRAFT_FIELDS = ["weight", "reps", "unit"];

export function createController({ schedule, cancelScheduled, onChange = () => {} } = {}) {
  const scheduleFn = schedule ?? ((fn) => setTimeout(fn, 0));
  const cancelFn = cancelScheduled ?? ((handle) => clearTimeout(handle));

  let generation = 0;
  let state = "empty";
  let draft = { ...DEFAULT_DRAFT };
  let result = null;
  let error = null;
  let pendingHandle = null;
  let pendingGeneration = null;

  function getPublicState() {
    return {
      state,
      draft: { ...draft },
      result,
      error,
      generation,
      resultAvailable: result !== null,
    };
  }

  function emit() {
    onChange(getPublicState());
  }

  function stopPending() {
    if (pendingHandle !== null) {
      try {
        cancelFn(pendingHandle);
      } catch {
        // Cancelling an already-fired timer is not an error state.
      }
      pendingHandle = null;
    }
    pendingGeneration = null;
  }

  function invalidateOutcome() {
    result = null;
    error = null;
  }

  // Completion entry point. The scheduled evaluation calls this, and
  // tests use it to inject late completions: anything that is not the
  // currently pending generation is dropped silently.
  function settle(gen, outcome) {
    if (pendingGeneration === null || gen !== pendingGeneration) return getPublicState();
    pendingGeneration = null;
    if (outcome !== null && typeof outcome === "object" && outcome.ok === true) {
      result = outcome.result;
      error = null;
      state = "success";
    } else {
      result = null;
      error =
        outcome !== null && typeof outcome === "object" && outcome.error
          ? outcome.error
          : { code: "INTERNAL", field: null, row: null };
      state = "error";
    }
    emit();
    return getPublicState();
  }

  function edit(next) {
    const merged = { ...draft };
    if (next !== null && typeof next === "object") {
      for (const field of DRAFT_FIELDS) {
        if (typeof next[field] === "string") merged[field] = next[field];
      }
    }
    const changed = DRAFT_FIELDS.some((field) => merged[field] !== draft[field]);
    if (!changed) {
      emit();
      return getPublicState();
    }
    draft = merged;
    if (state === "busy") {
      generation += 1;
      stopPending();
    }
    invalidateOutcome();
    // From the pristine empty state there is no outcome to revoke, so
    // the state stays empty; from every other state the draft is dirty.
    state = state === "empty" ? "empty" : "dirty";
    emit();
    return getPublicState();
  }

  function runCalculation() {
    if (state === "busy") return getPublicState();
    generation += 1;
    stopPending();
    invalidateOutcome();
    state = "busy";
    const gen = generation;
    const snapshot = { ...draft };
    pendingGeneration = gen;
    pendingHandle = scheduleFn(() => {
      pendingHandle = null;
      settle(gen, run(snapshot));
    });
    emit();
    return getPublicState();
  }

  function cancel() {
    if (state !== "busy") return getPublicState();
    generation += 1;
    stopPending();
    invalidateOutcome();
    state = "cancelled";
    emit();
    return getPublicState();
  }

  function reset() {
    generation += 1;
    stopPending();
    invalidateOutcome();
    draft = { ...DEFAULT_DRAFT };
    state = "empty";
    emit();
    return getPublicState();
  }

  function destroy() {
    generation += 1;
    stopPending();
  }

  return {
    edit,
    run: runCalculation,
    cancel,
    reset,
    destroy,
    settle,
    getState: getPublicState,
  };
}
