// Controller tests. The three fixture flows are the SPEC's literal
// controller fixtures, vendored verbatim in test/fixtures.json (spec
// candidate commit f3a6e9d8b1047c2ad8aca895911bdc5eaa70bdbc, draft
// spec PR #384, registry rev 1767), driven by a fake worker whose
// completion is controllable, in the exact driving order the SPEC's
// tests section prescribes: state-dirty-error runs the initial draft,
// edits, and reruns; state-cancel-late runs, cancels before the
// reply, injects the older generation's lateResult, and resets;
// state-replace-late leaves the older draft pending, starts new work
// with the newer draft, fails the new work, then injects the older
// generation's olderLateResult. Each fixture checkpoint is asserted
// against the controller's state, result, error, and report
// availability. The additional unit tests pin the generation guard,
// worker replacement, error surfacing, and the custom-preset
// dimension lifecycle.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createController,
  WORKER_ERROR,
} from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/brick-calculator.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const controllerCases = Object.fromEntries(
  fixtures.cases
    .filter((entry) => entry.kind === "controller")
    .map((entry) => [entry.id, entry]),
);
assert.equal(Object.keys(controllerCases).length, 3);
const standardResult = fixtures.cases.find(
  (entry) => entry.id === "standard-wall",
).expected.result;

function createFakeWorkerFactory() {
  const workers = [];
  function createWorker() {
    const worker = {
      terminated: false,
      onmessage: null,
      onerror: null,
      postMessage(message) {
        worker.lastMessage = message;
      },
      terminate() {
        worker.terminated = true;
      },
      respond(payload) {
        worker.onmessage({
          data: { generation: worker.lastMessage.generation, ...payload },
        });
      },
    };
    workers.push(worker);
    return worker;
  }
  return { workers, createWorker };
}

function setup() {
  const { workers, createWorker } = createFakeWorkerFactory();
  const controller = createController({
    createWorker,
    onChange: () => {},
  });
  return { controller, workers };
}

test("fixture state-dirty-error: run, edit, rerun", () => {
  const fixture = controllerCases["state-dirty-error"];
  const { controller, workers } = setup();

  controller.edit(fixture.input.initial);
  controller.run();
  workers[0].respond({ ok: true, result: standardResult });
  const afterRun = controller.getState();
  assert.equal(afterRun.state, fixture.expected.afterRun.state);
  assert.equal(afterRun.reportAvailable, fixture.expected.afterRun.reportAvailable);
  assert.deepEqual(afterRun.result, standardResult);

  controller.edit(fixture.input.edit);
  const afterEdit = controller.getState();
  assert.equal(afterEdit.state, fixture.expected.afterEdit.state);
  assert.equal(afterEdit.result, null);
  assert.equal(afterEdit.reportAvailable, fixture.expected.afterEdit.reportAvailable);

  controller.run();
  const rerunOutcome = run(workers[1].lastMessage.snapshot);
  assert.deepEqual(rerunOutcome, {
    ok: false,
    error: fixture.expected.afterRerun.error,
  });
  workers[1].respond(rerunOutcome);
  const afterRerun = controller.getState();
  assert.equal(afterRerun.state, fixture.expected.afterRerun.state);
  assert.deepEqual(afterRerun.error, fixture.expected.afterRerun.error);
  assert.equal(afterRerun.reportAvailable, fixture.expected.afterRerun.reportAvailable);
});

test("fixture state-cancel-late: cancel invalidates a late success", () => {
  const fixture = controllerCases["state-cancel-late"];
  const { controller, workers } = setup();

  controller.edit(fixture.input.draft);
  controller.run();
  assert.equal(controller.getState().state, fixture.expected.whilePending.state);
  assert.equal(
    controller.getState().reportAvailable,
    fixture.expected.whilePending.reportAvailable,
  );

  controller.cancel();
  const afterCancel = controller.getState();
  assert.equal(afterCancel.state, fixture.expected.afterCancel.state);
  assert.deepEqual(afterCancel.draft, fixture.expected.afterCancel.draft);
  assert.equal(afterCancel.result, null);
  assert.equal(afterCancel.reportAvailable, fixture.expected.afterCancel.reportAvailable);
  assert.equal(workers[0].terminated, true);

  workers[0].respond({ ok: true, result: fixture.input.lateResult });
  const afterLate = controller.getState();
  assert.equal(afterLate.state, fixture.expected.afterLateResult.state);
  assert.equal(afterLate.result, null);
  assert.equal(afterLate.reportAvailable, fixture.expected.afterLateResult.reportAvailable);

  controller.reset();
  const afterReset = controller.getState();
  assert.equal(afterReset.state, fixture.expected.afterReset.state);
  assert.deepEqual(afterReset.draft, fixture.expected.afterReset.draft);
  assert.equal(afterReset.result, null);
});

test("fixture state-replace-late: newer error stays, older late result ignored", () => {
  const fixture = controllerCases["state-replace-late"];
  const { controller, workers } = setup();

  controller.edit(fixture.input.olderDraft);
  controller.run();
  controller.edit(fixture.input.newerDraft);
  assert.equal(workers[0].terminated, true);
  controller.run();
  const newerOutcome = run(fixture.input.newerDraft);
  assert.deepEqual(newerOutcome, {
    ok: false,
    error: fixture.expected.afterNewerResult.error,
  });
  workers[1].respond(newerOutcome);
  const afterNewer = controller.getState();
  assert.equal(afterNewer.state, fixture.expected.afterNewerResult.state);
  assert.deepEqual(afterNewer.error, fixture.expected.afterNewerResult.error);
  assert.equal(afterNewer.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);

  workers[0].respond({ ok: true, result: fixture.input.olderLateResult });
  const afterOlderLate = controller.getState();
  assert.equal(afterOlderLate.state, fixture.expected.afterOlderLateResult.state);
  assert.deepEqual(afterOlderLate.error, fixture.expected.afterOlderLateResult.error);
  assert.equal(afterOlderLate.result, null);
  assert.equal(afterOlderLate.reportAvailable, fixture.expected.afterOlderLateResult.reportAvailable);
});

test("the delivered success result equals the literal core result for its draft", () => {
  const { controller, workers } = setup();
  const draft = { ...EXAMPLE };
  const expected = run(draft);
  assert.equal(expected.ok, true);
  controller.edit(draft);
  controller.run();
  workers[0].respond({ ok: true, result: expected.result });
  const state = controller.getState();
  assert.equal(state.state, "success");
  assert.deepEqual(state.result, expected.result);
  assert.equal(state.reportAvailable, true);
});

test("an edit during busy terminates the worker, goes dirty, and drops the late reply", () => {
  const { controller, workers } = setup();
  controller.edit({ ...EXAMPLE });
  controller.run();
  assert.equal(controller.getState().state, "busy");
  controller.edit({ wastePct: "6" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.reportAvailable, false);
  assert.equal(workers[0].terminated, true);
  workers[0].respond({ ok: true, result: run(EXAMPLE).result });
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().result, null);
});

test("running while busy replaces the worker and the generation", () => {
  const { controller, workers } = setup();
  controller.edit({ ...EXAMPLE });
  controller.run();
  const firstGeneration = workers[0].lastMessage.generation;
  controller.run();
  assert.equal(workers.length, 2);
  assert.equal(workers[0].terminated, true);
  assert.equal(workers[1].terminated, false);
  assert.notEqual(workers[1].lastMessage.generation, firstGeneration);
  assert.equal(controller.getState().state, "busy");
  workers[1].respond({ ok: true, result: run(EXAMPLE).result });
  assert.equal(controller.getState().state, "success");
});

test("cancel outside busy is a no-op", () => {
  const { controller } = setup();
  controller.cancel();
  const state = controller.getState();
  assert.equal(state.state, "empty");
  assert.deepEqual(state.draft, DEFAULTS);
});

test("loadExample fills the pinned example draft without running", () => {
  const { controller, workers } = setup();
  controller.loadExample();
  const state = controller.getState();
  // From the initial state there is no old result to revoke, so the
  // state stays empty (house state-machine reading); the example
  // note shows via isExample and the run stays manual.
  assert.equal(state.state, "empty");
  assert.equal(state.isExample, true);
  assert.deepEqual(state.draft, EXAMPLE);
  assert.equal(state.reportAvailable, false);
  assert.equal(workers.length, 0);
  controller.run();
  assert.equal(controller.getState().state, "busy");
  assert.deepEqual(workers[0].lastMessage.snapshot, EXAMPLE);
});

test("a worker error message maps to the public WORKER_ERROR", () => {
  const { controller, workers } = setup();
  controller.edit({ ...EXAMPLE });
  controller.run();
  workers[0].onerror(new Error("boom"));
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, WORKER_ERROR);
  assert.equal(state.reportAvailable, false);
});

test("a createWorker failure maps to the public WORKER_ERROR", () => {
  const controller = createController({
    createWorker() {
      throw new Error("no workers here");
    },
    onChange: () => {},
  });
  controller.edit({ ...EXAMPLE });
  controller.run();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, WORKER_ERROR);
});

test("reset from success restores the defaults and the empty state", () => {
  const { controller, workers } = setup();
  controller.edit({ ...EXAMPLE });
  controller.run();
  workers[0].respond({ ok: true, result: run(EXAMPLE).result });
  controller.reset();
  const state = controller.getState();
  assert.equal(state.state, "empty");
  assert.deepEqual(state.draft, DEFAULTS);
  assert.equal(state.result, null);
  assert.equal(state.isExample, false);
});

test("edit from error clears the error and goes dirty", () => {
  const { controller, workers } = setup();
  controller.edit({ ...EXAMPLE, wastePct: "51" });
  controller.run();
  workers[0].respond({
    ok: false,
    error: { code: "RANGE", field: "wastePct", row: null },
  });
  assert.equal(controller.getState().state, "error");
  controller.edit({ wastePct: "5" });
  const state = controller.getState();
  assert.equal(state.state, "dirty");
  assert.equal(state.error, null);
  assert.equal(state.reportAvailable, false);
});

test("choosing custom adds blank dimensions; choosing a preset removes them and the snapshot never carries them", () => {
  const { controller, workers } = setup();
  controller.edit({ brickPreset: "custom" });
  const customDraft = controller.getState().draft;
  assert.equal(customDraft.brickPreset, "custom");
  assert.equal(customDraft.brickLengthMm, "");
  assert.equal(customDraft.brickHeightMm, "");
  assert.equal(customDraft.brickWidthMm, "");
  controller.edit({
    brickLengthMm: "200",
    brickHeightMm: "60",
    brickWidthMm: "100",
  });
  controller.run();
  assert.deepEqual(workers[0].lastMessage.snapshot, {
    ...EXAMPLE,
    brickPreset: "custom",
    brickLengthMm: "200",
    brickHeightMm: "60",
    brickWidthMm: "100",
  });
  workers[0].respond({
    ok: true,
    result: run(workers[0].lastMessage.snapshot).result,
  });
  assert.equal(controller.getState().state, "success");
  controller.edit({ brickPreset: "taiwan-red" });
  const presetDraft = controller.getState().draft;
  assert.equal(presetDraft.brickPreset, "taiwan-red");
  assert.equal("brickLengthMm" in presetDraft, false);
  assert.equal("brickHeightMm" in presetDraft, false);
  assert.equal("brickWidthMm" in presetDraft, false);
  controller.run();
  assert.equal("brickLengthMm" in workers[1].lastMessage.snapshot, false);
});

test("opening edits replace the openings array in the draft", () => {
  const { controller } = setup();
  controller.edit({ openings: [{ widthM: "0.9", heightM: "2.1" }] });
  assert.deepEqual(controller.getState().draft.openings, [
    { widthM: "0.9", heightM: "2.1" },
  ]);
  controller.edit({
    openings: [
      { widthM: "0.9", heightM: "2.1" },
      { widthM: "1.2", heightM: "1.2" },
    ],
  });
  assert.equal(controller.getState().draft.openings.length, 2);
});
