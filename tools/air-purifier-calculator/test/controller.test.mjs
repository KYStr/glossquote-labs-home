// Controller tests. The two fixture flows are the SPEC's literal
// controller fixtures, vendored verbatim in test/fixtures.json (spec
// candidate commit 4e73cb25b91e9f016310f1898de4b610c2c60ff7, draft
// spec PR #383), driven by a fake worker whose completion is
// controllable, in the exact driving order the SPEC's tests section
// prescribes: state-dirty-error runs the initial draft, edits, and
// reruns; state-cancel-late runs, cancels before the reply, injects
// the older generation's lateResult, and resets. Each fixture
// checkpoint (a literal object in the fixture) is asserted against
// the controller's state, result, error, draft, and report
// availability. The success result delivered in state-dirty-error is
// the pinned standard-bedroom core result from the same fixtures
// file. The additional unit tests pin the generation guard, worker
// replacement, and error surfacing.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createController,
  WORKER_ERROR,
} from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/air-purifier.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const controllerCases = Object.fromEntries(
  fixtures.cases
    .filter((entry) => entry.kind === "controller")
    .map((entry) => [entry.id, entry]),
);
assert.equal(Object.keys(controllerCases).length, 2);
const standardResult = fixtures.cases.find(
  (entry) => entry.id === "standard-bedroom",
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
  assert.deepEqual(fixture.expected.afterRun, { reportAvailable: true, state: "success" });
  assert.deepEqual(fixture.expected.afterEdit, { reportAvailable: false, state: "dirty" });
  assert.deepEqual(fixture.expected.afterRerun, {
    error: { code: "RANGE", field: "targetAch", row: null },
    reportAvailable: false,
    state: "error",
  });
  const { controller, workers } = setup();

  controller.edit(fixture.input.initial);
  controller.run();
  workers[0].respond({ ok: true, result: standardResult });
  const afterRun = controller.getState();
  assert.equal(afterRun.state, "success");
  assert.deepEqual(afterRun.result, standardResult);
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
    error: { code: "RANGE", field: "targetAch", row: null },
  });
  workers[1].respond(rerunOutcome);
  const afterRerun = controller.getState();
  assert.equal(afterRerun.state, "error");
  assert.deepEqual(afterRerun.error, { code: "RANGE", field: "targetAch", row: null });
  assert.equal(afterRerun.reportAvailable, false);
});

test("fixture state-cancel-late: cancel invalidates a late success", () => {
  const fixture = controllerCases["state-cancel-late"];
  assert.deepEqual(fixture.expected.whilePending, { reportAvailable: false, state: "busy" });
  assert.deepEqual(fixture.expected.afterCancel, {
    draft: fixture.input.draft,
    reportAvailable: false,
    state: "cancelled",
  });
  assert.deepEqual(fixture.expected.afterLateResult, {
    reportAvailable: false,
    state: "cancelled",
  });
  assert.deepEqual(fixture.expected.afterReset, {
    draft: DEFAULTS,
    reportAvailable: false,
    state: "empty",
  });
  const { controller, workers } = setup();

  controller.edit(fixture.input.draft);
  controller.run();
  assert.equal(controller.getState().state, "busy");
  assert.equal(controller.getState().reportAvailable, false);

  controller.cancel();
  const afterCancel = controller.getState();
  assert.equal(afterCancel.state, "cancelled");
  assert.equal(afterCancel.result, null);
  assert.equal(afterCancel.reportAvailable, false);
  assert.deepEqual(afterCancel.draft, fixture.input.draft);
  assert.equal(workers[0].terminated, true);

  const lateResult = run(fixture.input.draft).result;
  assert.deepEqual(lateResult, fixture.input.lateResult);
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
  controller.edit({ areaValue: "16" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.reportAvailable, false);
  assert.equal(workers[0].terminated, true);
  workers[0].respond({
    ok: true,
    result: run({ ...EXAMPLE }).result,
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
  controller.edit({ ...EXAMPLE, targetAch: "12" });
  controller.run();
  workers[0].respond({
    ok: false,
    error: { code: "RANGE", field: "targetAch", row: null },
  });
  assert.equal(controller.getState().state, "error");
  controller.edit({ targetAch: "5.0" });
  const state = controller.getState();
  assert.equal(state.state, "dirty");
  assert.equal(state.error, null);
  assert.equal(state.reportAvailable, false);
});
