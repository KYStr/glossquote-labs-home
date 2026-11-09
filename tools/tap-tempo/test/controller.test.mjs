// Controller tests: the four controller fixtures from fixtures.json
// driven by a fake scheduler whose completion timing the test controls,
// plus hand-derived transition cases. Expected states and values are
// taken verbatim from the fixtures.

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const byId = Object.fromEntries(
  fixtures.cases.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);

function createFakeScheduler() {
  let nextHandle = 1;
  const pending = new Map();
  return {
    schedule(fn) {
      const handle = nextHandle;
      nextHandle += 1;
      pending.set(handle, fn);
      return handle;
    },
    cancel(handle) {
      pending.delete(handle);
    },
    flush() {
      const fns = [...pending.values()];
      pending.clear();
      for (const fn of fns) fn();
    },
    get size() {
      return pending.size;
    },
  };
}

function createTestController() {
  const scheduler = createFakeScheduler();
  const controller = createController({
    schedule: scheduler.schedule,
    cancelScheduled: scheduler.cancel,
  });
  return { controller, scheduler };
}

function assertCheckpoint(state, expected) {
  for (const [key, value] of Object.entries(expected)) {
    if (key === "draft") assert.equal(state.importText, value, "draft");
    else if (key === "error") assert.deepEqual(state.error, value, "error");
    else assert.equal(state[key], value, key);
  }
}

test("fixture state-tapping-live: per-tap readings, gap reset, undo, reset", () => {
  const entry = byId["state-tapping-live"];
  const { controller, scheduler } = createTestController();
  entry.input.liveTaps.forEach((timestamp, index) => {
    controller.tap(timestamp);
    scheduler.flush();
    assertCheckpoint(controller.getState(), entry.expected[`afterTap${index + 1}`]);
  });
  controller.undo();
  scheduler.flush();
  assertCheckpoint(controller.getState(), entry.expected.afterUndo);
  controller.reset();
  assertCheckpoint(controller.getState(), entry.expected.afterReset);
});

test("fixture state-dirty-error: edit revokes the result, rerun reports the error", () => {
  const entry = byId["state-dirty-error"];
  const { controller, scheduler } = createTestController();
  controller.editImport(entry.input.initial);
  controller.runImport();
  scheduler.flush();
  assertCheckpoint(controller.getState(), entry.expected.afterRun);
  controller.editImport(entry.input.edit);
  assertCheckpoint(controller.getState(), entry.expected.afterEdit);
  controller.runImport();
  scheduler.flush();
  assertCheckpoint(controller.getState(), entry.expected.afterRerun);
});

test("fixture state-cancel-late: a late result cannot revive a cancelled run", () => {
  const entry = byId["state-cancel-late"];
  const { controller, scheduler } = createTestController();
  controller.editImport(entry.input.draft);
  controller.runImport();
  assertCheckpoint(controller.getState(), entry.expected.whilePending);
  const generation = controller.getState().generation;
  controller.cancel();
  assertCheckpoint(controller.getState(), entry.expected.afterCancel);
  controller.settle(generation, { ok: true, result: entry.input.lateResult });
  assertCheckpoint(controller.getState(), entry.expected.afterLateResult);
  controller.reset();
  assertCheckpoint(controller.getState(), entry.expected.afterReset);
  assert.equal(scheduler.size, 0);
});

test("fixture state-replace-late: an older success cannot replace a newer error", () => {
  const entry = byId["state-replace-late"];
  const { controller, scheduler } = createTestController();
  controller.editImport(entry.input.olderDraft);
  controller.runImport();
  const olderGeneration = controller.getState().generation;
  controller.editImport(entry.input.newerDraft);
  controller.runImport();
  scheduler.flush();
  assertCheckpoint(controller.getState(), entry.expected.afterNewerResult);
  controller.settle(olderGeneration, { ok: true, result: entry.input.olderLateResult });
  assertCheckpoint(controller.getState(), entry.expected.afterOlderLateResult);
});

test("same-millisecond and earlier taps are dropped by the controller", () => {
  const { controller, scheduler } = createTestController();
  controller.tap(100);
  controller.tap(100);
  controller.tap(50);
  assert.equal(controller.getState().tapCount, 1);
  scheduler.flush();
  const state = controller.getState();
  assert.equal(state.state, "tapping");
  assert.equal(state.intervalCount, 0);
  assert.equal(state.bpmMedian, null);
  assert.equal(state.downloadAvailable, false);
});

test("a successful import replaces the live taps; the next tap continues from them", () => {
  const { controller, scheduler } = createTestController();
  controller.editImport("0, 500, 1000");
  controller.runImport();
  scheduler.flush();
  assert.deepEqual(controller.getState().taps, [0, 500, 1000]);
  controller.tap(1500);
  scheduler.flush();
  const state = controller.getState();
  assert.equal(state.state, "tapping");
  assert.equal(state.tapCount, 4);
  assert.equal(state.bpmMedian, 120.0);
  assert.equal(state.downloadAvailable, true);
});

test("a successful import with no interval offers no download", () => {
  const { controller, scheduler } = createTestController();
  controller.editImport("42");
  controller.runImport();
  scheduler.flush();
  const state = controller.getState();
  assert.equal(state.state, "success");
  assert.equal(state.intervalCount, 0);
  assert.equal(state.downloadAvailable, false);
});

test("a failed import leaves the live taps untouched", () => {
  const { controller, scheduler } = createTestController();
  controller.tap(1000);
  controller.tap(1500);
  scheduler.flush();
  controller.editImport("0, 500, 499");
  controller.runImport();
  scheduler.flush();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.taps, [1000, 1500]);
});

test("cancel outside busy is a no-op; reset clears taps and import text", () => {
  const { controller, scheduler } = createTestController();
  controller.tap(1000);
  scheduler.flush();
  controller.cancel();
  assert.equal(controller.getState().state, "tapping");
  controller.editImport("0, 500");
  controller.reset();
  const state = controller.getState();
  assert.equal(state.state, "empty");
  assert.equal(state.tapCount, 0);
  assert.equal(state.importText, "");
  assert.equal(state.downloadAvailable, false);
});

test("editing the import text does not disturb a live reading", () => {
  const { controller, scheduler } = createTestController();
  controller.tap(1000);
  controller.tap(1500);
  scheduler.flush();
  controller.editImport("0, 500, 499");
  const state = controller.getState();
  assert.equal(state.state, "tapping");
  assert.equal(state.bpmMedian, 120.0);
  assert.equal(state.downloadAvailable, true);
});
