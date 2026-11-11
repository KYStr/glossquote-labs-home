// Draft/work controller for the Workdays Calculator.
// Owns the five-field draft {mode, startDate, endDate, days, holidays}, a
// monotonically increasing work generation, and the
// empty/dirty/busy/success/error/cancelled state machine. Executing
// projects the draft to the core's four-field input for the current mode.
// Work settles through the injected scheduler; only the current generation
// may settle, so late results from cancelled or replaced work are always
// dropped.

export const DEFAULT_DRAFT = Object.freeze({
  mode: "count",
  startDate: "",
  endDate: "",
  days: "5",
  holidays: "",
});

export function projectDraft(draft) {
  if (draft.mode === "shift") {
    return {
      mode: "shift",
      startDate: draft.startDate,
      days: draft.days,
      holidays: draft.holidays,
    };
  }
  return {
    mode: "count",
    startDate: draft.startDate,
    endDate: draft.endDate,
    holidays: draft.holidays,
  };
}

function draftsEqual(a, b) {
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

export function createController({ run, schedule } = {}) {
  if (typeof run !== "function") throw new Error("createController requires a run function.");
  const scheduleWork =
    typeof schedule === "function" ? schedule : (fn) => setTimeout(fn, 0);

  let generation = 0;
  let status = "empty";
  let draft = { ...DEFAULT_DRAFT };
  let result = null;
  let error = null;

  function invalidate() {
    generation += 1;
    result = null;
    error = null;
  }

  function snapshot() {
    return {
      status,
      draft: { ...draft },
      result,
      error,
      resultAvailable: status === "success" && result !== null,
    };
  }

  function updateDraft(nextDraft) {
    if (draftsEqual(draft, nextDraft)) return snapshot();
    draft = { ...nextDraft };
    invalidate();
    status = "dirty";
    return snapshot();
  }

  function execute() {
    invalidate();
    const myGeneration = generation;
    const input = projectDraft(draft);
    status = "busy";
    scheduleWork(() => {
      if (myGeneration !== generation || status !== "busy") return;
      const outcome = run(input);
      if (outcome && outcome.ok) {
        result = outcome.result;
        error = null;
        status = "success";
      } else {
        result = null;
        error = outcome && outcome.error ? outcome.error : { code: "INTERNAL", field: null, row: null };
        status = "error";
      }
    });
    return snapshot();
  }

  function cancel() {
    if (status !== "busy") return snapshot();
    invalidate();
    status = "cancelled";
    return snapshot();
  }

  function discardPending() {
    if (status === "busy") {
      invalidate();
      status = "cancelled";
    } else {
      generation += 1;
    }
    return snapshot();
  }

  function reset() {
    invalidate();
    draft = { ...DEFAULT_DRAFT };
    status = "empty";
    return snapshot();
  }

  return {
    getState: snapshot,
    updateDraft,
    execute,
    cancel,
    discardPending,
    reset,
  };
}
