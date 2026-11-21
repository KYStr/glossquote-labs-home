// Controller tests: the three controller fixtures from fixtures.json
// (driven by a fake worker whose completion is controllable), plus
// sequence-isolation, replacement, worker-failure, cancel, reset and
// example cases. Expected states, drafts and errors are taken verbatim
// from the fixtures; worker replies for the fixture runs are produced
// by the real core, exactly as the page's worker handler produces them.

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/dice-roller.mjs";
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
  controller.edit(fixture.input.initial);
  controller.run();
  deliverCoreResult(workers[0]);
  const afterRun = controller.getState();
  assert.equal(afterRun.state, fixture.expected.afterRun.state);
  assert.equal(afterRun.reportAvailable, fixture.expected.afterRun.reportAvailable);
  assert.deepEqual(afterRun.result, run(fixture.input.initial).result);
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
  // Deliver the late success: it must not resurrect the result.
  const posted = workers[0].posted[0];
  workers[0].deliver({
    sequence: posted.sequence,
    draft: posted.draft,
    outcome: { ok: true, result: fixture.input.lateResult },
  });
  const afterLateResult = controller.getState();
  assert.equal(afterLateResult.state, fixture.expected.afterLateResult.state);
  assert.equal(afterLateResult.reportAvailable, fixture.expected.afterLateResult.reportAvailable);
  assert.equal(afterLateResult.result, null);
  const afterReset = controller.reset();
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
  // Edit to the newer draft, then run it: local validation fails, so
  // no second worker is created.
  controller.edit(fixture.input.newerDraft);
  assert.deepEqual(controller.getState().draft, fixture.input.newerDraft);
  controller.run();
  assert.equal(workers.length, 1);
  const afterNewerResult = controller.getState();
  assert.equal(afterNewerResult.state, fixture.expected.afterNewerResult.state);
  assert.equal(afterNewerResult.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(afterNewerResult.error, fixture.expected.afterNewerResult.error);
  // Deliver the older work's late success: it must not replace the error.
  const olderPosted = workers[0].posted[0];
  workers[0].deliver({
    sequence: olderPosted.sequence,
    draft: olderPosted.draft,
    outcome: { ok: true, result: fixture.input.olderLateResult },
  });
  const afterOlderLateResult = controller.getState();
  assert.equal(afterOlderLateResult.state, fixture.expected.afterOlderLateResult.state);
  assert.equal(
    afterOlderLateResult.reportAvailable,
    fixture.expected.afterOlderLateResult.reportAvailable,
  );
  assert.deepEqual(afterOlderLateResult.error, fixture.expected.afterOlderLateResult.error);
});

test("a second run press while busy is ignored", () => {
  const { controller, workers } = setup();
  controller.edit({ seed: "42" });
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
  controller.edit({ seed: "42" });
  controller.run();
  const posted = workers[0].posted[0];
  workers[0].deliver({
    sequence: posted.sequence,
    draft: { ...posted.draft, seed: "7" },
    outcome: run({ ...posted.draft, seed: "7" }),
  });
  assert.equal(controller.getState().state, "busy");
  assert.equal(controller.getState().result, null);
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
});

test("edit during busy terminates the worker, goes dirty, and drops the late reply", () => {
  const { controller, workers } = setup();
  controller.edit({ seed: "42" });
  controller.run();
  assert.equal(controller.getState().state, "busy");
  controller.edit({ seed: "7" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.reportAvailable, false);
  assert.equal(workers[0].terminated, true);
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().result, null);
});

test("cancel during busy keeps the draft and drops the late reply; cancel otherwise is a no-op", () => {
  const { controller, workers } = setup();
  assert.equal(controller.cancel().state, "empty");
  controller.edit({ seed: "42" });
  controller.run();
  const cancelled = controller.cancel();
  assert.equal(cancelled.state, "cancelled");
  assert.deepEqual(cancelled.draft, { notation: "2d6", seed: "42" });
  assert.equal(cancelled.status["zh-Hant"], "已取消，可重新執行");
  assert.equal(cancelled.status.en, "Cancelled. You can run again.");
  assert.equal(workers[0].terminated, true);
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "cancelled");
  assert.equal(controller.getState().result, null);
  // A fresh run after cancel succeeds.
  controller.run();
  assert.equal(controller.getState().state, "busy");
  deliverCoreResult(workers[1]);
  assert.equal(controller.getState().state, "success");
});

test("a worker error becomes an error with WORKER_ERROR and keeps the draft; a retry can succeed", () => {
  const { controller, workers } = setup();
  controller.edit({ seed: "42" });
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.deepEqual(state.draft, { notation: "2d6", seed: "42" });
  assert.equal(state.reportAvailable, false);
  controller.run();
  assert.equal(controller.getState().state, "busy");
  deliverCoreResult(workers[1]);
  assert.equal(controller.getState().state, "success");
});

test("a createWorker throw becomes an error, not a fabricated result", () => {
  const controller = createController({
    createWorker: () => {
      throw new Error("no worker");
    },
  });
  controller.edit({ seed: "42" });
  controller.run();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(state.result, null);
});

test("loadExample fills the example draft and waits for a manual run", () => {
  const { controller, workers } = setup();
  const loaded = controller.loadExample();
  assert.deepEqual(loaded.draft, EXAMPLE);
  assert.equal(loaded.isExample, true);
  assert.equal(loaded.state, "empty");
  assert.equal(loaded.status["zh-Hant"], "已載入範例");
  controller.run();
  assert.deepEqual(workers[0].posted[0].draft, EXAMPLE);
});

test("reset from success restores defaults byte-for-byte and the empty state", () => {
  const { controller, workers } = setup();
  controller.edit({ seed: "42" });
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
  assert.equal(reset.status["zh-Hant"], "已重設");
});

test("edit from empty stays empty; edit from error goes dirty and clears the error", () => {
  const { controller } = setup();
  controller.edit({ notation: "3d8" });
  assert.equal(controller.getState().state, "empty");
  controller.edit({ notation: "2d" });
  controller.run();
  assert.equal(controller.getState().state, "error");
  controller.edit({ notation: "2d6" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.error, null);
});

test("destroy invalidates a pending reply", () => {
  const { controller, workers } = setup();
  controller.edit({ seed: "42" });
  controller.run();
  controller.destroy();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "busy");
  assert.equal(controller.getState().result, null);
});
