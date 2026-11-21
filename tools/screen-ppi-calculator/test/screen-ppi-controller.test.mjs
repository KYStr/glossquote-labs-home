// Controller tests: the three controller fixtures from fixtures.json
// (driven by a fake worker whose completion is controllable), plus
// sequence-isolation, replacement, worker-failure, cancel, reset and
// example cases. Expected states, drafts and report availability are
// taken verbatim from the fixtures; worker replies for the fixture
// runs are produced by the real core, exactly as the page's worker
// handler produces them.

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/screen-ppi.mjs";
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
  assert.deepEqual(controller.getState().draft, fixture.input.draft);
  controller.run();
  const whilePending = controller.getState();
  assert.equal(whilePending.state, fixture.expected.whilePending.state);
  assert.equal(whilePending.reportAvailable, fixture.expected.whilePending.reportAvailable);
  assert.equal(workers[0].terminated, false);
  controller.cancel();
  const afterCancel = controller.getState();
  assert.equal(afterCancel.state, fixture.expected.afterCancel.state);
  assert.equal(afterCancel.reportAvailable, fixture.expected.afterCancel.reportAvailable);
  assert.deepEqual(afterCancel.draft, fixture.expected.afterCancel.draft);
  assert.equal(workers[0].terminated, true);
  // Deliver the late result: it must not resurrect.
  const firstPosted = workers[0].posted[0];
  workers[0].deliver({
    sequence: firstPosted.sequence,
    draft: firstPosted.draft,
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
  assert.equal(controller.getState().state, "busy");
  // Edit to the newer draft, then run it: local validation fails, so
  // no second worker is created and the sequence is untouched by it.
  controller.edit(fixture.input.newerDraft);
  assert.deepEqual(controller.getState().draft, fixture.input.newerDraft);
  controller.run();
  assert.equal(workers.length, 1);
  const afterNewerResult = controller.getState();
  assert.equal(afterNewerResult.state, fixture.expected.afterNewerResult.state);
  assert.equal(afterNewerResult.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(afterNewerResult.error, fixture.expected.afterNewerResult.error);
  // Deliver the older run's late success reply: it must not replace
  // the current error.
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
    draft: { ...posted.draft, widthPx: "1920" },
    outcome: run({ ...posted.draft, widthPx: "1920" }),
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
  controller.edit({ widthPx: "1920" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.reportAvailable, false);
  assert.equal(workers[0].terminated, true);
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().result, null);
});

test("a worker error becomes an error with WORKER_ERROR and keeps the draft; a retry can succeed", () => {
  const { controller, workers } = setup();
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(state.status.zh, "無法計算，請檢查輸入");
  assert.equal(state.status.en, "Cannot calculate — check input");
  assert.deepEqual(state.draft, DEFAULTS);
  assert.equal(state.reportAvailable, false);
  controller.run();
  assert.equal(controller.getState().state, "busy");
  deliverCoreResult(workers[1]);
  assert.equal(controller.getState().state, "success");
});

test("a createWorker throw becomes an error with WORKER_ERROR, not a fabricated result", () => {
  const controller = createController({
    createWorker: () => {
      throw new Error("no worker");
    },
  });
  controller.run();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(state.result, null);
});

test("cancel outside busy is a no-op", () => {
  const { controller } = setup();
  assert.equal(controller.getState().state, "empty");
  controller.cancel();
  assert.equal(controller.getState().state, "empty");
  assert.deepEqual(controller.getState().draft, DEFAULTS);
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
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
  assert.deepEqual(controller.getState().result, run(EXAMPLE).result);
});

test("reset from success restores defaults byte-for-byte and the empty state", () => {
  const { controller, workers } = setup();
  controller.edit({ widthPx: "1920" });
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
  controller.edit({ widthPx: "1920" });
  assert.equal(controller.getState().state, "empty");
  controller.edit({ widthPx: "16385" });
  controller.run();
  assert.equal(controller.getState().state, "error");
  controller.edit({ widthPx: "1920" });
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

test("status strings follow the SPEC wording", () => {
  const { controller, workers } = setup();
  assert.equal(controller.getState().status.zh, "請輸入或載入範例");
  controller.run();
  assert.equal(controller.getState().status.zh, "處理中");
  assert.equal(controller.getState().status.en, "Working");
  controller.cancel();
  assert.equal(controller.getState().status.zh, "已取消，可重新執行");
  assert.equal(controller.getState().status.en, "Cancelled. You can run again.");
  controller.edit({ widthPx: "1920" });
  assert.equal(controller.getState().status.zh, "輸入已變更，請重新執行");
  assert.equal(controller.getState().status.en, "Input changed. Run again.");
  controller.run();
  deliverCoreResult(workers[1]);
  assert.equal(controller.getState().status.zh, "計算完成");
});
