// Draft / work-state controller for the SemVer precedence tool.
//
// States (SPEC userFlow): empty, dirty, busy, success, error, cancelled.
// Work runs in a Worker created through the injected `createWorker`
// factory; every run bumps a generation number and the controller only
// accepts replies whose generation matches the current one while busy,
// so late replies can never revive an old result. Editing the draft,
// cancelling, resetting, or starting a new run terminates the old worker.
// No DOM access here: the app wires this controller to the page.

import { run, serializeReport } from "./core/semver.mjs";

export const DEFAULT_DRAFT = Object.freeze({ left: "", right: "" });

export function createController({ createWorker }) {
  if (typeof createWorker !== "function") {
    throw new TypeError("createWorker factory is required");
  }

  let generation = 0;
  let state = "empty";
  let draft = { ...DEFAULT_DRAFT };
  let result = null;
  let error = null;
  let report = null;
  let worker = null;
  const listeners = new Set();

  function snapshot() {
    return {
      state,
      draft: { ...draft },
      result: result === null ? null : { ...result },
      error: error === null ? null : { ...error },
      reportAvailable: report !== null,
    };
  }

  function emit() {
    const current = snapshot();
    for (const listener of listeners) listener(current);
  }

  function stopWorker() {
    if (worker !== null) {
      try {
        worker.terminate();
      } catch {
        // Termination is best-effort; the generation guard below still
        // discards any late message from this worker.
      }
      worker = null;
    }
  }

  function invalidate() {
    result = null;
    error = null;
    report = null;
  }

  function setDraft(next) {
    const incoming = {
      left: typeof next.left === "string" ? next.left : draft.left,
      right: typeof next.right === "string" ? next.right : draft.right,
    };
    if (incoming.left === draft.left && incoming.right === draft.right) {
      return snapshot();
    }
    draft = incoming;
    if (state === "busy") {
      // Terminate the worker and leave "busy": the state check below
      // already discards any in-flight reply, and run() is the only
      // place that advances the generation, so a later run can never
      // share a generation with this one.
      stopWorker();
      invalidate();
      state = "dirty";
    } else if (state === "success" || state === "error" || state === "cancelled") {
      invalidate();
      state = "dirty";
    }
    // From "empty" or "dirty" the state name is unchanged: there is no
    // result to revoke yet.
    emit();
    return snapshot();
  }

  function loadExample(example) {
    const incoming = {
      left: typeof example.left === "string" ? example.left : "",
      right: typeof example.right === "string" ? example.right : "",
    };
    if (state === "busy") {
      stopWorker();
    }
    draft = incoming;
    invalidate();
    state = "dirty";
    emit();
    return snapshot();
  }

  function finishWith(outcome) {
    stopWorker();
    if (outcome.ok) {
      const serialized = serializeReport(outcome.result);
      if (!serialized.ok) {
        result = null;
        error = serialized.error;
        report = null;
        state = "error";
      } else {
        result = outcome.result;
        error = null;
        report = serialized.text;
        state = "success";
      }
    } else {
      result = null;
      error = outcome.error;
      report = null;
      state = "error";
    }
    emit();
  }

  function run() {
    generation += 1;
    const myGeneration = generation;
    stopWorker();
    invalidate();
    state = "busy";
    emit();

    let nextWorker;
    try {
      nextWorker = createWorker();
    } catch {
      finishWith({
        ok: false,
        error: { code: "WORKER_ERROR", field: null, row: null },
      });
      return snapshot();
    }
    worker = nextWorker;
    worker.onmessage = (event) => {
      const message = event && event.data ? event.data : null;
      // The live generation, not the one captured when this worker was
      // created: a reply from a superseded run must be discarded even if
      // its message was already in flight when the worker was stopped.
      if (
        message === null ||
        message.generation !== generation ||
        state !== "busy"
      ) {
        return;
      }
      if (!message.outcome || typeof message.outcome !== "object") {
        finishWith({
          ok: false,
          error: { code: "WORKER_ERROR", field: null, row: null },
        });
        return;
      }
      finishWith(message.outcome);
    };
    worker.onerror = () => {
      if (state !== "busy") return;
      finishWith({
        ok: false,
        error: { code: "WORKER_ERROR", field: null, row: null },
      });
    };
    try {
      worker.postMessage({
        generation: myGeneration,
        input: { left: draft.left, right: draft.right },
      });
    } catch {
      finishWith({
        ok: false,
        error: { code: "WORKER_ERROR", field: null, row: null },
      });
    }
    return snapshot();
  }

  function cancel() {
    if (state !== "busy") return snapshot();
    stopWorker();
    invalidate();
    state = "cancelled";
    emit();
    return snapshot();
  }

  function reset() {
    stopWorker();
    draft = { ...DEFAULT_DRAFT };
    invalidate();
    state = "empty";
    emit();
    return snapshot();
  }

  function getReport() {
    return report;
  }

  function onChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    getState: snapshot,
    setDraft,
    loadExample,
    run,
    cancel,
    reset,
    getReport,
    onChange,
    // Exposed for tests only: the pure core entry point the worker runs.
    runCore: run,
  };
}
