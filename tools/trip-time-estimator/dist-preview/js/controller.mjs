// Draft/work controller for the Trip Time Estimator.
//
// States: empty -> dirty -> busy -> success | error | cancelled.
// Every run posts the current draft snapshot to a fresh Worker with a
// generation number; replies are honoured only while that generation
// is still the busy one, so late replies can never revive an old run.
// Editing (including a mode switch or a route-preset fill, both routed
// here as patches) marks the draft dirty, terminates any worker, and
// clears the previous outcome.

import { DEFAULTS, EXAMPLE } from "./core/trip.mjs";

const WORKER_ERROR = { code: "WORKER_ERROR", field: null, row: null };

function cloneDraft(draft) {
  return {
    mode: draft.mode,
    departureDate: draft.departureDate,
    departureTime: draft.departureTime,
    departureOffset: draft.departureOffset,
    arrivalOffset: draft.arrivalOffset,
    duration: draft.duration,
    arrivalTime: draft.arrivalTime,
    arrivalNextDay: draft.arrivalNextDay,
  };
}

export function createController(dependencies) {
  const createWorker = dependencies.createWorker;
  const onChange = typeof dependencies.onChange === "function" ? dependencies.onChange : () => {};

  let state = "empty";
  let draft = cloneDraft(DEFAULTS);
  let isExample = false;
  let result = null;
  let error = null;
  let worker = null;
  let generation = 0;

  function snapshot() {
    return {
      state,
      draft: cloneDraft(draft),
      isExample,
      result,
      error,
      reportAvailable: state === "success" && result !== null,
    };
  }

  function emit() {
    onChange(snapshot());
  }

  function stopWorker() {
    if (worker !== null) {
      const current = worker;
      worker = null;
      current.terminate();
    }
  }

  function clearOutcome() {
    result = null;
    error = null;
  }

  function edit(patch) {
    let changed = false;
    for (const key of Object.keys(patch)) {
      if (draft[key] !== patch[key]) {
        draft[key] = patch[key];
        changed = true;
      }
    }
    if (!changed) {
      emit();
      return snapshot();
    }
    isExample = false;
    if (state === "busy") {
      stopWorker();
      generation += 1;
      clearOutcome();
      state = "dirty";
    } else if (state === "success" || state === "error" || state === "cancelled") {
      clearOutcome();
      state = "dirty";
    }
    emit();
    return snapshot();
  }

  function loadExample() {
    stopWorker();
    generation += 1;
    draft = cloneDraft(EXAMPLE);
    isExample = true;
    clearOutcome();
    if (state !== "empty") state = "dirty";
    emit();
    return snapshot();
  }

  function failWithWorkerError() {
    stopWorker();
    clearOutcome();
    error = { code: WORKER_ERROR.code, field: null, row: null };
    state = "error";
    emit();
    return snapshot();
  }

  function run() {
    stopWorker();
    generation += 1;
    const runGeneration = generation;
    clearOutcome();

    let created;
    try {
      created = createWorker();
    } catch {
      return failWithWorkerError();
    }
    worker = created;
    state = "busy";

    created.onmessage = (event) => {
      if (worker !== created || state !== "busy") return;
      const data = event === null || event === undefined ? null : event.data;
      if (data === null || typeof data !== "object" || data.generation !== runGeneration) return;
      stopWorker();
      if (data.ok === true) {
        result = data.result === undefined ? null : data.result;
        error = null;
        state = "success";
      } else {
        result = null;
        error =
          data.error !== null && typeof data.error === "object"
            ? {
                code: typeof data.error.code === "string" ? data.error.code : WORKER_ERROR.code,
                field: data.error.field === undefined ? null : data.error.field,
                row: null,
              }
            : { code: WORKER_ERROR.code, field: null, row: null };
        state = "error";
      }
      emit();
    };
    created.onerror = () => {
      if (worker !== created) return;
      failWithWorkerError();
    };

    try {
      created.postMessage({ snapshot: cloneDraft(draft), generation: runGeneration });
    } catch {
      return failWithWorkerError();
    }
    emit();
    return snapshot();
  }

  function cancel() {
    if (state !== "busy") {
      emit();
      return snapshot();
    }
    stopWorker();
    generation += 1;
    clearOutcome();
    state = "cancelled";
    emit();
    return snapshot();
  }

  function reset() {
    stopWorker();
    generation += 1;
    draft = cloneDraft(DEFAULTS);
    isExample = false;
    clearOutcome();
    state = "empty";
    emit();
    return snapshot();
  }

  function destroy() {
    stopWorker();
    generation += 1;
  }

  return { edit, loadExample, run, cancel, reset, destroy, snapshot };
}
