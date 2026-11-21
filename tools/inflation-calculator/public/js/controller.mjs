// Draft / sequence controller for the Inflation Calculator.
// No DOM access and no storage: the draft lives only in this page
// (SPEC: no persistent storage; leaving the page discards the draft).
// Computation runs in a Worker built through the injected createWorker
// factory. Tests drive it with a fake worker whose completion is
// controllable.
//
// States (SPEC userFlow): empty, dirty, busy, success, error,
// cancelled.
// - The sequence starts at 1 when the controller is created. Every
//   edit, reset and load-example increments it, and so does every run
//   that passes local validation and submits to the Worker. A run that
//   fails local validation never posts, so it leaves the sequence
//   unchanged.
// - Each mode keeps its own draft; switching modes preserves the other
//   mode's draft and never overwrites it. Switching modes invalidates
//   any shown result (goes dirty), as does any edit.
// - run() validates the draft locally first (the pure core). A local
//   failure goes straight to `error` with the core's error and no
//   worker is created. A valid draft is posted to a fresh worker.
// - A Worker reply is accepted only when its `sequence` equals the
//   current sequence, its echoed draft deep-equals the current draft,
//   and the controller is still `busy`; late replies are dropped,
//   never resurrected.
// - edit() during `busy` terminates the worker and goes `dirty`;
//   after a result, error or cancelled state it clears the outcome
//   and goes `dirty`; from `empty` it stays `empty`.
// - cancel() during `busy` terminates the worker and goes `cancelled`,
//   keeping the draft; a late reply afterwards is dropped. Cancel
//   elsewhere is a no-op.
// - A second run press while `busy` is ignored.
// - Worker construction, script loading or messaging failure goes to
//   `error` with WORKER_ERROR (never a fabricated result); local
//   validation still runs and can produce the pinned error state.
// - reset() is synchronous and restores the pinned default drafts
//   byte-for-byte, back in rate mode, in the `empty` state.

import {
  CPI_DEFAULTS,
  DEFAULTS,
  EXAMPLE,
  STATUS_TEXT,
  run as coreRun,
} from "./core/inflation.mjs";

export const WORKER_ERROR = { code: "WORKER_ERROR", field: null, row: null };

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

function draftEquals(a, b) {
  return canonical(a) === canonical(b);
}

export function createController({ createWorker, onChange = () => {} }) {
  let sequence = 1;
  let state = "empty";
  let drafts = { rate: { ...DEFAULTS }, cpi: { ...CPI_DEFAULTS } };
  let mode = "rate";
  let isExample = false;
  let result = null;
  let error = null;
  let worker = null;
  let statusOverride = null;

  function draft() {
    return drafts[mode];
  }

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

  function getPublicState() {
    return {
      state,
      sequence,
      draft: { ...draft() },
      isExample,
      result,
      error,
      reportAvailable: state === "success" && result !== null,
      status: statusOverride === null ? { ...STATUS_TEXT[state] } : { ...statusOverride },
    };
  }

  function run() {
    if (state === "busy") return getPublicState();
    statusOverride = null;
    const outcome = coreRun(draft());
    if (!outcome.ok) {
      result = null;
      error = outcome.error;
      state = "error";
      emit();
      return getPublicState();
    }
    terminateWorker();
    sequence += 1;
    result = null;
    error = null;
    state = "busy";
    const postedSequence = sequence;
    const snapshot = { ...draft() };
    let nextWorker;
    try {
      nextWorker = createWorker();
    } catch {
      result = null;
      error = { ...WORKER_ERROR };
      state = "error";
      emit();
      return getPublicState();
    }
    worker = nextWorker;
    worker.onmessage = (event) => {
      const data = event === null || event === undefined ? null : event.data;
      if (data === null || typeof data !== "object") return;
      if (data.sequence !== sequence || state !== "busy") return;
      if (!draftEquals(data.draft, draft())) return;
      terminateWorker();
      const reply = data.outcome;
      if (reply !== null && typeof reply === "object" && reply.ok === true) {
        result = reply.result;
        error = null;
        state = "success";
      } else if (reply !== null && typeof reply === "object" && reply.ok === false) {
        result = null;
        error = reply.error ?? { ...WORKER_ERROR };
        state = "error";
      } else {
        result = null;
        error = { ...WORKER_ERROR };
        state = "error";
      }
      emit();
    };
    worker.onerror = () => {
      if (postedSequence !== sequence || state !== "busy") return;
      terminateWorker();
      result = null;
      error = { ...WORKER_ERROR };
      state = "error";
      emit();
    };
    try {
      worker.postMessage({ sequence: postedSequence, draft: snapshot });
    } catch {
      terminateWorker();
      result = null;
      error = { ...WORKER_ERROR };
      state = "error";
    }
    emit();
    return getPublicState();
  }

  function edit(patch) {
    const nextMode =
      patch !== null &&
      typeof patch === "object" &&
      typeof patch.mode === "string" &&
      (patch.mode === "rate" || patch.mode === "cpi")
        ? patch.mode
        : mode;
    const modeChanged = nextMode !== mode;
    if (modeChanged) mode = nextMode;
    const { mode: _ignored, ...fields } = patch ?? {};
    drafts[mode] = { ...drafts[mode], ...fields };
    isExample = false;
    statusOverride = null;
    sequence += 1;
    if (state === "busy") {
      terminateWorker();
      result = null;
      error = null;
      state = "dirty";
    } else if (state === "success" || state === "error" || state === "cancelled") {
      result = null;
      error = null;
      state = "dirty";
    }
    emit();
    return getPublicState();
  }

  function loadExample() {
    const wasBusy = state === "busy";
    mode = "rate";
    drafts.rate = { ...EXAMPLE };
    isExample = true;
    statusOverride = { ...STATUS_TEXT.example };
    sequence += 1;
    if (wasBusy) {
      terminateWorker();
      result = null;
      error = null;
      state = "dirty";
    } else if (state === "success" || state === "error" || state === "cancelled") {
      result = null;
      error = null;
      state = "dirty";
    }
    emit();
    return getPublicState();
  }

  function cancel() {
    if (state !== "busy") return getPublicState();
    terminateWorker();
    result = null;
    error = null;
    state = "cancelled";
    emit();
    return getPublicState();
  }

  function reset() {
    terminateWorker();
    sequence += 1;
    drafts = { rate: { ...DEFAULTS }, cpi: { ...CPI_DEFAULTS } };
    mode = "rate";
    isExample = false;
    result = null;
    error = null;
    state = "empty";
    statusOverride = { ...STATUS_TEXT.reset };
    emit();
    return getPublicState();
  }

  function destroy() {
    terminateWorker();
    sequence += 1;
  }

  return { getState: getPublicState, run, edit, loadExample, cancel, reset, destroy };
}
