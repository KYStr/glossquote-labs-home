// Draft / work-generation controller for the Lottery Number Picker. No
// DOM access: the app wires this to the form; evaluation of the current
// draft snapshot is scheduled through the injected scheduler (a
// macrotask in the app, a controllable fake in tests) and every run
// carries a generation number, exactly as the SPEC pins — the
// computation itself is synchronous and short, with no Worker.
//
// States (SPEC userFlow): empty, dirty, busy, success, error, cancelled.
// - edit() replaces the draft, terminates pending work, and revokes any
//   old result (and its copy/download) immediately.
// - run() enters busy and schedules evaluation of the draft snapshot.
// - cancel() (only while busy) keeps the draft and reports cancelled.
// - reset() restores the SPEC default draft and returns to empty.
// - settle() only accepts the currently pending generation, so a late
//   completion from an older run can never resurrect a revoked result.

import { DEFAULT_DRAFT, run } from "./core/lottery.mjs";

function deepCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createController({ schedule, cancelScheduled, onChange = () => {} } = {}) {
  const scheduleFn = schedule ?? ((fn) => setTimeout(fn, 0));
  const cancelFn = cancelScheduled ?? ((handle) => clearTimeout(handle));

  let generation = 0;
  let state = "empty";
  let draft = deepCopy(DEFAULT_DRAFT);
  let result = null;
  let error = null;
  let pendingHandle = null;
  let pendingGeneration = null;

  function getPublicState() {
    return {
      state,
      draft: deepCopy(draft),
      result,
      error,
      generation,
      resultAvailable: state === "success" && result !== null,
      copyAvailable: state === "success" && result !== null,
      downloadAvailable: state === "success" && result !== null,
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

  function edit(nextDraft) {
    draft = deepCopy(nextDraft);
    if (state === "busy") {
      generation += 1;
      stopPending();
      invalidateOutcome();
      state = "dirty";
    } else if (state === "success" || state === "error" || state === "cancelled") {
      invalidateOutcome();
      state = "dirty";
    }
    emit();
    return getPublicState();
  }

  function runDraft() {
    if (state === "busy") return getPublicState();
    generation += 1;
    stopPending();
    invalidateOutcome();
    state = "busy";
    const gen = generation;
    const snapshot = deepCopy(draft);
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
    draft = deepCopy(DEFAULT_DRAFT);
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
    run: runDraft,
    cancel,
    reset,
    destroy,
    settle,
    getState: getPublicState,
  };
}
