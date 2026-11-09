// Controller tests: the 3 controller fixtures from fixtures.json driven
// by a fake scheduler whose completion timing the test controls, plus
// hand-derived transition cases. Expected states and values are taken
// verbatim from the fixtures; checkpoints assert the state, the draft
// where the fixture pins it, the error where pinned, and both
// copyAvailable and downloadAvailable (this tool's success-only
// artifacts, per the SPEC).

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULT_DRAFT } from "../public/js/core/lottery.mjs";
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

test("fixture state-dirty-error: edit revokes the result, copy and download", () => {
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
  const afterReset = controller.getState();
  assertCheckpoint(afterReset, entry.expected.afterReset);
  assert.deepEqual(afterReset.draft, DEFAULT_DRAFT);
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

test("initial state is empty with the SPEC default draft", () => {
  const { controller } = createTestController();
  const state = controller.getState();
  assert.equal(state.state, "empty");
  assert.deepEqual(state.draft, DEFAULT_DRAFT);
  assert.equal(state.resultAvailable, false);
  assert.equal(state.copyAvailable, false);
  assert.equal(state.downloadAvailable, false);
  assert.equal(state.result, null);
  assert.equal(state.error, null);
});

test("cancel outside busy is a no-op; a successful run exposes copy and download", () => {
  const { controller, scheduler } = createTestController();
  controller.cancel();
  assert.equal(controller.getState().state, "empty");
  controller.edit({ game: "daily539", seed: "7", setCount: "1", exclude: "" });
  controller.run();
  scheduler.flush();
  const state = controller.getState();
  assert.equal(state.state, "success");
  assert.equal(state.copyAvailable, true);
  assert.equal(state.downloadAvailable, true);
  assert.deepEqual(state.result.sets[0].zone1, [1, 4, 23, 29, 39]);
  controller.cancel();
  assert.equal(controller.getState().state, "success");
});

test("editing from the pristine empty state stays empty; editing a cancelled run dirties it", () => {
  const { controller, scheduler } = createTestController();
  controller.edit({ game: "lotto649", seed: "1", setCount: "1", exclude: "" });
  assert.equal(controller.getState().state, "empty");
  controller.run();
  controller.cancel();
  assert.equal(controller.getState().state, "cancelled");
  controller.edit({ game: "lotto649", seed: "2", setCount: "1", exclude: "" });
  const state = controller.getState();
  assert.equal(state.state, "dirty");
  assert.equal(state.result, null);
  assert.equal(scheduler.size, 0);
});

test("the draft handed in is copied: later mutation does not leak into the controller", () => {
  const { controller, scheduler } = createTestController();
  const draft = { game: "daily539", seed: "7", setCount: "1", exclude: "" };
  controller.edit(draft);
  draft.seed = "8";
  controller.run();
  scheduler.flush();
  assert.equal(controller.getState().result.seed, 7);
});
