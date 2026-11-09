// Controller tests: the three controller fixtures from the fixed
// spec's fixtures.json (vendored verbatim at test/fixtures.json from
// spec candidate 9d865432902652718d572d3f162518e640ae6268), driven by a
// fake worker whose completion is controllable, plus the blank
// startTime resolution (snapshot only, draft untouched), report
// availability lifecycle, generation isolation, and worker-failure
// cases. Expected states, drafts, and errors are taken verbatim from
// the fixtures.

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE } from "../public/js/core/download.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const controllerCases = Object.fromEntries(
  fixtures.cases.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);
const basicResult = fixtures.cases.find((entry) => entry.id === "basic-gb").expected.result;

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

function setup(extra = {}) {
  const workers = [];
  const controller = createController({
    createWorker: () => {
      const worker = makeFakeWorker();
      workers.push(worker);
      return worker;
    },
    ...extra,
  });
  return { controller, workers };
}

test("fixture state-dirty-error", () => {
  const fixture = controllerCases["state-dirty-error"];
  const { controller, workers } = setup();
  controller.edit(fixture.input.initial);
  controller.run();
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: basicResult,
  });
  const afterRun = controller.getState();
  assert.equal(afterRun.state, fixture.expected.afterRun.state);
  assert.equal(afterRun.reportAvailable, fixture.expected.afterRun.reportAvailable);
  controller.edit(fixture.input.edit);
  const afterEdit = controller.getState();
  assert.equal(afterEdit.state, fixture.expected.afterEdit.state);
  assert.equal(afterEdit.reportAvailable, fixture.expected.afterEdit.reportAvailable);
  controller.run();
  workers[1].deliver({
    generation: workers[1].posted[0].generation,
    ok: false,
    error: { code: "RANGE", field: "speedValue", row: null },
  });
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
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: fixture.input.lateResult,
  });
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
  controller.run();
  assert.equal(workers[0].terminated, true);
  const newerGeneration = workers[1].posted[0].generation;
  workers[1].deliver({
    generation: newerGeneration,
    ok: false,
    error: { code: "RANGE", field: "speedValue", row: null },
  });
  const afterNewerResult = controller.getState();
  assert.equal(afterNewerResult.state, fixture.expected.afterNewerResult.state);
  assert.equal(afterNewerResult.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(afterNewerResult.error, fixture.expected.afterNewerResult.error);
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: fixture.input.olderLateResult,
  });
  const afterOlderLateResult = controller.getState();
  assert.equal(afterOlderLateResult.state, fixture.expected.afterOlderLateResult.state);
  assert.equal(
    afterOlderLateResult.reportAvailable,
    fixture.expected.afterOlderLateResult.reportAvailable,
  );
  assert.deepEqual(afterOlderLateResult.error, fixture.expected.afterOlderLateResult.error);
});

test("a blank startTime is resolved to local now in the snapshot only", () => {
  const { controller, workers } = setup({ nowLocal: () => "07:05" });
  controller.run();
  assert.equal(workers[0].posted[0].snapshot.startTime, "07:05");
  assert.equal(controller.getState().draft.startTime, "");
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: basicResult,
  });
  assert.equal(controller.getState().state, "success");
  assert.equal(controller.getState().draft.startTime, "");
});

test("a concrete startTime is posted unchanged", () => {
  const { controller, workers } = setup({ nowLocal: () => "07:05" });
  controller.edit({ startTime: "23:30" });
  controller.run();
  assert.equal(workers[0].posted[0].snapshot.startTime, "23:30");
});

test("the report text exists exactly while the state is success", () => {
  const { controller, workers } = setup();
  assert.equal(controller.getReportText(), null);
  controller.edit(EXAMPLE);
  controller.run();
  assert.equal(controller.getReportText(), null);
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: basicResult,
  });
  const text = controller.getReportText();
  assert.equal(typeof text, "string");
  assert.ok(text.endsWith("}\n"));
  controller.edit({ sizeValue: "5" });
  assert.equal(controller.getState().reportAvailable, false);
  assert.equal(controller.getReportText(), null);
});

test("edit during busy terminates the worker, goes dirty, and drops the late reply", () => {
  const { controller, workers } = setup();
  controller.edit({ sizeValue: "2" });
  controller.run();
  assert.equal(controller.getState().state, "busy");
  controller.edit({ sizeValue: "3" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.reportAvailable, false);
  assert.equal(workers[0].terminated, true);
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: basicResult,
  });
  assert.equal(controller.getState().state, "dirty");
});

test("running while busy replaces the worker", () => {
  const { controller, workers } = setup();
  controller.run();
  controller.run();
  assert.equal(workers[0].terminated, true);
  assert.equal(workers[1].terminated, false);
  assert.equal(controller.getState().state, "busy");
});

test("cancel when not busy is a no-op", () => {
  const { controller } = setup();
  assert.equal(controller.getState().state, "empty");
  controller.cancel();
  assert.equal(controller.getState().state, "empty");
});

test("worker error becomes WORKER_ERROR and keeps the draft", () => {
  const { controller, workers } = setup();
  controller.edit({ sizeValue: "33" });
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(state.draft.sizeValue, "33");
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
  controller.edit(EXAMPLE);
  controller.run();
  workers[0].deliver({
    generation: workers[0].posted[0].generation,
    ok: true,
    result: basicResult,
  });
  assert.equal(controller.getState().state, "success");
  const reset = controller.reset();
  assert.equal(reset.state, "empty");
  assert.deepEqual(reset.draft, DEFAULTS);
  assert.equal(reset.reportAvailable, false);
  assert.equal(reset.result, null);
});
