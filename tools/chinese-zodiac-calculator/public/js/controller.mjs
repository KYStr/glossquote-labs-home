// Flow-state controller for the Chinese Zodiac Calculator.
//
// States: empty, dirty, busy, success, error, cancelled. Every run
// goes through an injected async executor (the Web Worker in the
// page, a fake in tests) with a monotonically increasing generation;
// edits during a run terminate the worker and bump the generation, so
// a late message from a superseded run can never overwrite the
// current state. Only the latest successful result is reportable.

import { buildReport, DEFAULTS, EXAMPLE } from "./core/zodiac.mjs";

const WORKER_ERROR = { code: "WORKER_ERROR", field: null, row: null };

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneDraft(draft) {
  return { birthDate: draft.birthDate, asOfDate: draft.asOfDate };
}

export function createController({ execute, onChange } = {}) {
  if (typeof execute !== "function") {
    throw new TypeError("createController requires an execute function");
  }
  const notify = typeof onChange === "function" ? onChange : () => {};

  let state = "empty";
  let draft = cloneDraft(DEFAULTS);
  let result = null;
  let error = null;
  let active = null;
  let generation = 0;

  function snapshot() {
    return {
      state,
      draft: cloneDraft(draft),
      result,
      error,
      reportAvailable: state === "success" && result !== null,
    };
  }

  function emit() {
    notify(snapshot());
  }

  function retireActive() {
    if (!active) return;
    const current = active;
    active = null;
    current.settled = true;
    current.cancel?.();
  }

  function settle(gen, outcome) {
    if (!active || active.generation !== gen || active.settled) return;
    active.settled = true;
    active = null;
    if (outcome && outcome.ok === true && isPlainObject(outcome.result)) {
      result = outcome.result;
      error = null;
      state = "success";
    } else if (
      outcome &&
      outcome.ok === false &&
      isPlainObject(outcome.error) &&
      typeof outcome.error.code === "string"
    ) {
      result = null;
      error = outcome.error;
      state = "error";
    } else {
      result = null;
      error = { ...WORKER_ERROR };
      state = "error";
    }
    emit();
  }

  function failRun(gen) {
    if (!active || active.generation !== gen || active.settled) return;
    active.settled = true;
    active = null;
    result = null;
    error = { ...WORKER_ERROR };
    state = "error";
    emit();
  }

  const controller = {
    getSnapshot: snapshot,

    setField(field, value) {
      if (!Object.hasOwn(DEFAULTS, field) || typeof value !== "string") return;
      draft = { ...draft, [field]: value };
      if (state === "busy") {
        retireActive();
        generation += 1;
        state = "dirty";
      } else if (state === "success" || state === "error" || state === "cancelled") {
        state = "dirty";
      } else if (state === "empty") {
        state = "dirty";
      }
      emit();
    },

    run() {
      retireActive();
      generation += 1;
      const gen = generation;
      result = null;
      error = null;
      state = "busy";
      emit();
      let handle;
      try {
        handle = execute(cloneDraft(draft), {
          onResult: (outcome) => settle(gen, outcome),
          onError: () => failRun(gen),
        });
      } catch {
        failRun(gen);
        return;
      }
      if (state === "busy" && gen === generation) {
        active = {
          generation: gen,
          settled: false,
          cancel: typeof handle?.cancel === "function" ? () => handle.cancel() : null,
        };
      } else if (handle && typeof handle.cancel === "function") {
        handle.cancel();
      }
    },

    cancel() {
      if (state !== "busy") return;
      retireActive();
      generation += 1;
      state = "cancelled";
      emit();
    },

    loadExample() {
      retireActive();
      generation += 1;
      draft = cloneDraft(EXAMPLE);
      result = null;
      error = null;
      state = "dirty";
      emit();
    },

    reset() {
      retireActive();
      generation += 1;
      draft = cloneDraft(DEFAULTS);
      result = null;
      error = null;
      state = "empty";
      emit();
    },

    downloadReport() {
      if (state !== "success" || result === null) return null;
      return buildReport(result);
    },

    destroy() {
      retireActive();
      generation += 1;
    },
  };

  return controller;
}
