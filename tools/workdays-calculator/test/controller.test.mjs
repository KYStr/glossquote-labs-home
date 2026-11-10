import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { run } from "../public/js/core/core.mjs";
import { DEFAULT_DRAFT, createController, projectDraft } from "../public/js/controller.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const controllerCases = Object.fromEntries(
  fixtures.cases.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);

// A terminated fake can still deliver a reply to exercise the generation guard.
function fakeWorkers() {
  const queue = [];
  return {
    created: [],
    createWorker() {
      const worker = {
        terminated: false,
        postMessage(message) {
          this.posted = message;
          queue.push(() => this.onmessage({
            data: { generation: message.generation, ...run(message.snapshot) },
          }));
        },
        terminate() {
          this.terminated = true;
        },
      };
      this.created.push(worker);
      return worker;
    },
    fireNext() {
      const fn = queue.shift();
      if (fn) fn();
    },
    fireLast() {
      const fn = queue.pop();
      if (fn) fn();
    },
    get pending() {
      return queue.length;
    },
  };
}

test("controller fixture: state-dirty-error", () => {
  const entry = controllerCases["state-dirty-error"];
  const workers = fakeWorkers();
  const controller = createController({ createWorker: () => workers.createWorker() });

  controller.updateDraft(entry.input.initial);
  controller.execute();
  workers.fireNext();
  assert.equal(workers.created[0].terminated, true);
  let state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable },
    entry.expected.afterRun,
  );

  controller.updateDraft(entry.input.edit);
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable },
    entry.expected.afterEdit,
  );

  controller.execute();
  workers.fireNext();
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable, error: state.error },
    {
      state: entry.expected.afterRerun.state,
      reportAvailable: entry.expected.afterRerun.reportAvailable,
      error: entry.expected.afterRerun.error,
    },
  );
});

test("controller fixture: state-cancel-late", () => {
  const entry = controllerCases["state-cancel-late"];
  const workers = fakeWorkers();
  const controller = createController({ createWorker: () => workers.createWorker() });

  controller.updateDraft(entry.input.draft);
  controller.execute();
  let state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable },
    entry.expected.whilePending,
  );

  controller.cancel();
  assert.equal(workers.created[0].terminated, true);
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable, draft: state.draft },
    entry.expected.afterCancel,
  );

  // The pending work now settles late; a controller driven by the real
  // core would produce exactly the fixture's lateResult payload. Its
  // generation was invalidated by cancel(), so it must be dropped.
  workers.fireNext();
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable },
    entry.expected.afterLateResult,
  );

  controller.reset();
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable, draft: state.draft },
    entry.expected.afterReset,
  );
});

test("controller fixture: state-replace-late", () => {
  const entry = controllerCases["state-replace-late"];
  const workers = fakeWorkers();
  const controller = createController({ createWorker: () => workers.createWorker() });

  controller.updateDraft(entry.input.olderDraft);
  controller.execute();
  assert.equal(workers.pending, 1);

  controller.updateDraft(entry.input.newerDraft);
  controller.execute();
  assert.equal(workers.pending, 2);
  assert.equal(workers.created[0].terminated, true);
  assert.equal(workers.created[1].terminated, false);
  const newerGeneration = workers.created[1].posted.generation;
  workers.created[0].onmessage({
    data: { generation: newerGeneration, ok: true, result: entry.input.olderLateResult },
  });
  workers.created[0].onerror();
  assert.equal(controller.getState().status, "busy");

  // The newer work settles first, with an error.
  workers.fireLast();
  let state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable, error: state.error },
    entry.expected.afterNewerResult,
  );

  // The older work settles late with a success; it must not replace the error.
  workers.fireNext();
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable, error: state.error },
    entry.expected.afterOlderLateResult,
  );
});

test("projectDraft projects the five-field draft to the core's four-field input", () => {
  assert.deepStrictEqual(
    projectDraft({ mode: "count", startDate: "2026-01-02", endDate: "2026-01-09", days: "5", holidays: "" }),
    { mode: "count", startDate: "2026-01-02", endDate: "2026-01-09", holidays: "" },
  );
  assert.deepStrictEqual(
    projectDraft({ mode: "shift", startDate: "2026-01-02", endDate: "", days: "1", holidays: "" }),
    { mode: "shift", startDate: "2026-01-02", days: "1", holidays: "" },
  );
});

test("editing during busy work drops the pending settle", () => {
  const workers = fakeWorkers();
  const controller = createController({ createWorker: () => workers.createWorker() });
  controller.updateDraft({ mode: "count", startDate: "2026-01-02", endDate: "2026-01-09", days: "5", holidays: "" });
  controller.execute();
  assert.equal(controller.getState().status, "busy");
  controller.updateDraft({ mode: "count", startDate: "2026-01-02", endDate: "2026-01-12", days: "5", holidays: "" });
  assert.equal(workers.created[0].terminated, true);
  assert.equal(controller.getState().status, "dirty");
  workers.fireNext();
  const state = controller.getState();
  assert.equal(state.status, "dirty");
  assert.equal(state.resultAvailable, false);
});

test("switching mode invalidates a settled result immediately", () => {
  const workers = fakeWorkers();
  const controller = createController({ createWorker: () => workers.createWorker() });
  const draft = { mode: "count", startDate: "2026-01-02", endDate: "2026-01-09", days: "5", holidays: "" };
  controller.updateDraft(draft);
  controller.execute();
  workers.fireNext();
  assert.equal(controller.getState().resultAvailable, true);
  controller.updateDraft({ ...draft, mode: "shift" });
  const state = controller.getState();
  assert.equal(state.status, "dirty");
  assert.equal(state.resultAvailable, false);
  assert.equal(state.draft.endDate, "2026-01-09");
});

test("reset restores the pinned default draft and empty state", () => {
  const workers = fakeWorkers();
  const controller = createController({ createWorker: () => workers.createWorker() });
  controller.updateDraft({ mode: "shift", startDate: "2026-01-02", endDate: "", days: "1", holidays: "" });
  controller.execute();
  workers.fireNext();
  assert.equal(controller.getState().status, "success");
  controller.reset();
  const state = controller.getState();
  assert.equal(state.status, "empty");
  assert.deepStrictEqual(state.draft, { ...DEFAULT_DRAFT });
  assert.deepStrictEqual(state.draft, {
    mode: "count",
    startDate: "",
    endDate: "",
    days: "5",
    holidays: "",
  });
  assert.equal(state.resultAvailable, false);
});

test("reset, repeated execute, and pagehide stop their active workers", () => {
  const workers = fakeWorkers();
  const controller = createController({ createWorker: () => workers.createWorker() });
  const draft = controllerCases["state-dirty-error"].input.initial;
  controller.updateDraft(draft);
  controller.execute();
  controller.execute();
  assert.equal(workers.created[0].terminated, true);
  assert.equal(workers.created[1].terminated, false);
  controller.reset();
  assert.equal(workers.created[1].terminated, true);
  workers.fireNext();
  workers.fireNext();
  assert.equal(controller.getState().status, "empty");
  controller.updateDraft(draft);
  controller.execute();
  controller.discardPending();
  assert.equal(workers.created[2].terminated, true);
  workers.fireNext();
  assert.equal(controller.getState().status, "cancelled");
  assert.equal(controller.getState().resultAvailable, false);
  assert.deepEqual(controller.getState().draft, DEFAULT_DRAFT);
});

test("worker creation and message errors leave the draft available for retry", () => {
  const workers = fakeWorkers();
  let failCreation = true;
  let settlements = 0;
  const controller = createController({
    createWorker() {
      if (failCreation) throw new Error("synthetic constructor failure");
      return workers.createWorker();
    },
    onSettled: () => { settlements += 1; },
  });
  const draft = controllerCases["state-dirty-error"].input.initial;
  const expected = { code: "WORKER_ERROR", field: null, row: null };
  controller.updateDraft(draft);
  controller.execute();
  assert.deepEqual(controller.getState().error, expected);
  assert.deepEqual(controller.getState().draft, draft);
  failCreation = false;
  controller.execute();
  workers.created[0].onmessageerror();
  assert.equal(workers.created[0].terminated, true);
  assert.deepEqual(controller.getState().error, expected);
  controller.execute();
  workers.fireNext();
  assert.equal(controller.getState().status, "busy");
  workers.fireNext();
  assert.equal(controller.getState().status, "success");
  assert.equal(settlements, 3);
});
