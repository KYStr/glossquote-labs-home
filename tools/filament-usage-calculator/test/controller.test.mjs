// Controller tests for the Filament Usage Calculator.
// State-sequence expectations are the controller FIXTURE LITERALS from
// the fixed specification candidate (spec task
// labs-filament-usage-calculator-spec-20261109, candidate commit
// 599649b23a0e4103eb019e90190d7def7c70e4ea, vendored verbatim at
// test/fixtures.json) plus the SPEC's userFlow rules. A fake worker
// stands in for the Worker: its replies are delivered by hand, so
// "busy" and "late reply" situations are deterministic. The fake
// computes through the real core, exactly like the real worker
// handler; expected values are fixture literals, not outputs captured
// from the implementation.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { DEFAULTS, EXAMPLE, run } from "../public/js/core/filament.mjs";
import { createController } from "../public/js/controller.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const controllerCases = new Map(
  fixtures.cases
    .filter((entry) => entry.kind === "controller")
    .map((entry) => [entry.id, entry]),
);

function createFakeWorkerHarness() {
  const created = [];
  function createWorker() {
    const worker = {
      onmessage: null,
      onerror: null,
      posted: [],
      terminated: false,
      postMessage(message) {
        worker.posted.push(message);
      },
      terminate() {
        worker.terminated = true;
      },
      deliver(payload) {
        worker.onmessage?.({ data: payload });
      },
      deliverCoreResult() {
        const message = worker.posted.at(-1);
        worker.deliver({ generation: message.generation, ...run(message.snapshot) });
      },
    };
    created.push(worker);
    return worker;
  }
  return { createWorker, created };
}

function createTestController() {
  const harness = createFakeWorkerHarness();
  const seen = [];
  const controller = createController({
    createWorker: harness.createWorker,
    onChange: (publicState) => seen.push(publicState),
  });
  return { controller, harness, seen };
}

test("the vendored fixtures carry three controller cases", () => {
  assert.equal(controllerCases.size, 3);
});

test("fixture state-dirty-error: a real result, then an edit drops it, re-run errors", () => {
  const fixture = controllerCases.get("state-dirty-error");
  const { controller, harness } = createTestController();
  controller.edit(fixture.input.initial);
  assert.deepEqual(controller.getState().draft, fixture.input.initial);
  controller.run();
  harness.created[0].deliverCoreResult();
  let observed = controller.getState();
  assert.equal(observed.state, fixture.expected.afterRun.state);
  assert.equal(observed.reportAvailable, fixture.expected.afterRun.reportAvailable);
  assert.equal(observed.result.weightG, "298.3");

  observed = controller.edit(fixture.input.edit);
  assert.equal(observed.state, fixture.expected.afterEdit.state);
  assert.equal(observed.reportAvailable, fixture.expected.afterEdit.reportAvailable);
  assert.equal(observed.result, null);

  controller.run();
  harness.created[1].deliverCoreResult();
  observed = controller.getState();
  assert.equal(observed.state, fixture.expected.afterRerun.state);
  assert.deepEqual(observed.error, fixture.expected.afterRerun.error);
  assert.equal(observed.reportAvailable, fixture.expected.afterRerun.reportAvailable);
});

test("fixture state-cancel-late: cancel keeps the draft, a late reply cannot revive, reset restores defaults", () => {
  const fixture = controllerCases.get("state-cancel-late");
  const { controller, harness } = createTestController();
  controller.edit(fixture.input.draft);
  assert.deepEqual(controller.getState().draft, fixture.input.draft);
  controller.run();
  let observed = controller.getState();
  assert.equal(observed.state, fixture.expected.whilePending.state);
  assert.equal(observed.reportAvailable, fixture.expected.whilePending.reportAvailable);

  const worker = harness.created[0];
  const postedGeneration = worker.posted[0].generation;
  observed = controller.cancel();
  assert.equal(observed.state, fixture.expected.afterCancel.state);
  assert.deepEqual(observed.draft, fixture.expected.afterCancel.draft);
  assert.equal(observed.reportAvailable, fixture.expected.afterCancel.reportAvailable);
  assert.equal(worker.terminated, true);

  worker.deliver({ generation: postedGeneration, ok: true, result: fixture.input.lateResult });
  observed = controller.getState();
  assert.equal(observed.state, fixture.expected.afterLateResult.state);
  assert.equal(observed.reportAvailable, fixture.expected.afterLateResult.reportAvailable);
  assert.equal(observed.result, null);

  observed = controller.reset();
  assert.equal(observed.state, fixture.expected.afterReset.state);
  assert.deepEqual(observed.draft, fixture.expected.afterReset.draft);
  assert.equal(observed.reportAvailable, fixture.expected.afterReset.reportAvailable);
});

test("fixture state-replace-late: the newer error stands when the older success arrives late", () => {
  const fixture = controllerCases.get("state-replace-late");
  const { controller, harness } = createTestController();
  controller.edit(fixture.input.olderDraft);
  assert.deepEqual(controller.getState().draft, fixture.input.olderDraft);
  controller.run();
  const firstWorker = harness.created[0];
  firstWorker.deliverCoreResult();
  assert.equal(controller.getState().state, "success");
  assert.equal(controller.getState().result.weightG, "298.3");

  controller.edit(fixture.input.newerDraft);
  assert.equal(controller.getState().state, "dirty");
  controller.run();
  harness.created[1].deliverCoreResult();
  let observed = controller.getState();
  assert.equal(observed.state, fixture.expected.afterNewerResult.state);
  assert.deepEqual(observed.error, fixture.expected.afterNewerResult.error);
  assert.equal(observed.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);

  firstWorker.deliver({ generation: 1, ok: true, result: fixture.input.olderLateResult });
  observed = controller.getState();
  assert.equal(observed.state, fixture.expected.afterOlderLateResult.state);
  assert.deepEqual(observed.error, fixture.expected.afterOlderLateResult.error);
  assert.equal(observed.reportAvailable, fixture.expected.afterOlderLateResult.reportAvailable);
});

test("initial state is empty with the SPEC defaults, and reset restores them", () => {
  const { controller } = createTestController();
  const initial = controller.getState();
  assert.equal(initial.state, "empty");
  assert.deepEqual(initial.draft, DEFAULTS);
  assert.equal(initial.isExample, false);
  assert.equal(initial.reportAvailable, false);
  controller.edit({ lengthM: "42" });
  // Editing from empty keeps empty (nothing to revoke) but keeps the draft.
  assert.equal(controller.getState().state, "empty");
  assert.equal(controller.getState().draft.lengthM, "42");
  const reset = controller.reset();
  assert.equal(reset.state, "empty");
  assert.deepEqual(reset.draft, DEFAULTS);
});

test("editing during busy terminates the worker and lands in dirty", () => {
  const { controller, harness } = createTestController();
  controller.run();
  assert.equal(controller.getState().state, "busy");
  const observed = controller.edit({ lengthM: "20" });
  assert.equal(observed.state, "dirty");
  assert.equal(observed.result, null);
  assert.equal(harness.created[0].terminated, true);
});

test("switching mode never clears typed values", () => {
  const { controller } = createTestController();
  controller.edit({ lengthM: "33.5", grossWeightG: "640", spoolPrice: "799" });
  controller.edit({ mode: "spool" });
  controller.edit({ mode: "cost" });
  const draft = controller.getState().draft;
  assert.equal(draft.lengthM, "33.5");
  assert.equal(draft.grossWeightG, "640");
  assert.equal(draft.spoolPrice, "799");
  controller.edit({ mode: "length" });
  assert.equal(controller.getState().draft.grossWeightG, "640");
});

test("loadExample fills the worked example and flags it until the next edit", () => {
  const { controller } = createTestController();
  const loaded = controller.loadExample();
  assert.equal(loaded.isExample, true);
  assert.deepEqual(loaded.draft, EXAMPLE);
  controller.edit({ material: "petg" });
  assert.equal(controller.getState().isExample, false);
});

test("cancel outside busy is a no-op; worker errors land in error state", () => {
  const { controller, harness } = createTestController();
  assert.equal(controller.cancel().state, "empty");
  controller.run();
  const worker = harness.created[0];
  worker.onerror?.(new Error("boom"));
  const observed = controller.getState();
  assert.equal(observed.state, "error");
  assert.deepEqual(observed.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(worker.terminated, true);
});

test("destroy terminates the in-flight worker", () => {
  const { controller, harness } = createTestController();
  controller.run();
  controller.destroy();
  assert.equal(harness.created[0].terminated, true);
});
