// Controller tests: the three controller fixtures from fixtures.json
// (driven by a fake worker whose completion is controllable), plus
// generation-isolation, replacement, mode-switch, and worker-failure
// cases. Expected states, drafts, and errors are taken verbatim from
// the fixtures; worker replies for the fixture runs are produced by
// the real core, exactly as the page's worker handler produces them.

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/battery-runtime-calculator.mjs";
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

// Deliver the reply the real worker would produce for the snapshot the
// controller posted to this worker.
function deliverCoreResult(worker) {
  const { snapshot, generation } = worker.posted[worker.posted.length - 1];
  worker.deliver({ generation, ...run(snapshot) });
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
  assert.equal(afterEdit.result, null);
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
  const postedGeneration = workers[0].posted[0].generation;
  workers[0].deliver({ generation: postedGeneration, ok: true, result: fixture.input.lateResult });
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
  controller.edit(fixture.input.newerDraft);
  controller.run();
  assert.equal(workers[0].terminated, true);
  // The newer run's generation is whatever the controller posted to its
  // worker (the edit that replaced the draft bumped the generation
  // first); read it from the fake worker instead of assuming a number.
  deliverCoreResult(workers[1]);
  const afterNewerResult = controller.getState();
  assert.equal(afterNewerResult.state, fixture.expected.afterNewerResult.state);
  assert.equal(afterNewerResult.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(afterNewerResult.error, fixture.expected.afterNewerResult.error);
  const olderGeneration = workers[0].posted[0].generation;
  workers[0].deliver({ generation: olderGeneration, ok: true, result: fixture.input.olderLateResult });
  const afterOlderLateResult = controller.getState();
  assert.equal(afterOlderLateResult.state, fixture.expected.afterOlderLateResult.state);
  assert.equal(afterOlderLateResult.reportAvailable, fixture.expected.afterOlderLateResult.reportAvailable);
  assert.deepEqual(afterOlderLateResult.error, fixture.expected.afterOlderLateResult.error);
});

test("edit during busy terminates the worker, goes dirty, and drops the late reply", () => {
  const { controller, workers } = setup();
  controller.run();
  assert.equal(controller.getState().state, "busy");
  controller.edit({ loadWatts: "11" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.reportAvailable, false);
  assert.equal(workers[0].terminated, true);
  const generation = workers[0].posted[0].generation;
  workers[0].deliver({ generation, ok: true, result: run(DEFAULTS).result });
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().result, null);
});

test("editing a field after success revokes the result", () => {
  const { controller, workers } = setup();
  controller.run();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
  controller.edit({ loadWatts: "11" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.result, null);
  assert.equal(dirty.reportAvailable, false);
  assert.equal(dirty.draft.loadWatts, "11");
});

test("running while busy replaces the worker", () => {
  const { controller, workers } = setup();
  controller.run();
  controller.run();
  assert.equal(workers[0].terminated, true);
  assert.equal(workers[1].terminated, false);
  assert.equal(controller.getState().state, "busy");
  deliverCoreResult(workers[1]);
  assert.equal(controller.getState().state, "success");
});

test("cancel when not busy is a no-op", () => {
  const { controller } = setup();
  assert.equal(controller.getState().state, "empty");
  controller.cancel();
  assert.equal(controller.getState().state, "empty");
});

test("worker error becomes WORKER_ERROR and keeps the draft", () => {
  const { controller, workers } = setup();
  controller.edit({ loadWatts: "11" });
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(state.draft.loadWatts, "11");
  assert.equal(state.reportAvailable, false);
});

test("a createWorker throw becomes WORKER_ERROR", () => {
  const controller = createController({
    createWorker: () => {
      throw new Error("no worker");
    },
  });
  controller.run();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
});

test("loadExample fills the first fixture case and waits for a manual run", () => {
  const { controller, workers } = setup();
  const loaded = controller.loadExample();
  assert.deepEqual(loaded.draft, EXAMPLE);
  assert.equal(loaded.isExample, true);
  assert.equal(loaded.state, "empty");
  controller.run();
  assert.deepEqual(workers[0].posted[0].snapshot, EXAMPLE);
});

test("reset from success restores defaults and empty state", () => {
  const { controller, workers } = setup();
  controller.run();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
  const reset = controller.reset();
  assert.equal(reset.state, "empty");
  assert.deepEqual(reset.draft, DEFAULTS);
  assert.equal(reset.reportAvailable, false);
  assert.equal(reset.result, null);
});

test("edit from empty stays empty; edit from error goes dirty", () => {
  const { controller, workers } = setup();
  controller.edit({ loadWatts: "11" });
  assert.equal(controller.getState().state, "empty");
  controller.edit({ loadWatts: "x" });
  controller.run();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "error");
  controller.edit({ loadWatts: "10" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.error, null);
});

test("the controller never shares its draft object with the caller", () => {
  const { controller } = setup();
  const first = controller.getState();
  first.draft.loadWatts = "9999";
  assert.equal(controller.getState().draft.loadWatts, "10");
  const patch = { loadWatts: "12" };
  controller.edit(patch);
  patch.loadWatts = "9999";
  assert.equal(controller.getState().draft.loadWatts, "12");
});

test("mode switch rebuilds the draft with only the new mode's fields", () => {
  const { controller, workers } = setup();
  controller.edit({ mode: "runtime-wh" });
  assert.deepEqual(controller.getState().draft, {
    mode: "runtime-wh",
    capacityWh: "",
    loadWatts: "10",
    depthOfDischargePercent: "",
  });
  // Shared fields keep their values across the switch.
  controller.edit({ capacityWh: "100", loadWatts: "25" });
  controller.edit({ mode: "pack" });
  assert.deepEqual(controller.getState().draft, {
    mode: "pack",
    cellCapacityMah: "",
    cellVoltage: "",
    seriesCount: "",
    parallelCount: "",
    loadWatts: "25",
    depthOfDischargePercent: "",
  });
  // An inapplicable patch key is ignored, never added to the draft.
  controller.edit({ capacityMah: "10000" });
  assert.equal("capacityMah" in controller.getState().draft, false);
  // A pack run posts exactly the pack snapshot.
  controller.edit({
    cellCapacityMah: "3500",
    cellVoltage: "3.7",
    seriesCount: "4",
    parallelCount: "2",
  });
  controller.run();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
  assert.equal(controller.getState().result.energyWh, 103.6);
});

test("an empty depth of discharge is omitted from the snapshot (absent means 100%)", () => {
  const { controller, workers } = setup();
  controller.edit({ depthOfDischargePercent: "" });
  controller.run();
  assert.equal("depthOfDischargePercent" in workers[0].posted[0].snapshot, false);
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
  assert.equal(controller.getState().result.usableWh, 37);
  // A filled DoD is posted as-is.
  controller.edit({ depthOfDischargePercent: "50" });
  controller.run();
  assert.equal(workers[1].posted[0].snapshot.depthOfDischargePercent, "50");
  deliverCoreResult(workers[1]);
  assert.equal(controller.getState().result.usableWh, 18.5);
});
