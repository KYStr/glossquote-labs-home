import { DEFAULTS, EXAMPLE } from "./core/blood.mjs";

// Fields the draft holds per mode. Switching mode rebuilds the draft in the
// new mode's shape: the core accepts exactly one key set per mode, and the
// SPEC's controller fixtures pin drafts in exactly that shape.
function fieldsForMode(mode) {
  return mode === "pair" ? ["donor", "recipient"] : ["bloodType"];
}

function draftsEqual(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
}

function applyPatch(draft, patch) {
  if (patch === null || typeof patch !== "object") return { ...draft };
  let next = { ...draft };
  if (typeof patch.mode === "string" && patch.mode !== draft.mode) {
    next = { mode: patch.mode };
    for (const field of fieldsForMode(patch.mode)) {
      next[field] = typeof patch[field] === "string" ? patch[field] : "";
    }
  }
  for (const field of fieldsForMode(next.mode)) {
    if (typeof patch[field] === "string") next[field] = patch[field];
  }
  return next;
}

export function createController({ createWorker, onChange } = {}) {
  let state = "empty";
  let draft = { ...DEFAULTS };
  let result = null;
  let error = null;
  let isExample = false;
  let generation = 0;
  let worker = null;
  let destroyed = false;

  function snapshot() {
    return {
      state,
      draft: { ...draft },
      result,
      error,
      isExample,
      reportAvailable: state === "success",
    };
  }

  function emit() {
    if (!destroyed && typeof onChange === "function") onChange(snapshot());
  }

  function stopWorker() {
    if (worker !== null) {
      try {
        worker.terminate();
      } catch {
        // Terminating a failed worker is best-effort cleanup only.
      }
      worker = null;
    }
  }

  function edit(patch) {
    if (destroyed) return;
    const next = applyPatch(draft, patch);
    const changed = !draftsEqual(next, draft);
    draft = next;
    isExample = false;
    if (!changed) {
      emit();
      return;
    }
    if (state === "busy") {
      generation += 1;
      stopWorker();
      state = "dirty";
    } else if (state === "success" || state === "error" || state === "cancelled") {
      state = "dirty";
    }
    emit();
  }

  function loadExample() {
    if (destroyed) return;
    draft = { ...EXAMPLE };
    isExample = true;
    if (state === "busy") {
      generation += 1;
      stopWorker();
      state = "dirty";
    } else if (state !== "empty") {
      state = "dirty";
    }
    emit();
  }

  function run() {
    if (destroyed || state === "busy") return;
    generation += 1;
    const postedGeneration = generation;
    const postedSnapshot = { ...draft };
    let created;
    try {
      created = createWorker();
    } catch {
      worker = null;
      state = "error";
      error = { code: "WORKER_ERROR", field: null, row: null };
      emit();
      return;
    }
    worker = created;
    created.onmessage = (event) => {
      const data = event?.data;
      if (destroyed || data?.generation !== postedGeneration || state !== "busy") return;
      stopWorker();
      if (data.ok === true) {
        result = data.result;
        error = null;
        state = "success";
      } else {
        result = null;
        error = data.error ?? { code: "INTERNAL", field: null, row: null };
        state = "error";
      }
      emit();
    };
    created.onerror = () => {
      if (destroyed || state !== "busy") return;
      stopWorker();
      result = null;
      error = { code: "WORKER_ERROR", field: null, row: null };
      state = "error";
      emit();
    };
    state = "busy";
    emit();
    try {
      created.postMessage({ generation: postedGeneration, snapshot: postedSnapshot });
    } catch {
      if (destroyed || state !== "busy") return;
      stopWorker();
      result = null;
      error = { code: "WORKER_ERROR", field: null, row: null };
      state = "error";
      emit();
    }
  }

  function cancel() {
    if (destroyed || state !== "busy") return;
    generation += 1;
    stopWorker();
    state = "cancelled";
    emit();
  }

  function reset() {
    if (destroyed) return;
    generation += 1;
    stopWorker();
    draft = { ...DEFAULTS };
    result = null;
    error = null;
    isExample = false;
    state = "empty";
    emit();
  }

  function destroy() {
    destroyed = true;
    generation += 1;
    stopWorker();
  }

  return { edit, loadExample, run, cancel, reset, destroy, snapshot };
}
