// Draft / work-generation controller for the Download Time Calculator.
// No DOM access: the app wires this to the form, the controller talks to
// a Worker through the injected createWorker factory, and tests drive
// it with a fake worker whose completion is controllable.
//
// States (SPEC userFlow): empty, dirty, busy, success, error, cancelled.
// - run() invalidates any old result and report, bumps the generation,
//   resolves a blank startTime to the current local HH:MM in the
//   SNAPSHOT only (the draft keeps the blank; the core only ever
//   receives a concrete HH:MM), and posts the snapshot to a fresh
//   worker. Only a reply carrying the current generation while still
//   busy is accepted; late replies are dropped, never resurrected.
// - edit() during busy terminates the worker and goes dirty; after a
//   result or error it clears the outcome and goes dirty; from empty
//   it stays empty (nothing to revoke).
// - cancel() terminates the worker and keeps the draft; a late reply
//   after cancelling cannot revive the result or the report.
// - reset() stops work, restores the SPEC defaults, and returns to
//   empty.
// The fixed download report (download-time-report.json) is available
// exactly while reportAvailable is true: the current snapshot's result
// serialized by the core's canonical serializer within its byte limit.

import { DEFAULTS, EXAMPLE, serializeReport } from "./core/download.mjs";

export const WORKER_ERROR = { code: "WORKER_ERROR", field: null, row: null };

function pad2(value) {
  return String(value).padStart(2, "0");
}

// Default "now" source: the local clock's HH:MM at run time. Injected
// in tests so the blank-startTime resolution is deterministic.
export function localNowHHMM() {
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

export function createController({ createWorker, nowLocal = localNowHHMM, onChange = () => {} }) {
  let generation = 0;
  let state = "empty";
  let draft = { ...DEFAULTS };
  let isExample = false;
  let result = null;
  let error = null;
  let reportText = null;
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

  function clearOutcome() {
    result = null;
    error = null;
    reportText = null;
  }

  function getPublicState() {
    return {
      state,
      draft: { ...draft },
      isExample,
      result,
      error,
      reportAvailable: state === "success" && reportText !== null,
    };
  }

  function getReportText() {
    return state === "success" ? reportText : null;
  }

  function run() {
    terminateWorker();
    generation += 1;
    clearOutcome();
    state = "busy";
    const snapshot = { ...draft };
    if (snapshot.startTime === "") snapshot.startTime = nowLocal();
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
        reportText = serializeReport(result);
        state = "success";
      } else {
        clearOutcome();
        error = data.error ?? { ...WORKER_ERROR };
        state = "error";
      }
      emit();
    };
    worker.onerror = () => {
      if (generation !== postedGeneration || state !== "busy") return;
      terminateWorker();
      clearOutcome();
      error = { ...WORKER_ERROR };
      state = "error";
      emit();
    };
    try {
      worker.postMessage({ snapshot, generation: postedGeneration });
    } catch {
      terminateWorker();
      clearOutcome();
      error = { ...WORKER_ERROR };
      state = "error";
    }
    emit();
    return getPublicState();
  }

  function edit(patch) {
    const nextDraft = { ...draft, ...patch };
    const changed = Object.keys(patch).some((key) => nextDraft[key] !== draft[key]);
    draft = nextDraft;
    isExample = false;
    if (!changed) {
      emit();
      return getPublicState();
    }
    if (state === "busy") {
      terminateWorker();
      generation += 1;
      clearOutcome();
      state = "dirty";
    } else if (state === "success" || state === "error" || state === "cancelled") {
      clearOutcome();
      state = "dirty";
    }
    emit();
    return getPublicState();
  }

  function loadExample() {
    const wasBusy = state === "busy";
    draft = { ...EXAMPLE };
    isExample = true;
    if (wasBusy) {
      terminateWorker();
      generation += 1;
      clearOutcome();
      state = "dirty";
    } else if (state === "success" || state === "error" || state === "cancelled") {
      clearOutcome();
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
    clearOutcome();
    state = "cancelled";
    emit();
    return getPublicState();
  }

  function reset() {
    terminateWorker();
    generation += 1;
    draft = { ...DEFAULTS };
    isExample = false;
    clearOutcome();
    state = "empty";
    emit();
    return getPublicState();
  }

  function destroy() {
    terminateWorker();
    generation += 1;
  }

  return { getState: getPublicState, getReportText, run, edit, loadExample, cancel, reset, destroy };
}
