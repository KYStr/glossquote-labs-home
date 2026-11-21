// Controller tests: the three controller fixtures from fixtures.json
// (driven by a fake worker whose completion is controllable), plus
// sequence-isolation, replacement, worker-failure, cancel, reset and
// example cases. Expected states, drafts and status strings are taken
// verbatim from the fixtures; worker replies for the fixture runs are
// produced by the real core, exactly as the page's worker handler
// produces them. This tool's SPEC has no persistent storage: the draft
// lives only in the page, so there are no storage-restore tests.

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/currency-converter.mjs";
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
  assert.equal(afterRerun.status.zh, "無法換算，請檢查輸入");
});

test("fixture state-cancel-late", () => {
  const fixture = controllerCases["state-cancel-late"];
  const { controller, workers } = setup();
  assert.deepEqual(controller.getState().draft, fixture.input.draft);
  assert.equal(controller.getState().state, "empty");
  controller.run();
  const whilePending = controller.getState();
  assert.equal(whilePending.state, fixture.expected.whilePending.state);
  assert.equal(whilePending.reportAvailable, fixture.expected.whilePending.reportAvailable);
  assert.equal(whilePending.status.zh, "處理中");
  assert.equal(whilePending.status.en, "Working");
  const cancelled = controller.cancel();
  assert.equal(cancelled.state, fixture.expected.afterCancel.state);
  assert.equal(cancelled.reportAvailable, fixture.expected.afterCancel.reportAvailable);
  assert.deepEqual(cancelled.draft, fixture.expected.afterCancel.draft);
  assert.equal(cancelled.status.zh, "已取消，可重新執行");
  assert.equal(workers[0].terminated, true);
  // Deliver the late success reply: it must not resurrect the result.
  const posted = workers[0].posted[0];
  workers[0].deliver({
    sequence: posted.sequence,
    draft: posted.draft,
    outcome: { ok: true, result: fixture.input.lateResult },
  });
  const afterLate = controller.getState();
  assert.equal(afterLate.state, fixture.expected.afterLateResult.state);
  assert.equal(afterLate.reportAvailable, fixture.expected.afterLateResult.reportAvailable);
  assert.equal(afterLate.result, null);
  const afterReset = controller.reset();
  assert.equal(afterReset.state, fixture.expected.afterReset.state);
  assert.equal(afterReset.reportAvailable, fixture.expected.afterReset.reportAvailable);
  assert.deepEqual(afterReset.draft, fixture.expected.afterReset.draft);
  assert.equal(afterReset.status.zh, "已重設");
});

test("fixture state-replace-late", () => {
  const fixture = controllerCases["state-replace-late"];
  const { controller, workers } = setup();
  assert.deepEqual(controller.getState().draft, fixture.input.olderDraft);
  controller.run();
  assert.equal(controller.getState().state, "busy");
  assert.equal(workers.length, 1);
  // Edit to the newer draft, then run it: local validation fails, so
  // no second worker is created.
  controller.edit(fixture.input.newerDraft);
  assert.equal(controller.getState().state, "dirty");
  assert.deepEqual(controller.getState().draft, fixture.input.newerDraft);
  controller.run();
  assert.equal(workers.length, 1);
  const afterNewer = controller.getState();
  assert.equal(afterNewer.state, fixture.expected.afterNewerResult.state);
  assert.equal(afterNewer.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(afterNewer.error, fixture.expected.afterNewerResult.error);
  // Deliver the older worker's late success reply: it must not
  // replace the current error.
  const olderPosted = workers[0].posted[0];
  workers[0].deliver({
    sequence: olderPosted.sequence,
    draft: olderPosted.draft,
    outcome: { ok: true, result: fixture.input.olderLateResult },
  });
  const afterOlder = controller.getState();
  assert.equal(afterOlder.state, fixture.expected.afterOlderLateResult.state);
  assert.equal(afterOlder.reportAvailable, fixture.expected.afterOlderLateResult.reportAvailable);
  assert.deepEqual(afterOlder.error, fixture.expected.afterOlderLateResult.error);
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
    draft: { ...posted.draft, amount: "200" },
    outcome: run({ ...posted.draft, amount: "200" }),
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
  controller.edit({ amount: "200" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.reportAvailable, false);
  assert.equal(dirty.status.zh, "輸入已變更，請重新執行");
  assert.equal(workers[0].terminated, true);
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().result, null);
});

test("cancel when not busy is a no-op", () => {
  const { controller } = setup();
  assert.equal(controller.cancel().state, "empty");
  controller.run();
  controller.cancel();
  assert.equal(controller.getState().state, "cancelled");
  assert.equal(controller.cancel().state, "cancelled");
});

test("a worker error becomes error with WORKER_ERROR and keeps the draft; a retry can succeed", () => {
  const { controller, workers } = setup();
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(state.status.zh, "無法換算，請檢查輸入");
  assert.deepEqual(state.draft, DEFAULTS);
  assert.equal(state.reportAvailable, false);
  controller.run();
  assert.equal(controller.getState().state, "busy");
  deliverCoreResult(workers[1]);
  assert.equal(controller.getState().state, "success");
});

test("a createWorker throw becomes error with WORKER_ERROR, not a fabricated result", () => {
  const controller = createController({
    createWorker: () => {
      throw new Error("no worker");
    },
  });
  controller.run();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.equal(state.result, null);
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
});

test("loadExample fills the example draft and waits for a manual run", () => {
  const { controller, workers } = setup();
  const loaded = controller.loadExample();
  assert.deepEqual(loaded.draft, EXAMPLE);
  assert.equal(loaded.isExample, true);
  assert.equal(loaded.state, "empty");
  assert.equal(loaded.status.zh, "已載入範例");
  controller.run();
  assert.deepEqual(workers[0].posted[0].draft, EXAMPLE);
});

test("loadExample from success goes dirty and clears the result", () => {
  const { controller, workers } = setup();
  controller.run();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
  const loaded = controller.loadExample();
  assert.equal(loaded.state, "dirty");
  assert.equal(loaded.result, null);
  assert.equal(loaded.reportAvailable, false);
});

test("reset from success restores defaults byte-for-byte and the empty state", () => {
  const { controller, workers } = setup();
  controller.edit({ amount: "200" });
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

test("edit from empty stays empty; edit from error goes dirty and clears the error", () => {
  const { controller } = setup();
  controller.edit({ amount: "200" });
  assert.equal(controller.getState().state, "empty");
  controller.edit({ rate: "0" });
  controller.run();
  assert.equal(controller.getState().state, "error");
  assert.deepEqual(controller.getState().error, { code: "RANGE", field: "rate", row: null });
  controller.edit({ rate: "31.5" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.error, null);
});

test("destroy invalidates a pending reply", () => {
  const { controller, workers } = setup();
  controller.run();
  controller.destroy();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "busy");
  assert.equal(controller.getState().result, null);
});
