// Controller tests: the three controller fixtures from the SPEC's
// fixtures.json (vendored verbatim at test/fixtures.json, spec candidate
// commit eb7950f87f826a1758d430e7ba7c822d44dc64f8), driven by a fake worker
// whose completion is controllable, plus generation-isolation and
// worker-failure cases. Expected states, drafts, and errors are taken
// verbatim from the fixtures.

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE } from "../public/js/core/overtime.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const controllerCases = Object.fromEntries(
  fixtures.cases.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);
const weekdayBasic = fixtures.cases.find((entry) => entry.id === "weekday-basic");

function makeFakeWorker() {
  return {
    posted: [],
    terminated: false,
    onmessage: null,
    onerror: null,
    postMessage(message) {
      this.posted.push(message);
    },
    terminate() {
      this.terminated = true;
    },
    deliver(payload) {
      this.onmessage?.({ data: payload });
    },
    fail() {
      this.onerror?.(new Error("boom"));
    },
  };
}

function setup() {
  const workers = [];
  const controller = createController({
    createWorker: () => {
      const worker = makeFakeWorker();
      workers.push(worker);
      return worker;
    },
  });
  return { controller, workers };
}

test("fixture state-dirty-error", () => {
  const fixture = controllerCases["state-dirty-error"];
  const { controller, workers } = setup();
  controller.edit(fixture.input.initial);
  controller.run();
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: weekdayBasic.expected.result,
  });
  const afterRun = controller.getState();
  assert.equal(afterRun.state, fixture.expected.afterRun.state);
  assert.equal(afterRun.reportAvailable, fixture.expected.afterRun.reportAvailable);
  controller.edit(fixture.input.edit);
  const afterEdit = controller.getState();
  assert.equal(afterEdit.state, fixture.expected.afterEdit.state);
  assert.equal(afterEdit.reportAvailable, fixture.expected.afterEdit.reportAvailable);
  controller.run();
  workers[1].deliver({
    generation: workers[1].posted[0].generation,
    ok: false,
    error: { code: "RANGE", field: "hours", row: 0 },
  });
  const afterRerun = controller.getState();
  assert.equal(afterRerun.state, fixture.expected.afterRerun.state);
  assert.equal(afterRerun.reportAvailable, fixture.expected.afterRerun.reportAvailable);
  assert.deepEqual(afterRerun.error, fixture.expected.afterRerun.error);
});

test("fixture state-cancel-late", () => {
  const fixture = controllerCases["state-cancel-late"];
  const { controller, workers } = setup();
  controller.edit(fixture.input.draft);
  controller.run();
  const whilePending = controller.getState();
  assert.equal(whilePending.state, fixture.expected.whilePending.state);
  assert.equal(whilePending.reportAvailable, fixture.expected.whilePending.reportAvailable);
  controller.cancel();
  const afterCancel = controller.getState();
  assert.equal(afterCancel.state, fixture.expected.afterCancel.state);
  assert.equal(afterCancel.reportAvailable, fixture.expected.afterCancel.reportAvailable);
  assert.deepEqual(afterCancel.draft, fixture.expected.afterCancel.draft);
  assert.equal(workers[0].terminated, true);
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: fixture.input.lateResult,
  });
  const afterLateResult = controller.getState();
  assert.equal(afterLateResult.state, fixture.expected.afterLateResult.state);
  assert.equal(afterLateResult.reportAvailable, fixture.expected.afterLateResult.reportAvailable);
  controller.reset();
  const afterReset = controller.getState();
  assert.equal(afterReset.state, fixture.expected.afterReset.state);
  assert.equal(afterReset.reportAvailable, fixture.expected.afterReset.reportAvailable);
  assert.deepEqual(afterReset.draft, fixture.expected.afterReset.draft);
});

test("fixture state-replace-late", () => {
  const fixture = controllerCases["state-replace-late"];
  const { controller, workers } = setup();
  controller.edit(fixture.input.olderDraft);
  controller.run();
  controller.edit(fixture.input.newerDraft);
  controller.run();
  assert.equal(workers[0].terminated, true);
  // The newer run's generation is whatever the controller posted to its
  // worker (the replacing edit bumped the generation first); read it from
  // the fake worker instead of assuming a number.
  const newerGeneration = workers[1].posted[0].generation;
  workers[1].deliver({
    generation: newerGeneration,
    ok: false,
    error: { code: "RANGE", field: "hours", row: 0 },
  });
  const afterNewerResult = controller.getState();
  assert.equal(afterNewerResult.state, fixture.expected.afterNewerResult.state);
  assert.equal(afterNewerResult.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(afterNewerResult.error, fixture.expected.afterNewerResult.error);
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: fixture.input.olderLateResult,
  });
  const afterOlderLateResult = controller.getState();
  assert.equal(afterOlderLateResult.state, fixture.expected.afterOlderLateResult.state);
  assert.equal(afterOlderLateResult.reportAvailable, fixture.expected.afterOlderLateResult.reportAvailable);
  assert.deepEqual(afterOlderLateResult.error, fixture.expected.afterOlderLateResult.error);
});

test("edit during busy terminates the worker, goes dirty, and drops the late reply", () => {
  const { controller, workers } = setup();
  controller.edit({ monthlySalary: "36000" });
  controller.run();
  assert.equal(controller.getState().state, "busy");
  controller.edit({ entries: [{ date: "2024-02-01", kind: "weekday", hours: "2" }] });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.reportAvailable, false);
  assert.equal(workers[0].terminated, true);
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: weekdayBasic.expected.result,
  });
  assert.equal(controller.getState().state, "dirty");
});

test("running while busy replaces the worker", () => {
  const { controller, workers } = setup();
  controller.run();
  controller.run();
  assert.equal(workers[0].terminated, true);
  assert.equal(workers[1].terminated, false);
  assert.equal(controller.getState().state, "busy");
  workers[1].deliver({
    generation: workers[1].posted[0].generation,
    ok: true,
    result: weekdayBasic.expected.result,
  });
  assert.equal(controller.getState().state, "success");
});

test("cancel when not busy is a no-op", () => {
  const { controller } = setup();
  assert.equal(controller.getState().state, "empty");
  controller.cancel();
  assert.equal(controller.getState().state, "empty");
});

test("worker error becomes WORKER_ERROR and keeps the draft", () => {
  const { controller, workers } = setup();
  controller.edit({ monthlySalary: "43500" });
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(state.draft.monthlySalary, "43500");
  assert.equal(state.reportAvailable, false);
});

test("a createWorker throw becomes WORKER_ERROR", () => {
  const controller = createController({
    createWorker: () => {
      throw new Error("no worker");
    },
  });
  controller.run();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
});

test("loadExample fills the first fixture case and waits for a manual run", () => {
  const { controller, workers } = setup();
  const loaded = controller.loadExample();
  assert.deepEqual(loaded.draft, EXAMPLE);
  assert.equal(loaded.isExample, true);
  assert.equal(loaded.state, "empty");
  controller.run();
  assert.deepEqual(workers[0].posted[0].snapshot, EXAMPLE);
});

test("reset from success restores defaults and empty state", () => {
  const { controller, workers } = setup();
  controller.edit({ monthlySalary: "36000" });
  controller.run();
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: weekdayBasic.expected.result,
  });
  assert.equal(controller.getState().state, "success");
  const reset = controller.reset();
  assert.equal(reset.state, "empty");
  assert.deepEqual(reset.draft, DEFAULTS);
  assert.equal(reset.reportAvailable, false);
  assert.equal(reset.result, null);
});

test("edit from empty stays empty; edit from error goes dirty", () => {
  const { controller, workers } = setup();
  controller.edit({ monthlySalary: "36000" });
  assert.equal(controller.getState().state, "empty");
  controller.run();
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: false,
    error: { code: "RANGE", field: "hours", row: 0 },
  });
  assert.equal(controller.getState().state, "error");
  controller.edit({ entries: [{ date: "2024-02-01", kind: "weekday", hours: "2" }] });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.error, null);
});

test("nested draft copies are isolated and worker snapshots are deeply immutable", () => {
  const { controller, workers } = setup();
  const entries = [{ date: "2024-02-01", kind: "weekday", hours: "1" }];
  controller.edit({ monthlySalary: "36000", month: "2024-02", entries });
  entries[0].hours = "4";
  controller.getState().draft.entries[0].hours = "3";
  controller.run();
  const { snapshot } = workers[0].posted[0];
  assert.deepEqual(snapshot.entries, [{ date: "2024-02-01", kind: "weekday", hours: "1" }]);
  assert.ok(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.entries) && Object.isFrozen(snapshot.entries[0]));
});

test("removing a row and resetting prevent old success and error from publishing", () => {
  const { controller, workers } = setup();
  const twoRows = [
    { date: "2024-02-01", kind: "weekday", hours: "1" },
    { date: "2024-02-02", kind: "weekday", hours: "1" },
  ];
  controller.edit({ monthlySalary: "36000", month: "2024-02", entries: twoRows });
  controller.run();
  controller.edit({ entries: twoRows.slice(0, 1) });
  assert.equal(workers[0].terminated, true);
  controller.run();
  // The old worker cannot forge a matching newer generation either.
  workers[0].deliver({
    generation: workers[1].posted[0].generation,
    ok: true,
    result: weekdayBasic.expected.result,
  });
  workers[0].fail();
  assert.equal(controller.getState().state, "busy");
  controller.reset();
  workers[1].deliver({
    generation: workers[1].posted[0].generation,
    ok: true,
    result: weekdayBasic.expected.result,
  });
  workers[1].fail();
  assert.equal(workers[1].terminated, true);
  assert.deepEqual(controller.getState().draft, DEFAULTS);
  assert.equal(controller.getState().state, "empty");
});

test("a worker post failure terminates it and preserves the draft", () => {
  const worker = makeFakeWorker();
  worker.postMessage = () => { throw new Error("post failed"); };
  const controller = createController({ createWorker: () => worker });
  controller.loadExample();
  const state = controller.run();
  assert.equal(worker.terminated, true);
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.deepEqual(state.draft, EXAMPLE);
});
