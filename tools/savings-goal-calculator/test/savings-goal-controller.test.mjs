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
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/savings-goal.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const controllerCases = Object.fromEntries(
  fixtures.cases
    .filter((entry) => entry.kind === "controller")
    .map((entry) => [entry.id, entry]),
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

// Deliver the reply the real worker would produce for the draft the
// controller posted to this worker.
function deliverCoreResult(worker) {
  const posted = worker.posted[worker.posted.length - 1];
  worker.deliver({ sequence: posted.sequence, draft: posted.draft, outcome: run(posted.draft) });
}

test("fixture state-dirty-error", () => {
  const fixture = controllerCases["state-dirty-error"];
  const { controller, workers } = setup();
  controller.edit({ ...fixture.input.initial });
  controller.run();
  deliverCoreResult(workers[0]);
  const afterRun = controller.getState();
  assert.equal(afterRun.state, fixture.expected.afterRun.state);
  assert.equal(afterRun.reportAvailable, fixture.expected.afterRun.reportAvailable);
  controller.edit({ ...fixture.input.edit });
  const afterEdit = controller.getState();
  assert.equal(afterEdit.state, fixture.expected.afterEdit.state);
  assert.equal(afterEdit.reportAvailable, fixture.expected.afterEdit.reportAvailable);
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
  controller.edit({ ...fixture.input.draft });
  controller.run();
  const whilePending = controller.getState();
  assert.equal(whilePending.state, fixture.expected.whilePending.state);
  assert.equal(whilePending.reportAvailable, fixture.expected.whilePending.reportAvailable);
  const cancelled = controller.cancel();
  assert.equal(cancelled.state, fixture.expected.afterCancel.state);
  assert.equal(cancelled.reportAvailable, fixture.expected.afterCancel.reportAvailable);
  assert.deepEqual(cancelled.draft, fixture.expected.afterCancel.draft);
  // Deliver the late success reply: it must be ignored entirely.
  const posted = workers[0].posted[0];
  workers[0].deliver({
    sequence: posted.sequence,
    draft: posted.draft,
    outcome: { ok: true, result: fixture.input.lateResult },
  });
  const afterLate = controller.getState();
  assert.equal(afterLate.state, fixture.expected.afterLateResult.state);
  assert.equal(afterLate.reportAvailable, fixture.expected.afterLateResult.reportAvailable);
  const reset = controller.reset();
  assert.equal(reset.state, fixture.expected.afterReset.state);
  assert.equal(reset.reportAvailable, fixture.expected.afterReset.reportAvailable);
  assert.deepEqual(reset.draft, fixture.expected.afterReset.draft);
});

test("fixture state-replace-late", () => {
  const fixture = controllerCases["state-replace-late"];
  const { controller, workers } = setup();
  controller.edit({ ...fixture.input.olderDraft });
  controller.run();
  assert.equal(workers.length, 1);
  // Edit to the newer draft, then run it: local validation fails, so
  // no second worker is created.
  controller.edit({ ...fixture.input.newerDraft });
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
    draft: { ...posted.draft, targetAmount: "200000" },
    outcome: run({ ...posted.draft, targetAmount: "200000" }),
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
  controller.edit({ targetAmount: "200000" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.reportAvailable, false);
  assert.equal(workers[0].terminated, true);
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().result, null);
});

test("cancel from a non-busy state is a no-op", () => {
  const { controller, workers } = setup();
  assert.equal(controller.cancel().state, "empty");
  controller.run();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
  assert.equal(controller.cancel().state, "success");
  assert.notEqual(controller.getState().result, null);
});

test("a worker error becomes an error with WORKER_ERROR and keeps the draft; a retry can succeed", () => {
  const { controller, workers } = setup();
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(state.status.zh, "無法計算，請檢查輸入");
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
  assert.deepEqual(controller.getState().result, {
    finalBalance: "100000.00",
    mode: "payment",
    monthlyPayment: "7500.00",
    months: 12,
    status: "ok",
    totalDeposits: "90000.00",
    totalInterest: "0.00",
  });
});

test("reset from success restores defaults byte-for-byte and the empty state", () => {
  const { controller, workers } = setup();
  controller.edit({ targetAmount: "200000" });
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
  controller.edit({ targetAmount: "200000" });
  assert.equal(controller.getState().state, "empty");
  controller.edit({ months: "0" });
  controller.run();
  assert.equal(controller.getState().state, "error");
  controller.edit({ months: "12" });
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

test("a successful run exposes the input snapshot for the report", () => {
  const { controller, workers } = setup();
  controller.run();
  deliverCoreResult(workers[0]);
  const state = controller.getState();
  assert.deepEqual(state.input, DEFAULTS);
  assert.equal(state.reportAvailable, true);
});
