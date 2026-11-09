// Controller for the EV Charging Calculator.
// Owns the draft, the six flow states (empty/dirty/busy/success/error/
// cancelled) and the generation guard: work settles on a scheduled task,
// and only a settlement for the current generation while busy is accepted.
// Late settlements (including late errors) are always discarded.

import { DEFAULT_INPUT, run as coreRun } from "./ev-charging.mjs";

function defaultSchedule(task) {
  const id = setTimeout(task, 0);
  return () => clearTimeout(id);
}

export function createController({ schedule = defaultSchedule, run = coreRun, onChange } = {}) {
  let state = "empty";
  let draft = { ...DEFAULT_INPUT };
  let result = null;
  let error = null;
  let pendingToken = null;
  let cancelScheduled = null;

  function snapshot() {
    return {
      state,
      draft: { ...draft },
      result: result === null ? null : { ...result },
      error: error === null ? null : { ...error },
      reportAvailable: state === "success" && result !== null,
    };
  }

  function emit() {
    if (typeof onChange === "function") onChange(snapshot());
  }

  function invalidate() {
    pendingToken = null;
    if (cancelScheduled !== null) {
      cancelScheduled();
      cancelScheduled = null;
    }
    result = null;
    error = null;
  }

  function settleWith(token, outcome) {
    if (token === null || token !== pendingToken || state !== "busy") return false;
    pendingToken = null;
    cancelScheduled = null;
    if (outcome !== null && typeof outcome === "object" && outcome.ok === true) {
      result = outcome.result;
      error = null;
      state = "success";
    } else if (outcome !== null && typeof outcome === "object" && outcome.ok === false) {
      result = null;
      error = outcome.error;
      state = "error";
    } else {
      result = null;
      error = { code: "INTERNAL", field: null, row: null };
      state = "error";
    }
    emit();
    return true;
  }

  function safeRun(inputSnapshot) {
    try {
      return run(inputSnapshot);
    } catch {
      return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
    }
  }

  return {
    getSnapshot: snapshot,

    edit(nextDraft) {
      invalidate();
      draft = { ...nextDraft };
      state = "dirty";
      emit();
    },

    execute() {
      invalidate();
      state = "busy";
      const token = {};
      pendingToken = token;
      const inputSnapshot = { ...draft };
      cancelScheduled = schedule(() => {
        settleWith(token, safeRun(inputSnapshot));
      });
      emit();
    },

    cancel() {
      if (state !== "busy") return;
      invalidate();
      state = "cancelled";
      emit();
    },

    reset() {
      invalidate();
      draft = { ...DEFAULT_INPUT };
      state = "empty";
      emit();
    },

    // Simulates a settlement arriving from an older, already-invalidated
    // generation. Such settlements are never accepted.
    injectLateResult(lateResult) {
      return settleWith({}, { ok: true, result: lateResult });
    },
  };
}
