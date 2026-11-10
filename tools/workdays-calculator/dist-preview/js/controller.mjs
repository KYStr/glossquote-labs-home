// Draft/work controller for the Workdays Calculator.
// Owns the five-field draft {mode, startDate, endDate, days, holidays}, a
// monotonically increasing work generation, and the
// empty/dirty/busy/success/error/cancelled state machine. Executing
// projects the draft to the core's four-field input for the current mode.
// Work settles through an injected Worker; only the current generation
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

export function createController({ createWorker, onSettled = () => {} }) {
  let generation = 0;
  let status = "empty";
  let draft = { ...DEFAULT_DRAFT };
  let result = null;
  let error = null;
  let worker = null;

  function stopWorker() {
    const current = worker;
    worker = null;
    current?.terminate();
  }

  function invalidate() {
    generation += 1;
    stopWorker();
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
    let current = null;
    function settle(outcome) {
      if (myGeneration !== generation || status !== "busy" || worker !== current) return;
      stopWorker();
      if (outcome?.ok === true && outcome.result) {
        result = outcome.result;
        status = "success";
      } else {
        error = outcome?.error ?? { code: "WORKER_ERROR", field: null, row: null };
        status = "error";
      }
      onSettled();
    }
    try {
      current = createWorker();
      worker = current;
      current.onmessage = ({ data }) => {
        if (data?.generation === myGeneration) settle(data);
      };
      current.onerror = () => settle();
      current.onmessageerror = () => settle();
      current.postMessage({ snapshot: input, generation: myGeneration });
    } catch {
      settle();
    }
    return snapshot();
  }

  function cancel() {
    if (status !== "busy") return snapshot();
    invalidate();
    status = "cancelled";
    return snapshot();
  }

  function discardPending() {
    const wasBusy = status === "busy";
    invalidate();
    draft = { ...DEFAULT_DRAFT };
    status = wasBusy ? "cancelled" : "empty";
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
