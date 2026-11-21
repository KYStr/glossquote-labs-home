// Draft / sequence controller for the Group Generator.
// No DOM access: the app wires this to the form (the onChange callback
// is the view adapter), and computation runs in a Worker built through
// the injected createWorker factory. The seed is filled through the
// injected fillSeed function (the app supplies the platform entropy
// source); the controller itself never invents a seed and never reads
// any entropy source directly. Tests drive it with a fake worker whose
// completion is controllable and a stub fillSeed.
//
// States (SPEC section 2): empty, dirty, busy, success, error,
// cancelled.
// - The sequence starts at 1 when the controller is created. Every
//   edit, reset, load-example and every run that passes local
//   validation and submits to the Worker increments it. A run that
//   fails local validation never posts, so it leaves the sequence
//   unchanged.
// - run() fills a blank seed first (through fillSeed), then validates
//   the draft locally (the pure core). A local failure goes straight
//   to `error` with the core's error and no worker is created. A
//   fillSeed that returns null means the platform cannot supply a
//   seed: the controller goes to `error` with INTERNAL and sets
//   seedFillFailed, so the app can show the pinned message instead.
//   A valid draft is posted to a fresh worker.
// - A Worker reply is accepted only when its `sequence` equals the
//   current sequence, its echoed draft deep-equals the current draft,
//   and the controller is still `busy`; late replies are dropped,
//   never resurrected.
// - edit() during `busy` terminates the worker and goes `dirty`;
//   after a result, error or cancelled state it clears the outcome
//   and goes `dirty`; from `empty` a real change goes `dirty`.
// - cancel() during `busy` terminates the worker and goes
//   `cancelled`, keeping the draft; otherwise it is a no-op.
// - A second run press while `busy` is ignored.
// - Worker construction, script loading or messaging failure goes to
//   `error` with WORKER_ERROR (never a fabricated result); local
//   validation still runs and can produce the pinned error state.
// - reset() is synchronous and restores the pinned default draft
//   byte-for-byte, back to `empty`.

import {
  DEFAULT_DRAFT,
  EXAMPLE_INPUT,
  FIELDS,
  STATUS_MESSAGES,
  run as coreRun,
} from "./core/group-generator.mjs";

export const WORKER_ERROR = { code: "WORKER_ERROR", field: null, row: null };

function draftEquals(a, b) {
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  return FIELDS.every((field) => a[field] === b[field]);
}

export function createController({ createWorker, fillSeed = null, onChange = () => {} }) {
  let sequence = 1;
  let state = "empty";
  let draft = { ...DEFAULT_DRAFT };
  let isExample = false;
  let result = null;
  let error = null;
  let seedFillFailed = false;
  let worker = null;
  let statusOverride = null;

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
      draft: { ...draft },
      isExample,
      result,
      error,
      seedFillFailed,
      reportAvailable: state === "success" && result !== null,
      status: statusOverride === null ? { ...STATUS_MESSAGES[state] } : { ...statusOverride },
    };
  }

  function run() {
    if (state === "busy") return getPublicState();
    statusOverride = null;
    seedFillFailed = false;
    if (draft.seed === "") {
      let filled = null;
      try {
        filled = typeof fillSeed === "function" ? fillSeed() : null;
      } catch {
        filled = null;
      }
      if (filled === null || filled === undefined || filled === "") {
        result = null;
        error = { code: "INTERNAL", field: "seed", row: null };
        seedFillFailed = true;
        state = "error";
        emit();
        return getPublicState();
      }
      draft = { ...draft, seed: String(filled) };
    }
    const outcome = coreRun(draft);
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
    const snapshot = { ...draft };
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
      if (!draftEquals(data.draft, draft)) return;
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
    const nextDraft = { ...draft, ...patch };
    const changed = FIELDS.some((field) => nextDraft[field] !== draft[field]);
    draft = nextDraft;
    isExample = false;
    statusOverride = null;
    sequence += 1;
    if (changed) {
      if (state === "busy") {
        terminateWorker();
        result = null;
        error = null;
        state = "dirty";
      } else if (
        state === "success" ||
        state === "error" ||
        state === "cancelled" ||
        state === "empty"
      ) {
        result = null;
        error = null;
        state = "dirty";
      }
    }
    emit();
    return getPublicState();
  }

  function loadExample() {
    const wasBusy = state === "busy";
    draft = { ...EXAMPLE_INPUT };
    isExample = true;
    statusOverride = {
      "zh-Hant": "已載入範例，請按「隨機分組」執行。",
      en: "Example loaded. Run “Generate groups” to group them.",
    };
    sequence += 1;
    if (wasBusy) {
      terminateWorker();
      result = null;
      error = null;
    } else if (state === "success" || state === "error" || state === "cancelled") {
      result = null;
      error = null;
    }
    state = "dirty";
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
    draft = { ...DEFAULT_DRAFT };
    isExample = false;
    result = null;
    error = null;
    seedFillFailed = false;
    state = "empty";
    statusOverride = { "zh-Hant": "已重設", en: "Reset" };
    emit();
    return getPublicState();
  }

  function destroy() {
    terminateWorker();
    sequence += 1;
  }

  return { getState: getPublicState, run, edit, loadExample, cancel, reset, destroy };
}
