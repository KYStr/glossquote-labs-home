// Controller tests for the Baking Pan Converter. The three SPEC
// controller fixtures are driven verbatim through a fake Worker whose
// completion is controllable, with the pinned sequences and status
// strings; extra tests cover the cancel path, a second run while busy,
// load-example, reset, and worker-construction failure. Expected
// values come from fixtures.json, never from the implementation.

import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULTS } from "../public/js/core/baking-pan-converter.mjs";
import { createController } from "../public/js/controller.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const controllerCases = fixtures.cases.filter((entry) => entry.kind === "controller");

class FakeWorker {
  constructor() {
    this.posted = [];
    this.terminated = false;
    this.onmessage = null;
    this.onerror = null;
  }

  postMessage(message) {
    this.posted.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  deliver(outcome) {
    if (typeof this.onmessage === "function") {
      const last = this.posted[this.posted.length - 1];
      this.onmessage({ data: { sequence: last.sequence, draft: last.draft, outcome } });
    }
  }

  deliverLate(sequence, draft, outcome) {
    if (typeof this.onmessage === "function") {
      this.onmessage({ data: { sequence, draft, outcome } });
    }
  }

  fail() {
    if (typeof this.onerror === "function") this.onerror(new Error("worker failed"));
  }
}

function setup() {
  const workers = [];
  const controller = createController({
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    onChange: () => {},
  });
  return { controller, workers };
}

test("fixture state-dirty-error: success, then an edit invalidates, rerun errors", () => {
  const entry = controllerCases.find((item) => item.id === "state-dirty-error");
  const { controller, workers } = setup();
  controller.edit({ ...entry.input.initial });
  const whilePending = controller.run();
  assert.equal(whilePending.state, "busy");
  assert.equal(whilePending.reportAvailable, false);
  workers[0].deliver({ ok: true, result: fixtures.cases[0].expected.result });
  const afterRun = controller.getState();
  assert.equal(afterRun.state, entry.expected.afterRun.state);
  assert.equal(afterRun.reportAvailable, entry.expected.afterRun.reportAvailable);
  assert.deepEqual(afterRun.result, fixtures.cases[0].expected.result);

  controller.edit({ ...entry.input.edit });
  const afterEdit = controller.getState();
  assert.equal(afterEdit.state, entry.expected.afterEdit.state);
  assert.equal(afterEdit.reportAvailable, entry.expected.afterEdit.reportAvailable);

  const workerCountBeforeRerun = workers.length;
  const afterRerun = controller.run();
  assert.equal(afterRerun.state, entry.expected.afterRerun.state);
  assert.equal(afterRerun.reportAvailable, entry.expected.afterRerun.reportAvailable);
  assert.deepEqual(afterRerun.error, entry.expected.afterRerun.error);
  // A locally-failed run never creates a second worker.
  assert.equal(workers.length, workerCountBeforeRerun);
});

test("fixture state-cancel-late: cancel keeps the draft, a late reply cannot revive it, reset restores defaults", () => {
  const entry = controllerCases.find((item) => item.id === "state-cancel-late");
  const { controller, workers } = setup();
  controller.edit({ ...entry.input.draft });
  const whilePending = controller.run();
  assert.equal(whilePending.state, entry.expected.whilePending.state);
  assert.equal(whilePending.reportAvailable, entry.expected.whilePending.reportAvailable);

  const afterCancel = controller.cancel();
  assert.equal(afterCancel.state, entry.expected.afterCancel.state);
  assert.equal(afterCancel.reportAvailable, entry.expected.afterCancel.reportAvailable);
  assert.deepEqual(afterCancel.draft, entry.expected.afterCancel.draft);
  assert.equal(workers[0].terminated, true);

  workers[0].deliverLate(2, entry.input.draft, { ok: true, result: entry.input.lateResult });
  const afterLateResult = controller.getState();
  assert.equal(afterLateResult.state, entry.expected.afterLateResult.state);
  assert.equal(afterLateResult.reportAvailable, entry.expected.afterLateResult.reportAvailable);

  const afterReset = controller.reset();
  assert.equal(afterReset.state, entry.expected.afterReset.state);
  assert.equal(afterReset.reportAvailable, entry.expected.afterReset.reportAvailable);
  assert.deepEqual(afterReset.draft, entry.expected.afterReset.draft);
  assert.deepEqual(afterReset.draft, DEFAULTS);
});

test("fixture state-replace-late: a newer local error survives an older late success", () => {
  const entry = controllerCases.find((item) => item.id === "state-replace-late");
  const { controller, workers } = setup();
  controller.edit({ ...entry.input.olderDraft });
  controller.run();
  const olderWorker = workers[0];
  assert.equal(controller.getState().state, "busy");

  controller.edit({ ...entry.input.newerDraft });
  assert.equal(controller.getState().state, "dirty");
  assert.equal(olderWorker.terminated, true);

  const afterNewerResult = controller.run();
  assert.equal(afterNewerResult.state, entry.expected.afterNewerResult.state);
  assert.equal(afterNewerResult.reportAvailable, entry.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(afterNewerResult.error, entry.expected.afterNewerResult.error);

  olderWorker.deliverLate(2, entry.input.olderDraft, {
    ok: true,
    result: entry.input.olderLateResult,
  });
  const afterOlderLateResult = controller.getState();
  assert.equal(afterOlderLateResult.state, entry.expected.afterOlderLateResult.state);
  assert.equal(
    afterOlderLateResult.reportAvailable,
    entry.expected.afterOlderLateResult.reportAvailable,
  );
  assert.deepEqual(afterOlderLateResult.error, entry.expected.afterOlderLateResult.error);
});

test("a second run while busy is ignored and does not create a worker", () => {
  const { controller, workers } = setup();
  controller.edit({ quantity: "500", quantityUnit: "g" });
  controller.run();
  assert.equal(workers.length, 1);
  const again = controller.run();
  assert.equal(again.state, "busy");
  assert.equal(workers.length, 1);
});

test("edit during busy terminates the worker and goes dirty", () => {
  const { controller, workers } = setup();
  controller.edit({ quantity: "500", quantityUnit: "g" });
  controller.run();
  const edited = controller.edit({ quantity: "600" });
  assert.equal(edited.state, "dirty");
  assert.equal(edited.reportAvailable, false);
  assert.equal(workers[0].terminated, true);
});

test("load example fills the first fixture input and reset restores defaults byte-for-byte", () => {
  const { controller } = setup();
  const loaded = controller.loadExample();
  assert.equal(loaded.isExample, true);
  assert.deepEqual(loaded.draft, fixtures.cases[0].input);
  const reset = controller.reset();
  assert.equal(reset.state, "empty");
  assert.equal(JSON.stringify(reset.draft), JSON.stringify(DEFAULTS));
  assert.equal(reset.isExample, false);
  assert.equal(reset.reportAvailable, false);
});

test("cancel outside busy is a no-op", () => {
  const { controller } = setup();
  assert.equal(controller.cancel().state, "empty");
  controller.edit({ quantity: "500", quantityUnit: "g" });
  controller.run();
  controller.cancel();
  assert.equal(controller.cancel().state, "cancelled");
});

test("worker construction failure goes to error with WORKER_ERROR, never a fabricated result", () => {
  const controller = createController({
    createWorker: () => {
      throw new Error("no worker");
    },
    onChange: () => {},
  });
  controller.edit({ quantity: "500", quantityUnit: "g" });
  const state = controller.run();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(state.result, null);
  assert.equal(state.reportAvailable, false);
});

test("worker error event goes to error with WORKER_ERROR", () => {
  const { controller, workers } = setup();
  controller.edit({ quantity: "500", quantityUnit: "g" });
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(state.reportAvailable, false);
});
