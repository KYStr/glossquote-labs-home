// Controller tests: the three controller fixtures from fixtures.json
// driven by a fake scheduler whose completion timing the test controls,
// plus hand-derived transition cases. Expected states and values are
// taken verbatim from the fixtures.

import assert from "node:assert/strict";
import test from "node:test";
import { createController, DEFAULT_DRAFT } from "../public/js/controller.mjs";
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
    if (key === "draft") assert.deepEqual(state.draft, value, "draft");
    else if (key === "error") assert.deepEqual(state.error, value, "error");
    else assert.equal(state[key], value, key);
  }
}

test("the default draft matches the SPEC reset value", () => {
  assert.deepEqual({ ...DEFAULT_DRAFT }, { weight: "", reps: "", unit: "kg" });
  const { controller } = createTestController();
  const state = controller.getState();
  assert.equal(state.state, "empty");
  assert.deepEqual(state.draft, { weight: "", reps: "", unit: "kg" });
  assert.equal(state.resultAvailable, false);
});

test("fixture state-dirty-error: edit revokes the result, rerun reports the error", () => {
  const entry = byId["state-dirty-error"];
  const { controller, scheduler } = createTestController();
  controller.edit(entry.input.initial);
  controller.run();
  scheduler.flush();
  assertCheckpoint(controller.getState(), entry.expected.afterRun);
  controller.edit(entry.input.edit);
  assertCheckpoint(controller.getState(), entry.expected.afterEdit);
  controller.run();
  scheduler.flush();
  assertCheckpoint(controller.getState(), entry.expected.afterRerun);
});

test("fixture state-cancel-late: a late result cannot revive a cancelled run", () => {
  const entry = byId["state-cancel-late"];
  const { controller, scheduler } = createTestController();
  controller.edit(entry.input.draft);
  controller.run();
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
  controller.edit(entry.input.olderDraft);
  controller.run();
  const olderGeneration = controller.getState().generation;
  controller.edit(entry.input.newerDraft);
  controller.run();
  scheduler.flush();
  assertCheckpoint(controller.getState(), entry.expected.afterNewerResult);
  controller.settle(olderGeneration, { ok: true, result: entry.input.olderLateResult });
  assertCheckpoint(controller.getState(), entry.expected.afterOlderLateResult);
});

test("editing during busy terminates the pending work and goes dirty", () => {
  const { controller, scheduler } = createTestController();
  controller.edit({ weight: "100", reps: "5", unit: "kg" });
  controller.run();
  assert.equal(scheduler.size, 1);
  const generation = controller.getState().generation;
  controller.edit({ reps: "6" });
  const state = controller.getState();
  assert.equal(state.state, "dirty");
  assert.equal(state.resultAvailable, false);
  assert.equal(scheduler.size, 0);
  scheduler.flush();
  controller.settle(generation, { ok: true, result: null });
  assert.equal(controller.getState().state, "dirty");
});

test("run during busy is a no-op; cancel outside busy is a no-op", () => {
  const { controller, scheduler } = createTestController();
  controller.cancel();
  assert.equal(controller.getState().state, "empty");
  controller.edit({ weight: "100", reps: "5", unit: "kg" });
  controller.run();
  const generation = controller.getState().generation;
  controller.run();
  assert.equal(controller.getState().generation, generation);
  assert.equal(controller.getState().state, "busy");
  assert.equal(scheduler.size, 1);
  scheduler.flush();
  assert.equal(controller.getState().state, "success");
  controller.cancel();
  assert.equal(controller.getState().state, "success");
});

test("an edit that changes nothing keeps the current result", () => {
  const { controller, scheduler } = createTestController();
  controller.edit({ weight: "100", reps: "5", unit: "kg" });
  controller.run();
  scheduler.flush();
  assert.equal(controller.getState().state, "success");
  controller.edit({ weight: "100", reps: "5", unit: "kg" });
  const state = controller.getState();
  assert.equal(state.state, "success");
  assert.equal(state.resultAvailable, true);
});

test("reset from an error restores the default draft and empty state", () => {
  const { controller, scheduler } = createTestController();
  controller.edit({ weight: "100", reps: "31", unit: "kg" });
  controller.run();
  scheduler.flush();
  assert.equal(controller.getState().state, "error");
  controller.reset();
  const state = controller.getState();
  assert.equal(state.state, "empty");
  assert.deepEqual(state.draft, { weight: "", reps: "", unit: "kg" });
  assert.equal(state.error, null);
  assert.equal(state.resultAvailable, false);
});

test("destroy invalidates the pending generation", () => {
  const { controller, scheduler } = createTestController();
  controller.edit({ weight: "100", reps: "5", unit: "kg" });
  controller.run();
  const generation = controller.getState().generation;
  controller.destroy();
  assert.equal(scheduler.size, 0);
  controller.settle(generation, { ok: true, result: null });
  assert.equal(controller.getState().resultAvailable, false);
});
