// Draft / computation-cycle controller for the Calories Burned
// Calculator. No DOM access: the app wires this to the form, and tests
// drive it with a controllable scheduler whose delivery is held back
// on demand.
//
// Calculation is synchronous and effectively instant (SPEC §4.3), so
// the app's default scheduler delivers each cycle's outcome at once.
// The generation guard below is still the pinned contract: a
// computation cycle captures the input at start; if the visitor edits,
// resets or starts a new cycle before a pending cycle's result is
// delivered, the late result MUST NOT replace the visible state, and
// re-running with a now-invalid edit shows the new error while the
// previous result remains the last accepted one.
//
// States: empty, dirty, busy, success, error, cancelled.
// - run() bumps the generation, captures the draft snapshot, clears the
//   current error, and goes busy; the outcome is applied only by a
//   delivery carrying the current generation while still busy.
// - edit() during busy cancels the pending cycle and goes dirty; after
//   a result it marks the result stale (dirty) without mutating it;
//   after an error it keeps the error until the next run (SPEC §4.2);
//   from empty it stays empty.
// - cancel() cancels a pending cycle and keeps the draft and the last
//   accepted result; a late delivery after cancelling cannot revive a
//   result. Cancelling when nothing is pending is a no-op.
// - reset() restores the §4.4 factory default, clears the result and
//   any error, and returns to empty.
// - The last accepted result is kept separate from the current error:
//   `lastAccepted` is { input, result } for the report, or null.

import { DEFAULTS, run } from "./core/calculate.mjs";

export function createController({
  compute = run,
  schedule = (deliver, snapshot) => deliver(compute(snapshot)),
  onChange = () => {},
} = {}) {
  let generation = 0;
  let pendingGeneration = null;
  let state = "empty";
  let draft = { ...DEFAULTS, activities: [...DEFAULTS.activities] };
  let lastAccepted = null;
  let error = null;

  function copyDraft(source) {
    return { ...source, activities: [...source.activities] };
  }

  function emit() {
    onChange(getPublicState());
  }

  function getPublicState() {
    return {
      state,
      draft: copyDraft(draft),
      lastAccepted,
      error,
      reportAvailable: state === "success" && lastAccepted !== null,
    };
  }

  function invalidatePending() {
    pendingGeneration = null;
    generation += 1;
  }

  function runCycle() {
    invalidatePending();
    const cycleGeneration = generation;
    pendingGeneration = cycleGeneration;
    const snapshot = copyDraft(draft);
    error = null;
    state = "busy";
    const deliver = (outcome) => {
      if (cycleGeneration !== pendingGeneration || state !== "busy") return false;
      pendingGeneration = null;
      if (outcome.ok) {
        lastAccepted = { input: snapshot, result: outcome.result };
        error = null;
        state = "success";
      } else {
        error = outcome.error;
        state = "error";
      }
      emit();
      return true;
    };
    schedule(deliver, snapshot);
    emit();
    return getPublicState();
  }

  function edit(patch) {
    const nextDraft = { ...draft, ...patch };
    if (patch.activities !== undefined) nextDraft.activities = [...patch.activities];
    const changed =
      nextDraft.weight !== draft.weight ||
      nextDraft.durationMinutes !== draft.durationMinutes ||
      nextDraft.activities.length !== draft.activities.length ||
      nextDraft.activities.some((id, index) => id !== draft.activities[index]);
    draft = nextDraft;
    if (!changed) {
      emit();
      return getPublicState();
    }
    if (state === "busy") {
      invalidatePending();
      error = null;
      state = "dirty";
    } else if (state === "success" || state === "cancelled") {
      error = null;
      state = "dirty";
    } else if (state === "dirty") {
      // Already stale; nothing further changes.
    }
    // From "error": the error is kept until the next run (SPEC §4.2),
    // so neither the state nor the error changes here. From "empty":
    // nothing to revoke, so the state stays empty.
    emit();
    return getPublicState();
  }

  function cancel() {
    if (state !== "busy") {
      emit();
      return getPublicState();
    }
    invalidatePending();
    error = null;
    state = "cancelled";
    emit();
    return getPublicState();
  }

  function reset() {
    invalidatePending();
    draft = { ...DEFAULTS, activities: [...DEFAULTS.activities] };
    lastAccepted = null;
    error = null;
    state = "empty";
    emit();
    return getPublicState();
  }

  function destroy() {
    invalidatePending();
  }

  return { getState: getPublicState, run: runCycle, edit, cancel, reset, destroy };
}
