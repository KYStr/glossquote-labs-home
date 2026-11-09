// Draft/work controller for the Annual Leave Calculator.
// Owns the draft, a monotonically increasing work generation, and the
// empty/dirty/busy/success/error/cancelled state machine. The pure core is
// settled on a later macrotask; only the current generation may settle, so
// late results from cancelled or replaced work are always dropped.

export const BLANK_DRAFT = Object.freeze({
  startDate: "",
  referenceDate: "",
  usedDays: "",
});

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
  let draft = { ...BLANK_DRAFT };
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
    const input = { ...draft };
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
    draft = { ...BLANK_DRAFT };
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
