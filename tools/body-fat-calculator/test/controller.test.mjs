// Controller tests: the three controller fixtures from fixtures.json
// (vendored verbatim from spec candidate
// e3be9220520a92b9b7b0de37c03bb0f2f26de76c), driven by a fake worker whose
// completion is controllable, plus generation-isolation, sex-switch, and
// worker-failure cases. Expected states and drafts are taken verbatim from
// the fixtures.

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/bodyfat.mjs";
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

// Deliver the reply the real worker would produce for a posted message:
// the pure core's verdict on the snapshot, tagged with its generation.
function deliverCoreResult(worker) {
  const message = worker.posted[worker.posted.length - 1];
  worker.deliver({ generation: message.generation, ...run(message.snapshot) });
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
  controller.edit(fixture.input.edit);
  const afterEdit = controller.getState();
  assert.equal(afterEdit.state, fixture.expected.afterEdit.state);
  assert.equal(afterEdit.reportAvailable, fixture.expected.afterEdit.reportAvailable);
  controller.run();
  deliverCoreResult(workers[1]);
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
  workers[0].deliver({ generation: 1, ok: true, result: fixture.input.lateResult });
  const afterLateResult = controller.getState();
  assert.equal(afterLateResult.state, fixture.expected.afterLateResult.state);
  assert.equal(afterLateResult.reportAvailable, fixture.expected.afterLateResult.reportAvailable);
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
  controller.edit(fixture.input.newerDraft);
  assert.equal(workers[0].terminated, true);
  controller.run();
  deliverCoreResult(workers[1]);
  const afterNewerResult = controller.getState();
  assert.equal(afterNewerResult.state, fixture.expected.afterNewerResult.state);
  assert.equal(afterNewerResult.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(afterNewerResult.error, fixture.expected.afterNewerResult.error);
  workers[0].deliver({ generation: 1, ok: true, result: fixture.input.olderLateResult });
  const afterOlderLateResult = controller.getState();
  assert.equal(afterOlderLateResult.state, fixture.expected.afterOlderLateResult.state);
  assert.equal(
    afterOlderLateResult.reportAvailable,
    fixture.expected.afterOlderLateResult.reportAvailable,
  );
  assert.deepEqual(afterOlderLateResult.error, fixture.expected.afterOlderLateResult.error);
});

test("initial state is empty with the SPEC defaults", () => {
  const { controller } = setup();
  const state = controller.getState();
  assert.equal(state.state, "empty");
  assert.deepEqual(state.draft, DEFAULTS);
  assert.equal(state.reportAvailable, false);
});

test("loadExample fills the first fixture and marks it as the example", () => {
  const { controller } = setup();
  const state = controller.loadExample();
  assert.deepEqual(state.draft, EXAMPLE);
  assert.equal(state.isExample, true);
});

test("editing during busy terminates the worker and goes dirty", () => {
  const { controller, workers } = setup();
  controller.edit(EXAMPLE);
  controller.run();
  const state = controller.edit({ waistCm: "90" });
  assert.equal(state.state, "dirty");
  assert.equal(workers[0].terminated, true);
  workers[0].deliver({ generation: 1, ok: true, result: { bodyFatPct: 17, category: "fitness", fatMassKg: 12.8, leanMassKg: 62.2 } });
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().result, null);
});

test("switching sex clears the hip draft through a single edit patch", () => {
  const { controller } = setup();
  controller.edit({ sex: "female", hipCm: "95" });
  const state = controller.edit({ sex: "male", hipCm: "" });
  assert.equal(state.draft.sex, "male");
  assert.equal(state.draft.hipCm, "");
});

test("worker onerror becomes WORKER_ERROR", () => {
  const { controller, workers } = setup();
  controller.edit(EXAMPLE);
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
});

test("createWorker throwing becomes WORKER_ERROR", () => {
  const controller = createController({
    createWorker: () => {
      throw new Error("no workers here");
    },
  });
  controller.edit(EXAMPLE);
  const state = controller.run();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
});

test("cancel outside busy is a no-op", () => {
  const { controller } = setup();
  const state = controller.cancel();
  assert.equal(state.state, "empty");
});

test("reset from success restores the defaults and empty state", () => {
  const { controller, workers } = setup();
  controller.edit(EXAMPLE);
  controller.run();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
  const state = controller.reset();
  assert.equal(state.state, "empty");
  assert.deepEqual(state.draft, DEFAULTS);
  assert.equal(state.result, null);
});

test("a reply with a foreign generation is dropped while busy", () => {
  const { controller, workers } = setup();
  controller.edit(EXAMPLE);
  controller.run();
  workers[0].deliver({ generation: 99, ok: true, result: { bodyFatPct: 1, category: "obese", fatMassKg: 1, leanMassKg: 1 } });
  assert.equal(controller.getState().state, "busy");
  deliverCoreResult(workers[0]);
  const state = controller.getState();
  assert.equal(state.state, "success");
  assert.deepEqual(state.result, { bodyFatPct: 17, category: "fitness", fatMassKg: 12.8, leanMassKg: 62.2 });
});
