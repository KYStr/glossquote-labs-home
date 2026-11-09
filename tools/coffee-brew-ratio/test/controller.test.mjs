// Controller tests: the three controller fixtures from the fixed spec's
// fixtures.json (vendored verbatim at test/fixtures.json from spec
// candidate ea00dfbb1d076eb3eedd47e1f3d4afae204d578d), driven by a fake
// worker whose completion is controllable, plus generation-isolation,
// replacement, and worker-failure cases. Expected states, drafts, and
// errors are taken verbatim from the fixtures.

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE } from "../public/js/core/brew.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const controllerCases = Object.fromEntries(
  fixtures.cases.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);
const doseResult = fixtures.cases.find((entry) => entry.id === "dose-preset-15").expected.result;

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
  const afterRunState = controller.run();
  assert.equal(afterRunState.state, "busy");
  assert.equal(afterRunState.resultAvailable, false);
  workers[0].deliver({ generation: 1, ok: true, result: doseResult });
  const success = controller.getState();
  assert.equal(success.state, fixture.expected.afterRun.state);
  assert.equal(success.resultAvailable, fixture.expected.afterRun.resultAvailable);
  controller.edit(fixture.input.edit);
  const afterEdit = controller.getState();
  assert.equal(afterEdit.state, fixture.expected.afterEdit.state);
  assert.equal(afterEdit.resultAvailable, fixture.expected.afterEdit.resultAvailable);
  controller.run();
  workers[1].deliver({
    generation: 2,
    ok: false,
    error: { code: "RANGE", field: "amount", row: null },
  });
  const afterRerun = controller.getState();
  assert.equal(afterRerun.state, fixture.expected.afterRerun.state);
  assert.equal(afterRerun.resultAvailable, fixture.expected.afterRerun.resultAvailable);
  assert.deepEqual(afterRerun.error, fixture.expected.afterRerun.error);
});

test("fixture state-cancel-late", () => {
  const fixture = controllerCases["state-cancel-late"];
  const { controller, workers } = setup();
  controller.edit(fixture.input.draft);
  controller.run();
  const whilePending = controller.getState();
  assert.equal(whilePending.state, fixture.expected.whilePending.state);
  assert.equal(whilePending.resultAvailable, fixture.expected.whilePending.resultAvailable);
  controller.cancel();
  const afterCancel = controller.getState();
  assert.equal(afterCancel.state, fixture.expected.afterCancel.state);
  assert.equal(afterCancel.resultAvailable, fixture.expected.afterCancel.resultAvailable);
  assert.deepEqual(afterCancel.draft, fixture.expected.afterCancel.draft);
  assert.equal(workers[0].terminated, true);
  workers[0].deliver({ generation: 1, ok: true, result: fixture.input.lateResult });
  const afterLateResult = controller.getState();
  assert.equal(afterLateResult.state, fixture.expected.afterLateResult.state);
  assert.equal(afterLateResult.resultAvailable, fixture.expected.afterLateResult.resultAvailable);
  controller.reset();
  const afterReset = controller.getState();
  assert.equal(afterReset.state, fixture.expected.afterReset.state);
  assert.equal(afterReset.resultAvailable, fixture.expected.afterReset.resultAvailable);
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
  // worker (the edit that replaced the draft bumped the generation first);
  // read it from the fake worker instead of assuming a number.
  const newerGeneration = workers[1].posted[0].generation;
  workers[1].deliver({
    generation: newerGeneration,
    ok: false,
    error: { code: "RANGE", field: "amount", row: null },
  });
  const afterNewerResult = controller.getState();
  assert.equal(afterNewerResult.state, fixture.expected.afterNewerResult.state);
  assert.equal(afterNewerResult.resultAvailable, fixture.expected.afterNewerResult.resultAvailable);
  assert.deepEqual(afterNewerResult.error, fixture.expected.afterNewerResult.error);
  workers[0].deliver({ generation: 1, ok: true, result: fixture.input.olderLateResult });
  const afterOlderLateResult = controller.getState();
  assert.equal(afterOlderLateResult.state, fixture.expected.afterOlderLateResult.state);
  assert.equal(
    afterOlderLateResult.resultAvailable,
    fixture.expected.afterOlderLateResult.resultAvailable,
  );
  assert.deepEqual(afterOlderLateResult.error, fixture.expected.afterOlderLateResult.error);
});

test("edit during busy terminates the worker, goes dirty, and drops the late reply", () => {
  const { controller, workers } = setup();
  controller.run();
  assert.equal(controller.getState().state, "busy");
  controller.edit({ amount: "30" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.resultAvailable, false);
  assert.equal(workers[0].terminated, true);
  workers[0].deliver({ generation: 1, ok: true, result: doseResult });
  assert.equal(controller.getState().state, "dirty");
});

test("running while busy replaces the worker", () => {
  const { controller, workers } = setup();
  controller.run();
  controller.run();
  assert.equal(workers[0].terminated, true);
  assert.equal(workers[1].terminated, false);
  assert.equal(controller.getState().state, "busy");
  workers[1].deliver({ generation: 2, ok: true, result: doseResult });
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
  controller.edit({ amount: "25" });
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(state.draft.amount, "25");
  assert.equal(state.resultAvailable, false);
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
  assert.equal(workers[0].posted[0].generation, 1);
});

test("reset from success restores defaults and empty state", () => {
  const { controller, workers } = setup();
  controller.run();
  workers[0].deliver({ generation: 1, ok: true, result: doseResult });
  assert.equal(controller.getState().state, "success");
  const reset = controller.reset();
  assert.equal(reset.state, "empty");
  assert.deepEqual(reset.draft, DEFAULTS);
  assert.equal(reset.resultAvailable, false);
  assert.equal(reset.result, null);
});

test("edit from empty stays empty; edit from error goes dirty", () => {
  const { controller, workers } = setup();
  controller.edit({ amount: "30" });
  assert.equal(controller.getState().state, "empty");
  controller.run();
  workers[0].deliver({
    generation: 1,
    ok: false,
    error: { code: "RANGE", field: "amount", row: null },
  });
  assert.equal(controller.getState().state, "error");
  controller.edit({ amount: "20" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.error, null);
});

test("switching mode is a draft edit: it revokes a result and keeps other fields", () => {
  const { controller, workers } = setup();
  controller.run();
  workers[0].deliver({ generation: 1, ok: true, result: doseResult });
  assert.equal(controller.getState().state, "success");
  const dirty = controller.edit({ mode: "water" });
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.resultAvailable, false);
  assert.equal(dirty.draft.mode, "water");
  assert.equal(dirty.draft.amount, "20");
});
