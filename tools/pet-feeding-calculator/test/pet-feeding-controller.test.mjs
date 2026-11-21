// Controller tests: the three controller fixtures from fixtures.json
// (driven by a fake worker whose completion is controllable), plus
// sequence-isolation, replacement, cancel, species-switch,
// worker-failure, reset and example cases. Expected states, drafts and
// status strings are taken verbatim from the fixtures; worker replies
// for the fixture runs are produced by the real core, exactly as the
// page's worker handler produces them. There is no persistent storage
// in this tool, so no storage cases exist.

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/pet-feeding.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const controllerCases = Object.fromEntries(
  fixtures.cases.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);

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

function setup(options = {}) {
  const workers = [];
  const controller = createController({
    createWorker: () => {
      const worker = makeFakeWorker();
      workers.push(worker);
      return worker;
    },
    ...options,
  });
  return { controller, workers };
}

// Deliver the reply the real worker would produce for the draft the
// controller posted to this worker.
function deliverCoreResult(worker) {
  const posted = worker.posted[worker.posted.length - 1];
  worker.deliver({ sequence: posted.sequence, draft: posted.draft, outcome: run(posted.draft) });
}

test("fixture state-dirty-error", () => {
  const fixture = controllerCases["state-dirty-error"];
  const { controller, workers } = setup();
  assert.deepEqual(controller.getState().draft, fixture.input.initial);
  controller.run();
  deliverCoreResult(workers[0]);
  const afterRun = controller.getState();
  assert.equal(afterRun.state, fixture.expected.afterRun.state);
  assert.equal(afterRun.reportAvailable, fixture.expected.afterRun.reportAvailable);
  controller.edit(fixture.input.edit);
  const afterEdit = controller.getState();
  assert.equal(afterEdit.state, fixture.expected.afterEdit.state);
  assert.equal(afterEdit.reportAvailable, fixture.expected.afterEdit.reportAvailable);
  assert.equal(afterEdit.result, null);
  controller.run();
  // The rerun fails local validation, so no second worker is created.
  assert.equal(workers.length, 1);
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
  // Deliver the cancelled run's late success: it must not resurrect.
  workers[0].deliver({
    sequence: workers[0].posted[0].sequence,
    draft: workers[0].posted[0].draft,
    outcome: { ok: true, result: fixture.input.lateResult },
  });
  const afterLateResult = controller.getState();
  assert.equal(afterLateResult.state, fixture.expected.afterLateResult.state);
  assert.equal(afterLateResult.reportAvailable, fixture.expected.afterLateResult.reportAvailable);
  assert.equal(afterLateResult.result, null);
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
  assert.equal(workers.length, 1);
  // Edit to the newer draft (terminates the older worker), then run
  // it: local validation fails, so no second worker is created.
  controller.edit(fixture.input.newerDraft);
  controller.run();
  assert.equal(workers.length, 1);
  const afterNewerResult = controller.getState();
  assert.equal(afterNewerResult.state, fixture.expected.afterNewerResult.state);
  assert.equal(afterNewerResult.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(afterNewerResult.error, fixture.expected.afterNewerResult.error);
  // Deliver the older run's late success: it must not replace the error.
  const olderPosted = workers[0].posted[0];
  workers[0].deliver({
    sequence: olderPosted.sequence,
    draft: olderPosted.draft,
    outcome: { ok: true, result: fixture.input.olderLateResult },
  });
  const afterOlderLateResult = controller.getState();
  assert.equal(afterOlderLateResult.state, fixture.expected.afterOlderLateResult.state);
  assert.equal(afterOlderLateResult.reportAvailable, fixture.expected.afterOlderLateResult.reportAvailable);
  assert.deepEqual(afterOlderLateResult.error, fixture.expected.afterOlderLateResult.error);
});

test("a second run press while busy is ignored", () => {
  const { controller, workers } = setup();
  controller.run();
  const sequence = controller.getState().sequence;
  controller.run();
  assert.equal(workers.length, 1);
  assert.equal(controller.getState().sequence, sequence);
  assert.equal(controller.getState().state, "busy");
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
});

test("a reply with a mismatched draft echo is ignored", () => {
  const { controller, workers } = setup();
  controller.run();
  const posted = workers[0].posted[0];
  workers[0].deliver({
    sequence: posted.sequence,
    draft: { ...posted.draft, weightKg: "20" },
    outcome: run({ ...posted.draft, weightKg: "20" }),
  });
  assert.equal(controller.getState().state, "busy");
  assert.equal(controller.getState().result, null);
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
});

test("edit during busy terminates the worker, goes dirty, and drops the late reply", () => {
  const { controller, workers } = setup();
  controller.run();
  assert.equal(controller.getState().state, "busy");
  controller.edit({ weightKg: "20" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.reportAvailable, false);
  assert.equal(workers[0].terminated, true);
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().result, null);
});

test("cancel from a non-busy state is a no-op", () => {
  const { controller } = setup();
  assert.equal(controller.getState().state, "empty");
  controller.cancel();
  assert.equal(controller.getState().state, "empty");
  controller.run();
  controller.cancel();
  assert.equal(controller.getState().state, "cancelled");
  assert.equal(controller.getState().status.zh, "已取消，可重新執行");
  assert.equal(controller.getState().status.en, "Cancelled. You can run again.");
  controller.cancel();
  assert.equal(controller.getState().state, "cancelled");
});

test("a worker error becomes unavailable and keeps the draft; a retry can succeed", () => {
  const { controller, workers } = setup();
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "unavailable");
  assert.equal(state.status.zh, "背景計算不可用");
  assert.equal(state.status.en, "Background calculation unavailable");
  assert.deepEqual(state.draft, DEFAULTS);
  assert.equal(state.reportAvailable, false);
  controller.run();
  assert.equal(controller.getState().state, "busy");
  deliverCoreResult(workers[1]);
  assert.equal(controller.getState().state, "success");
});

test("a createWorker throw becomes unavailable, not a fabricated result", () => {
  const controller = createController({
    createWorker: () => {
      throw new Error("no worker");
    },
  });
  controller.run();
  const state = controller.getState();
  assert.equal(state.state, "unavailable");
  assert.equal(state.result, null);
  assert.equal(state.error, null);
});

test("loadExample fills the example draft and waits for a manual run", () => {
  const { controller, workers } = setup();
  const loaded = controller.loadExample();
  assert.deepEqual(loaded.draft, EXAMPLE);
  assert.equal(loaded.isExample, true);
  assert.equal(loaded.status.zh, "已載入範例");
  controller.run();
  assert.deepEqual(workers[0].posted[0].draft, EXAMPLE);
});

test("reset from success restores defaults byte-for-byte and the empty state", () => {
  const { controller, workers } = setup();
  controller.edit({ weightKg: "20" });
  controller.run();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
  const reset = controller.reset();
  assert.equal(reset.state, "empty");
  assert.deepEqual(reset.draft, DEFAULTS);
  assert.equal(JSON.stringify(reset.draft), JSON.stringify(DEFAULTS));
  assert.equal(reset.reportAvailable, false);
  assert.equal(reset.result, null);
  assert.equal(reset.error, null);
  assert.equal(reset.status.zh, "已重設");
});

test("edit from empty goes dirty; edit from error goes dirty and clears the error", () => {
  const { controller } = setup();
  controller.edit({ weightKg: "20" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.status.zh, "輸入已變更，請重新執行");
  assert.equal(dirty.status.en, "Input changed. Run again.");
  controller.edit({ weightKg: "0.1" });
  controller.run();
  assert.equal(controller.getState().state, "error");
  controller.edit({ weightKg: "20" });
  const dirtyAgain = controller.getState();
  assert.equal(dirtyAgain.state, "dirty");
  assert.equal(dirtyAgain.error, null);
});

test("species switch resets an incompatible stage and keeps a shared one", () => {
  const { controller } = setup();
  // adult-neutered exists for both species: kept.
  controller.edit({ species: "cat" });
  assert.equal(controller.getState().draft.lifeStage, "adult-neutered");
  assert.equal(controller.getState().draft.species, "cat");
  // kitten exists only for cats: switching to dog resets to adult-neutered.
  controller.edit({ lifeStage: "kitten" });
  assert.equal(controller.getState().draft.lifeStage, "kitten");
  controller.edit({ species: "dog" });
  assert.equal(controller.getState().draft.species, "dog");
  assert.equal(controller.getState().draft.lifeStage, "adult-neutered");
  // puppy-under-4-months exists only for dogs: switching to cat resets.
  controller.edit({ lifeStage: "puppy-under-4-months" });
  controller.edit({ species: "cat" });
  assert.equal(controller.getState().draft.lifeStage, "adult-neutered");
});

test("destroy invalidates a pending reply", () => {
  const { controller, workers } = setup();
  controller.run();
  controller.destroy();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "busy");
  assert.equal(controller.getState().result, null);
});
