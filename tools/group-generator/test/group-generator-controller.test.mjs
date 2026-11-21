// Controller tests: the three controller fixtures from fixtures.json
// (driven by a fake worker whose completion is controllable), plus
// sequence-isolation, replacement, worker-failure, seed-fill-failure,
// cancel and reset cases. Expected states, drafts and results are
// taken verbatim from the fixtures; worker replies for the fixture
// runs are produced by the real core, exactly as the page's worker
// handler produces them.

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULT_DRAFT, EXAMPLE_INPUT, run } from "../public/js/core/group-generator.mjs";
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

function deliverOutcome(worker, draft) {
  const outcome = run(draft);
  worker.deliver({ sequence: worker.posted[0].sequence, draft, outcome });
}

test("fixture state-unseeded-fill: blank seed is filled, shown, and reruns identically", () => {
  const { controller, workers } = setup({
    fillSeed: () => controllerCases["state-unseeded-fill"].input.fillSeed,
  });
  const fixture = controllerCases["state-unseeded-fill"];
  controller.edit(fixture.input.draft);
  const afterRun = controller.run();
  assert.equal(afterRun.draft.seed, fixture.expected.afterFill.seedField);
  assert.equal(afterRun.state, "busy");
  assert.equal(afterRun.reportAvailable, false);
  assert.equal(workers.length, 1);
  deliverOutcome(workers[0], afterRun.draft);
  const done = controller.getState();
  assert.equal(done.state, fixture.expected.afterRun.state);
  assert.equal(done.reportAvailable, fixture.expected.afterRun.reportAvailable);
  assert.deepEqual(done.result, fixture.expected.afterRun.result);
  controller.run();
  assert.equal(workers.length, 2);
  deliverOutcome(workers[1], controller.getState().draft);
  const rerun = controller.getState();
  assert.equal(rerun.state, fixture.expected.afterRerun.state);
  assert.equal(rerun.reportAvailable, fixture.expected.afterRerun.reportAvailable);
  assert.deepEqual(rerun.result, done.result);
  assert.equal(fixture.expected.afterRerun.identicalResult, true);
});

test("fixture state-dirty-error: edit invalidates the old result; rerun gives EMPTY", () => {
  const { controller, workers } = setup({ fillSeed: () => "42" });
  const fixture = controllerCases["state-dirty-error"];
  controller.edit(fixture.input.initial);
  controller.run();
  deliverOutcome(workers[0], controller.getState().draft);
  const afterRun = controller.getState();
  assert.equal(afterRun.state, fixture.expected.afterRun.state);
  assert.equal(afterRun.reportAvailable, fixture.expected.afterRun.reportAvailable);
  controller.edit(fixture.input.edit);
  const afterEdit = controller.getState();
  assert.equal(afterEdit.state, fixture.expected.afterEdit.state);
  assert.equal(afterEdit.reportAvailable, fixture.expected.afterEdit.reportAvailable);
  assert.equal(afterEdit.result, null);
  const afterRerun = controller.run();
  assert.equal(afterRerun.state, fixture.expected.afterRerun.state);
  assert.equal(afterRerun.reportAvailable, fixture.expected.afterRerun.reportAvailable);
  assert.deepEqual(afterRerun.error, fixture.expected.afterRerun.error);
});

test("fixture state-cancel-late: cancel keeps the draft, late results never resurrect, reset restores defaults", () => {
  const { controller, workers } = setup({ fillSeed: () => "42" });
  const fixture = controllerCases["state-cancel-late"];
  controller.edit(fixture.input.draft);
  const running = controller.run();
  assert.equal(running.state, fixture.expected.whilePending.state);
  assert.equal(running.reportAvailable, fixture.expected.whilePending.reportAvailable);
  const afterCancel = controller.cancel();
  assert.equal(afterCancel.state, fixture.expected.afterCancel.state);
  assert.equal(afterCancel.reportAvailable, fixture.expected.afterCancel.reportAvailable);
  assert.deepEqual(afterCancel.draft, fixture.expected.afterCancel.draft);
  assert.equal(workers[0].terminated, true);
  // The late reply from the cancelled generation must be dropped.
  workers[0].deliver({
    sequence: workers[0].posted[0].sequence,
    draft: fixture.input.draft,
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
  assert.deepEqual(afterReset.draft, DEFAULT_DRAFT);
});

test("seed fill failure: no entropy source means error with seedFillFailed and no worker", () => {
  const { controller, workers } = setup({ fillSeed: () => null });
  controller.edit({ names: "A\nB", mode: "count", groupCount: "2", groupSize: "", seed: "" });
  const state = controller.run();
  assert.equal(state.state, "error");
  assert.equal(state.seedFillFailed, true);
  assert.equal(state.error.field, "seed");
  assert.equal(workers.length, 0);
});

test("edit during busy terminates the worker and goes dirty; second run while busy is ignored", () => {
  const { controller, workers } = setup({ fillSeed: () => "42" });
  controller.edit({ names: "A\nB\nC", mode: "count", groupCount: "2", groupSize: "", seed: "42" });
  controller.run();
  assert.equal(workers.length, 1);
  controller.run();
  assert.equal(workers.length, 1);
  controller.edit({ names: "A\nB\nC\nD" });
  assert.equal(controller.getState().state, "dirty");
  assert.equal(workers[0].terminated, true);
});

test("worker failure goes to error with WORKER_ERROR and never fabricates a result", () => {
  const { controller, workers } = setup({ fillSeed: () => "42" });
  controller.edit({ names: "A\nB", mode: "count", groupCount: "2", groupSize: "", seed: "42" });
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(state.result, null);
});

test("worker construction failure goes to error with WORKER_ERROR", () => {
  const controller = createController({
    createWorker: () => {
      throw new Error("no worker");
    },
    fillSeed: () => "42",
  });
  controller.edit({ names: "A\nB", mode: "count", groupCount: "2", groupSize: "", seed: "42" });
  const state = controller.run();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
});

test("load example fills the basic-count input and waits in dirty state", () => {
  const { controller } = setup({ fillSeed: () => "42" });
  const state = controller.loadExample();
  assert.deepEqual(state.draft, EXAMPLE_INPUT);
  assert.equal(state.isExample, true);
  assert.equal(state.state, "dirty");
  assert.equal(state.reportAvailable, false);
});

test("reset from success restores defaults and the empty state", () => {
  const { controller, workers } = setup({ fillSeed: () => "42" });
  controller.edit({ names: "A\nB", mode: "count", groupCount: "2", groupSize: "", seed: "42" });
  controller.run();
  deliverOutcome(workers[0], controller.getState().draft);
  assert.equal(controller.getState().state, "success");
  const reset = controller.reset();
  assert.deepEqual(reset.draft, DEFAULT_DRAFT);
  assert.equal(reset.state, "empty");
  assert.equal(reset.result, null);
  assert.equal(reset.isExample, false);
});

test("local validation failure never posts to a worker and leaves the sequence unchanged", () => {
  const { controller, workers } = setup({ fillSeed: () => "42" });
  controller.edit({ names: "", mode: "count", groupCount: "2", groupSize: "", seed: "42" });
  const before = controller.getState().sequence;
  const state = controller.run();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "EMPTY", field: "names", row: null });
  assert.equal(workers.length, 0);
  assert.equal(controller.getState().sequence, before);
});
