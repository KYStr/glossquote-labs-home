// Controller tests. The three fixture flows are the SPEC's literal
// controller fixtures, vendored verbatim in test/fixtures.json (spec
// candidate commit f8a034e4c1bd81c3c21cb7fb221c0bb6fec8f683, draft
// spec PR #368), driven by a fake worker whose completion is
// controllable, in the exact driving order the SPEC's tests section
// prescribes: state-dirty-error runs the initial draft, edits, and
// reruns; state-cancel-late runs, cancels before the reply, injects
// the older generation's lateResult, and resets; state-replace-late
// leaves the older draft pending, starts new work with the newer
// draft, fails the new work, then injects the older generation's
// olderLateResult. Each fixture checkpoint (a literal string in the
// fixture) is asserted against the controller's state, result, error,
// and report availability. The success result delivered in
// state-dirty-error is the pinned normal-typical core result from
// the same fixtures file. The additional unit tests pin the
// generation guard, worker replacement, and error surfacing.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createController,
  WORKER_ERROR,
} from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/blood-pressure.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const controllerCases = Object.fromEntries(
  fixtures.cases
    .filter((entry) => entry.kind === "controller")
    .map((entry) => [entry.id, entry]),
);
assert.equal(Object.keys(controllerCases).length, 3);
const normalResult = fixtures.cases.find(
  (entry) => entry.id === "normal-typical",
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
  assert.deepEqual(fixture.expected.checkpoints, [
    "initial result category normal",
    "after edit: no result, no download, error INTEGER_FORMAT field systolic",
  ]);
  const { controller, workers } = setup();

  controller.edit(fixture.input.initial);
  controller.run();
  workers[0].respond({ ok: true, result: normalResult });
  const afterRun = controller.getState();
  assert.equal(afterRun.state, "success");
  assert.equal(afterRun.result.category, "normal");
  assert.equal(afterRun.reportAvailable, true);

  controller.edit(fixture.input.edit);
  const afterEdit = controller.getState();
  assert.equal(afterEdit.state, "dirty");
  assert.equal(afterEdit.result, null);
  assert.equal(afterEdit.reportAvailable, false);

  controller.run();
  const rerunOutcome = run(workers[1].lastMessage.snapshot);
  assert.deepEqual(rerunOutcome, {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "systolic", row: null },
  });
  workers[1].respond(rerunOutcome);
  const afterRerun = controller.getState();
  assert.equal(afterRerun.state, "error");
  assert.deepEqual(afterRerun.error, { code: "INTEGER_FORMAT", field: "systolic", row: null });
  assert.equal(afterRerun.reportAvailable, false);
});

test("fixture state-cancel-late: cancel invalidates a late success", () => {
  const fixture = controllerCases["state-cancel-late"];
  assert.deepEqual(fixture.expected.checkpoints, [
    "cancel before late result: no result shown",
    "late result discarded",
    "after reset: empty inputs, no result",
  ]);
  const { controller, workers } = setup();

  controller.edit(fixture.input.draft);
  controller.run();
  assert.equal(controller.getState().state, "busy");

  controller.cancel();
  const afterCancel = controller.getState();
  assert.equal(afterCancel.state, "cancelled");
  assert.equal(afterCancel.result, null);
  assert.equal(afterCancel.reportAvailable, false);
  assert.equal(workers[0].terminated, true);

  const lateResult = run(fixture.input.draft).result;
  workers[0].respond({ ok: true, result: lateResult });
  const afterLate = controller.getState();
  assert.equal(afterLate.state, "cancelled");
  assert.equal(afterLate.result, null);
  assert.equal(afterLate.reportAvailable, false);

  controller.reset();
  const afterReset = controller.getState();
  assert.equal(afterReset.state, "empty");
  assert.deepEqual(afterReset.draft, DEFAULTS);
  assert.equal(afterReset.result, null);
});

test("fixture state-replace-late: newer error stays, older late result ignored", () => {
  const fixture = controllerCases["state-replace-late"];
  assert.deepEqual(fixture.expected.checkpoints, [
    "newer work errors RANGE field systolic",
    "older late success discarded, error retained",
  ]);
  const { controller, workers } = setup();

  controller.edit(fixture.input.olderDraft);
  controller.run();
  controller.edit(fixture.input.newerDraft);
  assert.equal(workers[0].terminated, true);
  controller.run();
  const newerOutcome = run(fixture.input.newerDraft);
  assert.deepEqual(newerOutcome, {
    ok: false,
    error: { code: "RANGE", field: "systolic", row: null },
  });
  workers[1].respond(newerOutcome);
  const afterNewer = controller.getState();
  assert.equal(afterNewer.state, "error");
  assert.deepEqual(afterNewer.error, { code: "RANGE", field: "systolic", row: null });

  const olderLateResult = run(fixture.input.olderDraft).result;
  workers[0].respond({ ok: true, result: olderLateResult });
  const afterOlderLate = controller.getState();
  assert.equal(afterOlderLate.state, "error");
  assert.deepEqual(afterOlderLate.error, { code: "RANGE", field: "systolic", row: null });
  assert.equal(afterOlderLate.result, null);
  assert.equal(afterOlderLate.reportAvailable, false);
});

test("the delivered success result equals the literal core result for its draft", () => {
  const { controller, workers } = setup();
  const draft = { systolic: "118", diastolic: "76" };
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
  controller.edit({ systolic: "118", diastolic: "76" });
  controller.run();
  assert.equal(controller.getState().state, "busy");
  controller.edit({ systolic: "119" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.reportAvailable, false);
  assert.equal(workers[0].terminated, true);
  workers[0].respond({
    ok: true,
    result: run({ systolic: "118", diastolic: "76" }).result,
  });
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
  controller.edit({ systolic: "310", diastolic: "80" });
  controller.run();
  workers[0].respond({
    ok: false,
    error: { code: "RANGE", field: "systolic", row: null },
  });
  assert.equal(controller.getState().state, "error");
  controller.edit({ systolic: "118" });
  const state = controller.getState();
  assert.equal(state.state, "dirty");
  assert.equal(state.error, null);
  assert.equal(state.reportAvailable, false);
});
