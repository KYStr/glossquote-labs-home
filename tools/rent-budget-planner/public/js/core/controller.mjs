// Rent Budget Planner — controller.
// Owns the draft, the work generation and the six flow states
// (empty / dirty / busy / success / error / cancelled). Any edit, cancel or
// reset increments the generation, so a late result from superseded work can
// never revive an old result or overwrite a newer state.

import { DEFAULT_INPUT, run as runCore } from "./rent-budget.mjs";

function defaultExecute(input) {
  // One macrotask of latency so busy/cancel semantics are real, while the
  // computation itself stays the synchronous pure core.
  return new Promise((resolve) => {
    setTimeout(() => resolve(runCore(input)), 0);
  });
}

export function createController({ execute } = {}) {
  const exec = typeof execute === "function" ? execute : defaultExecute;
  let generation = 0;
  let activeGeneration = null;
  let status = "empty";
  let draft = { ...DEFAULT_INPUT };
  let result = null;
  let error = null;
  const listeners = new Set();

  function snapshot() {
    return {
      status,
      draft: { ...draft },
      result,
      error,
      reportAvailable: status === "success",
    };
  }

  function emit() {
    const state = snapshot();
    for (const listener of listeners) listener(state);
  }

  function invalidate() {
    result = null;
    error = null;
  }

  return {
    getState: snapshot,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    edit(nextDraft) {
      generation += 1;
      activeGeneration = null;
      draft = { ...nextDraft };
      invalidate();
      status = "dirty";
      emit();
    },

    run() {
      const gen = (generation += 1);
      activeGeneration = gen;
      const input = { ...draft };
      invalidate();
      status = "busy";
      emit();
      let promise;
      try {
        promise = exec(input, gen);
      } catch {
        promise = Promise.reject(new Error("executor failed"));
      }
      Promise.resolve(promise).then(
        (output) => {
          if (gen !== generation || activeGeneration !== gen) return; // late or superseded
          activeGeneration = null;
          if (output && output.ok === true) {
            result = output.result;
            error = null;
            status = "success";
          } else if (output && output.ok === false && output.error) {
            result = null;
            error = output.error;
            status = "error";
          } else {
            result = null;
            error = { code: "INTERNAL", field: null, row: null };
            status = "error";
          }
          emit();
        },
        () => {
          if (gen !== generation || activeGeneration !== gen) return; // late or superseded
          activeGeneration = null;
          result = null;
          error = { code: "WORKER_ERROR", field: null, row: null };
          status = "error";
          emit();
        },
      );
    },

    cancel() {
      if (status !== "busy") return;
      generation += 1;
      activeGeneration = null;
      invalidate();
      status = "cancelled";
      emit();
    },

    reset() {
      generation += 1;
      activeGeneration = null;
      draft = { ...DEFAULT_INPUT };
      invalidate();
      status = "empty";
      emit();
    },
  };
}
