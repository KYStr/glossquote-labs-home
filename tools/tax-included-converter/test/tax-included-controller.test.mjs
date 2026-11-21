// Controller tests: the three controller fixtures from fixtures.json
// (driven by a fake worker whose completion is controllable), plus
// sequence-isolation, replacement, worker-failure, cancel, reset,
// example and draft-persistence cases. Expected states, drafts and
// errors are taken verbatim from the fixtures; worker replies for the
// fixture runs are produced by the real core, exactly as the page's
// worker handler produces them.

import assert from "node:assert/strict";
import test from "node:test";
import { createController, WORKER_ERROR } from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/tax-included.mjs";
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

function storageWith(draft) {
  let stored = draft === undefined ? "" : JSON.stringify(draft);
  return {
    getItem: () => stored,
    setItem: (_key, value) => {
      stored = value;
    },
    peek: () => stored,
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
  const storage = storageWith(fixture.input.initial);
  const { controller, workers } = setup({ storage });
  assert.deepEqual(controller.getState().draft, fixture.input.initial);
  controller.run();
  deliverCoreResult(workers[0]);
  const afterRun = controller.getState();
  assert.equal(afterRun.state, fixture.expected.afterRun.state);
  assert.equal(afterRun.reportAvailable, fixture.expected.afterRun.reportAvailable);
  assert.deepEqual(afterRun.result, {
    basis: "gross",
    gross: 9999,
    mode: "single",
    net: 9523,
    ratePercent: "5",
    tax: 476,
  });
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
  const storage = storageWith(fixture.input.draft);
  const { controller, workers } = setup({ storage });
  controller.run();
  const whilePending = controller.getState();
  assert.equal(whilePending.state, fixture.expected.whilePending.state);
  assert.equal(whilePending.reportAvailable, fixture.expected.whilePending.reportAvailable);
  assert.equal(workers[0].terminated, false);
  controller.cancel();
  const afterCancel = controller.getState();
  assert.equal(afterCancel.state, fixture.expected.afterCancel.state);
  assert.deepEqual(afterCancel.draft, fixture.expected.afterCancel.draft);
  assert.equal(afterCancel.reportAvailable, fixture.expected.afterCancel.reportAvailable);
  assert.equal(workers[0].terminated, true);
  // Deliver the late success: it must be ignored entirely.
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
  controller.reset();
  const afterReset = controller.getState();
  assert.equal(afterReset.state, fixture.expected.afterReset.state);
  assert.deepEqual(afterReset.draft, fixture.expected.afterReset.draft);
  assert.equal(afterReset.reportAvailable, fixture.expected.afterReset.reportAvailable);
});

test("fixture state-replace-late", () => {
  const fixture = controllerCases["state-replace-late"];
  const storage = storageWith(fixture.input.olderDraft);
  const { controller, workers } = setup({ storage });
  controller.run();
  assert.equal(workers.length, 1);
  controller.edit(fixture.input.newerDraft);
  assert.equal(controller.getState().state, "dirty");
  assert.equal(workers[0].terminated, true);
  controller.run();
  const afterNewerResult = controller.getState();
  assert.deepEqual(afterNewerResult.error, fixture.expected.afterNewerResult.error);
  assert.equal(afterNewerResult.state, fixture.expected.afterNewerResult.state);
  assert.equal(afterNewerResult.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);
  // The older worker's late success must not replace the current error.
  const firstPosted = workers[0].posted[0];
  workers[0].deliver({
    sequence: firstPosted.sequence,
    draft: firstPosted.draft,
    outcome: { ok: true, result: fixture.input.olderLateResult },
  });
  const afterOlderLateResult = controller.getState();
  assert.deepEqual(afterOlderLateResult.error, fixture.expected.afterOlderLateResult.error);
  assert.equal(afterOlderLateResult.state, fixture.expected.afterOlderLateResult.state);
  assert.equal(
    afterOlderLateResult.reportAvailable,
    fixture.expected.afterOlderLateResult.reportAvailable,
  );
});

test("run while busy is ignored; edit during busy terminates and goes dirty", () => {
  const { controller, workers } = setup();
  controller.run();
  assert.equal(controller.getState().state, "busy");
  controller.run();
  assert.equal(workers.length, 1);
  assert.equal(controller.getState().state, "busy");
  controller.edit({ amount: "20000" });
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().result, null);
  assert.equal(workers[0].terminated, true);
  controller.run();
  deliverCoreResult(workers[1]);
  assert.equal(controller.getState().state, "success");
  assert.equal(controller.getState().result.net, 20000);
});

test("late reply with a wrong sequence or a stale draft is dropped", () => {
  const { controller, workers } = setup();
  controller.run();
  const posted = workers[0].posted[0];
  workers[0].deliver({
    sequence: posted.sequence + 9,
    draft: posted.draft,
    outcome: run(posted.draft),
  });
  assert.equal(controller.getState().state, "busy");
  workers[0].deliver({
    sequence: posted.sequence,
    draft: { ...posted.draft, amount: "1" },
    outcome: run({ ...posted.draft, amount: "1" }),
  });
  assert.equal(controller.getState().state, "busy");
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
});

test("worker construction failure, worker error event and malformed reply go to error with WORKER_ERROR", () => {
  const throwing = setup({ createWorker: () => { throw new Error("no worker"); } });
  throwing.controller.run();
  assert.equal(throwing.controller.getState().state, "error");
  assert.deepEqual(throwing.controller.getState().error, WORKER_ERROR);

  const failing = setup();
  failing.controller.run();
  failing.workers[0].fail();
  assert.equal(failing.controller.getState().state, "error");
  assert.deepEqual(failing.controller.getState().error, WORKER_ERROR);

  const malformed = setup();
  malformed.controller.run();
  const posted = malformed.workers[0].posted[0];
  malformed.workers[0].deliver({ sequence: posted.sequence, draft: posted.draft, outcome: null });
  assert.equal(malformed.controller.getState().state, "error");
  assert.deepEqual(malformed.controller.getState().error, WORKER_ERROR);
});

test("worker error reply carries the core error", () => {
  const { controller, workers } = setup();
  controller.run();
  const posted = workers[0].posted[0];
  workers[0].deliver({
    sequence: posted.sequence,
    draft: posted.draft,
    outcome: { ok: false, error: { code: "INTERNAL", field: null, row: null } },
  });
  assert.equal(controller.getState().state, "error");
  assert.deepEqual(controller.getState().error, { code: "INTERNAL", field: null, row: null });
});

test("cancel is a no-op outside busy; cancel keeps the draft and a later run works", () => {
  const { controller, workers } = setup();
  controller.cancel();
  assert.equal(controller.getState().state, "empty");
  controller.run();
  controller.cancel();
  assert.equal(controller.getState().state, "cancelled");
  assert.deepEqual(controller.getState().draft, DEFAULTS);
  controller.run();
  deliverCoreResult(workers[1]);
  assert.equal(controller.getState().state, "success");
});

test("loadExample fills the net-basic draft and waits for a manual run", () => {
  const { controller, workers } = setup();
  controller.loadExample();
  const state = controller.getState();
  assert.deepEqual(state.draft, EXAMPLE);
  assert.equal(state.isExample, true);
  assert.equal(state.state, "empty");
  assert.equal(state.status.zh, "已載入範例");
  controller.run();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
  assert.deepEqual(controller.getState().result, {
    basis: "net",
    gross: 105000,
    mode: "single",
    net: 100000,
    ratePercent: "5",
    tax: 5000,
  });
});

test("reset restores the defaults and the empty state, and focuses nothing by itself", () => {
  const { controller, workers } = setup();
  controller.edit({ amount: "500", ratePercent: "10" });
  controller.run();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
  controller.reset();
  const state = controller.getState();
  assert.equal(state.state, "empty");
  assert.deepEqual(state.draft, DEFAULTS);
  assert.equal(state.result, null);
  assert.equal(state.reportAvailable, false);
  assert.equal(state.status.zh, "已重設");
});

test("stored draft restore: a valid draft is restored, a corrupt one is discarded", () => {
  const good = storageWith({ ...DEFAULTS, amount: "4242" });
  const restored = setup({ storage: good });
  assert.equal(restored.controller.getState().draft.amount, "4242");
  const bad = { getItem: () => "{not json", setItem: () => {} };
  const discarded = setup({ storage: bad });
  assert.deepEqual(discarded.controller.getState().draft, DEFAULTS);
  const wrongShape = storageWith({ ...DEFAULTS, amount: 42 });
  const discardedShape = setup({ storage: wrongShape });
  assert.deepEqual(discardedShape.controller.getState().draft, DEFAULTS);
});

test("edit from empty stays empty; edit after success goes dirty and clears the report", () => {
  const { controller, workers } = setup();
  controller.edit({ amount: "10001" });
  assert.equal(controller.getState().state, "empty");
  controller.run();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
  assert.equal(controller.getState().reportAvailable, true);
  controller.edit({ amount: "10002" });
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().reportAvailable, false);
  assert.equal(controller.getState().result, null);
});
