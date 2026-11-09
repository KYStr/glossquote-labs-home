// Spacing Token Audit — draft / generation / resource controller.
// Pure state machine (no DOM, no network, no storage). The worker that runs
// the work is injected as a factory so tests can use a controllable fake
// worker; the app injects a real module Worker built from the embedded
// worker source, with a synchronous in-page fallback when a Worker cannot
// be created. Only a result whose generation matches the current generation
// and arrives while busy is accepted; late results are discarded.

import { DEFAULT_DRAFT, serializeReport } from "./core/audit.mjs";

export const STATES = Object.freeze([
  "empty",
  "dirty",
  "busy",
  "success",
  "error",
  "cancelled",
]);

export function createController({ createWorker }) {
  if (typeof createWorker !== "function") {
    throw new TypeError("createWorker factory is required");
  }

  let state = "empty";
  let draft = { ...DEFAULT_DRAFT };
  let result = null;
  let error = null;
  let generation = 0;
  let worker = null;
  const listeners = new Set();

  function snapshot() {
    return { state, draft: { ...draft }, result, error, generation };
  }

  function emit() {
    const snap = snapshot();
    for (const listener of listeners) listener(snap);
  }

  function terminateWorker() {
    if (worker !== null) {
      try {
        worker.terminate();
      } catch {
        // Termination is best-effort; the generation guard still discards
        // any late message from a worker that could not be terminated.
      }
      worker = null;
    }
  }

  function invalidate() {
    result = null;
    error = null;
  }

  function handleMessage(data) {
    if (
      data === null ||
      typeof data !== "object" ||
      data.generation !== generation ||
      state !== "busy"
    ) {
      return;
    }
    terminateWorker();
    const outcome = data.outcome;
    if (
      outcome === null ||
      typeof outcome !== "object" ||
      typeof outcome.ok !== "boolean"
    ) {
      error = { code: "WORKER_ERROR", field: null, row: null };
      state = "error";
      emit();
      return;
    }
    if (!outcome.ok) {
      error = outcome.error;
      state = "error";
      emit();
      return;
    }
    const serialized = serializeReport(outcome.result);
    if (!serialized.ok) {
      // A malformed result from the worker is a worker failure; only a
      // well-formed result that is too large to report is OUTPUT_LIMIT.
      error =
        serialized.error.code === "SCHEMA"
          ? { code: "WORKER_ERROR", field: null, row: null }
          : serialized.error;
      state = "error";
      emit();
      return;
    }
    result = outcome.result;
    state = "success";
    emit();
  }

  return {
    getState() {
      return snapshot();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    // Any input, option, source, or example change invalidates the old
    // result and download immediately. Editing while busy terminates the
    // running work and returns to dirty.
    edit(nextDraft) {
      draft = {
        tokens: nextDraft.tokens,
        measurements: nextDraft.measurements,
        tolerance: nextDraft.tolerance,
      };
      terminateWorker();
      invalidate();
      state = "dirty";
      emit();
    },

    loadExample(exampleDraft) {
      this.edit(exampleDraft);
    },

    // Starting work invalidates the old result, bumps the generation, and
    // posts the current snapshot plus generation to a fresh worker.
    // Running while busy restarts with the current draft.
    run() {
      terminateWorker();
      invalidate();
      generation += 1;
      state = "busy";
      const currentGeneration = generation;
      const snapshotDraft = { ...draft };
      emit();
      try {
        worker = createWorker();
      } catch {
        error = { code: "WORKER_ERROR", field: null, row: null };
        state = "error";
        emit();
        return;
      }
      worker.onmessage = (event) => {
        handleMessage(event === null || event === undefined ? null : event.data);
      };
      try {
        worker.postMessage({ snapshot: snapshotDraft, generation: currentGeneration });
      } catch {
        terminateWorker();
        error = { code: "WORKER_ERROR", field: null, row: null };
        state = "error";
        emit();
      }
    },

    // Cancelling keeps the draft, ends the work, and leaves no result.
    // Late results from the cancelled generation are discarded.
    cancel() {
      if (state !== "busy") return;
      terminateWorker();
      invalidate();
      state = "cancelled";
      emit();
    },

    // Reset stops any work, restores the default draft, and returns to empty.
    reset() {
      terminateWorker();
      draft = { ...DEFAULT_DRAFT };
      invalidate();
      state = "empty";
      emit();
    },

    // The downloadable report text for the current success snapshot,
    // or null when no valid result exists.
    getReportText() {
      if (state !== "success" || result === null) return null;
      const serialized = serializeReport(result);
      return serialized.ok ? serialized.text : null;
    },

    dispose() {
      terminateWorker();
    },
  };
}
