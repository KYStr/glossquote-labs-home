// Controller tests: the three controller fixtures from the fixed
// spec's fixtures.json (vendored verbatim at test/fixtures.json from
// spec candidate f02756da51344f143425657d3bcefc478e1da521), driven by
// a fake worker whose completion is controllable, plus generation
// isolation, replacement, and worker-failure cases. Expected states,
// drafts, and errors are taken verbatim from the fixtures. This tool's
// fixtures use resultAvailable and errors shaped {code, path}.

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE } from "../public/js/core/concrete.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const controllerCases = Object.fromEntries(
  fixtures.cases.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);
const basicResult = fixtures.cases.find((entry) => entry.id === "slab-default-waste").expected.result;

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

function assertCheckpoint(state, expected) {
  assert.equal(state.state, expected.state);
  assert.equal(state.resultAvailable, expected.resultAvailable);
  if (expected.error !== undefined) assert.deepEqual(state.error, expected.error);
  if (expected.draft !== undefined) assert.deepEqual(state.draft, expected.draft);
}

test("fixture state-dirty-error", () => {
  const fixture = controllerCases["state-dirty-error"];
  const { controller, workers } = setup();
  controller.edit(fixture.input.initial);
  controller.run();
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: basicResult,
  });
  assertCheckpoint(controller.getState(), fixture.expected.afterRun);
  controller.edit(fixture.input.edit);
  assertCheckpoint(controller.getState(), fixture.expected.afterEdit);
  controller.run();
  workers[1].deliver({
    generation: workers[1].posted[0].generation,
    ok: false,
    error: { code: "RANGE", path: "/count" },
  });
  assertCheckpoint(controller.getState(), fixture.expected.afterRerun);
});

test("fixture state-cancel-late", () => {
  const fixture = controllerCases["state-cancel-late"];
  const { controller, workers } = setup();
  controller.edit(fixture.input.draft);
  controller.run();
  assertCheckpoint(controller.getState(), fixture.expected.whilePending);
  controller.cancel();
  assertCheckpoint(controller.getState(), fixture.expected.afterCancel);
  assert.equal(workers[0].terminated, true);
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: fixture.input.lateResult,
  });
  assertCheckpoint(controller.getState(), fixture.expected.afterLateResult);
  controller.reset();
  assertCheckpoint(controller.getState(), fixture.expected.afterReset);
});

test("fixture state-replace-late", () => {
  const fixture = controllerCases["state-replace-late"];
  const { controller, workers } = setup();
  controller.edit(fixture.input.olderDraft);
  controller.run();
  controller.edit(fixture.input.newerDraft);
  controller.run();
  assert.equal(workers[0].terminated, true);
  // The newer run's generation is whatever the controller posted to
  // its worker (the edit that replaced the draft bumped the
  // generation first); read it from the fake worker instead of
  // assuming a number.
  const newerGeneration = workers[1].posted[0].generation;
  workers[1].deliver({
    generation: newerGeneration,
    ok: false,
    error: { code: "RANGE", path: "/count" },
  });
  assertCheckpoint(controller.getState(), fixture.expected.afterNewerResult);
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: fixture.input.olderLateResult,
  });
  assertCheckpoint(controller.getState(), fixture.expected.afterOlderLateResult);
});

test("edit during busy terminates the worker, goes dirty, and drops the late reply", () => {
  const { controller, workers } = setup();
  controller.edit({ thicknessCm: "12" });
  controller.run();
  assert.equal(controller.getState().state, "busy");
  controller.edit({ thicknessCm: "15" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.resultAvailable, false);
  assert.equal(workers[0].terminated, true);
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: basicResult,
  });
  assert.equal(controller.getState().state, "dirty");
});

test("editing a field the current shape does not use still dirties the result", () => {
  const { controller, workers } = setup();
  controller.run();
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: basicResult,
  });
  assert.equal(controller.getState().state, "ready");
  controller.edit({ diameterCm: "45" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.resultAvailable, false);
  assert.equal(dirty.draft.diameterCm, "45");
  assert.equal(dirty.draft.shape, "slab");
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
    result: basicResult,
  });
  assert.equal(controller.getState().state, "ready");
});

test("cancel when not busy is a no-op", () => {
  const { controller } = setup();
  assert.equal(controller.getState().state, "empty");
  controller.cancel();
  assert.equal(controller.getState().state, "empty");
});

test("worker error becomes WORKER_ERROR and keeps the draft", () => {
  const { controller, workers } = setup();
  controller.edit({ count: "3" });
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", path: "" });
  assert.equal(state.draft.count, "3");
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
  assert.deepEqual(state.error, { code: "WORKER_ERROR", path: "" });
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

test("reset from ready restores the SPEC defaults and empty state", () => {
  const { controller, workers } = setup();
  controller.edit({ count: "5" });
  controller.run();
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: basicResult,
  });
  assert.equal(controller.getState().state, "ready");
  const reset = controller.reset();
  assert.equal(reset.state, "empty");
  assert.deepEqual(reset.draft, DEFAULTS);
  assert.equal(reset.resultAvailable, false);
  assert.equal(reset.result, null);
});

test("edit from empty stays empty; edit from error goes dirty", () => {
  const { controller, workers } = setup();
  controller.edit({ count: "2" });
  assert.equal(controller.getState().state, "empty");
  controller.run();
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: false,
    error: { code: "RANGE", path: "/count" },
  });
  assert.equal(controller.getState().state, "error");
  controller.edit({ count: "3" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.error, null);
});
