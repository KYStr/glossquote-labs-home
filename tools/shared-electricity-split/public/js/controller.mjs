// Draft / work-generation controller for the Shared Electricity Split.
// No DOM access: the app wires this to the form, the controller talks to
// a Worker through the injected createWorker factory, and tests drive it
// with a fake worker whose completion is controllable.
//
// States (SPEC userFlow): empty, dirty, busy, success, error, cancelled.
// - run() invalidates any old result, bumps the generation, and posts a
//   deep snapshot of the current draft to a fresh worker. Only a reply
//   carrying the current generation while still busy is accepted; late
//   replies are dropped, never resurrected.
// - Any edit (field change, room add/remove, example load, whole-draft
//   replacement) during busy terminates the worker and goes dirty; after
//   a result, error, or cancellation it clears the outcome and goes
//   dirty; from empty it stays empty (nothing to revoke).
// - cancel() terminates the worker and keeps the draft; a late reply
//   after cancelling cannot revive the result.
// - reset() stops work, restores the SPEC defaults, and returns to empty.

import { DEFAULTS, EXAMPLE, MAX_ROOMS, MIN_ROOMS } from "./core/split.mjs";

export const WORKER_ERROR = { code: "WORKER_ERROR", field: null, row: null };

function cloneDraft(draft) {
  return {
    totalBill: draft.totalBill,
    totalDelta: draft.totalDelta,
    rooms: draft.rooms.map((room) => ({ name: room.name, start: room.start, end: room.end })),
  };
}

export function createController({ createWorker, onChange = () => {} }) {
  let generation = 0;
  let state = "empty";
  let draft = cloneDraft(DEFAULTS);
  let isExample = false;
  let result = null;
  let error = null;
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

  function getPublicState() {
    return {
      state,
      draft: cloneDraft(draft),
      isExample,
      result,
      error,
      reportAvailable: state === "success" && result !== null,
    };
  }

  // Shared transition for every kind of edit: the draft has already been
  // replaced by the caller when this runs.
  function afterEdit() {
    isExample = false;
    if (state === "busy") {
      terminateWorker();
      generation += 1;
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

  function editTop(field, value) {
    if (field !== "totalBill" && field !== "totalDelta") return getPublicState();
    if (draft[field] === value) {
      emit();
      return getPublicState();
    }
    draft = { ...draft, [field]: value };
    return afterEdit();
  }

  function editRoom(index, field, value) {
    if (!Number.isInteger(index) || index < 0 || index >= draft.rooms.length) {
      return getPublicState();
    }
    if (field !== "name" && field !== "start" && field !== "end") return getPublicState();
    if (draft.rooms[index][field] === value) {
      emit();
      return getPublicState();
    }
    const rooms = draft.rooms.map((room, i) => (i === index ? { ...room, [field]: value } : room));
    draft = { ...draft, rooms };
    return afterEdit();
  }

  function addRoom() {
    if (draft.rooms.length >= MAX_ROOMS) {
      emit();
      return getPublicState();
    }
    draft = { ...draft, rooms: [...draft.rooms, { name: "", start: "", end: "" }] };
    return afterEdit();
  }

  function removeRoom(index) {
    if (!Number.isInteger(index) || index < 0 || index >= draft.rooms.length) {
      return getPublicState();
    }
    if (draft.rooms.length <= MIN_ROOMS) {
      emit();
      return getPublicState();
    }
    draft = { ...draft, rooms: draft.rooms.filter((room, i) => i !== index) };
    return afterEdit();
  }

  function setDraft(nextDraft) {
    draft = cloneDraft(nextDraft);
    return afterEdit();
  }

  function run() {
    terminateWorker();
    generation += 1;
    result = null;
    error = null;
    state = "busy";
    const snapshot = cloneDraft(draft);
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
        state = "success";
      } else {
        result = null;
        error = data.error ?? { ...WORKER_ERROR };
        state = "error";
      }
      emit();
    };
    worker.onerror = () => {
      if (generation !== postedGeneration || state !== "busy") return;
      terminateWorker();
      result = null;
      error = { ...WORKER_ERROR };
      state = "error";
      emit();
    };
    try {
      worker.postMessage({ snapshot, generation: postedGeneration });
    } catch {
      terminateWorker();
      result = null;
      error = { ...WORKER_ERROR };
      state = "error";
    }
    emit();
    return getPublicState();
  }

  function loadExample() {
    draft = cloneDraft(EXAMPLE);
    if (state === "busy") {
      terminateWorker();
      generation += 1;
      result = null;
      error = null;
      state = "dirty";
    } else if (state === "success" || state === "error" || state === "cancelled") {
      result = null;
      error = null;
      state = "dirty";
    }
    isExample = true;
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
    result = null;
    error = null;
    state = "cancelled";
    emit();
    return getPublicState();
  }

  function reset() {
    terminateWorker();
    generation += 1;
    draft = cloneDraft(DEFAULTS);
    isExample = false;
    result = null;
    error = null;
    state = "empty";
    emit();
    return getPublicState();
  }

  function destroy() {
    terminateWorker();
    generation += 1;
  }

  return {
    getState: getPublicState,
    run,
    editTop,
    editRoom,
    addRoom,
    removeRoom,
    setDraft,
    loadExample,
    cancel,
    reset,
    destroy,
  };
}
