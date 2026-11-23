// Controller tests. The three fixture flows are the SPEC's literal
// controller fixtures, vendored verbatim in test/fixtures.json (spec
// candidate commit 5ce91f2f044624b42522398aa51b90d90fcecf10, draft
// spec PR #402), driven by a fake worker whose completion is
// controllable, in the exact driving order the SPEC's tests section
// prescribes: state-dirty-error runs the initial draft, edits, and
// reruns; state-cancel-late runs, cancels before the reply, injects
// the older generation's lateResult, and resets; state-replace-late
// leaves the older draft pending, starts new work with the newer
// draft, fails the new work, then injects the older generation's
// olderLateResult. Each fixture checkpoint is asserted against the
// controller's state, result, error, and report availability. The
// success result delivered in state-dirty-error is the pinned
// typical-household core result from the same fixtures file. The
// additional unit tests pin the generation guard, worker replacement,
// and error surfacing.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createController,
  WORKER_ERROR,
} from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/carbon-footprint.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const controllerCases = Object.fromEntries(
  fixtures.cases
    .filter((entry) => entry.kind === "controller")
    .map((entry) => [entry.id, entry]),
);
assert.equal(Object.keys(controllerCases).length, 3);
const typicalResult = fixtures.cases.find(
  (entry) => entry.id === "typical-household",
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
  workers[0].respond({ ok: true, result: typicalResult });
  const afterRun = controller.getState();
  assert.deepEqual(
    { reportAvailable: afterRun.reportAvailable, state: afterRun.state },
    fixture.expected.afterRun,
  );

  controller.edit(fixture.input.edit);
  const afterEdit = controller.getState();
  assert.deepEqual(
    { reportAvailable: afterEdit.reportAvailable, state: afterEdit.state },
    fixture.expected.afterEdit,
  );

  controller.run();
  const rerunOutcome = run(workers[1].lastMessage.snapshot);
  assert.deepEqual(rerunOutcome, {
    ok: false,
    error: { code: "RANGE", field: "carKmPerYear", row: null },
  });
  workers[1].respond(rerunOutcome);
  const afterRerun = controller.getState();
  assert.deepEqual(
    {
      error: afterRerun.error,
      reportAvailable: afterRerun.reportAvailable,
      state: afterRerun.state,
    },
    fixture.expected.afterRerun,
  );
});

test("fixture state-cancel-late: cancel invalidates a late success", () => {
  const fixture = controllerCases["state-cancel-late"];
  const { controller, workers } = setup();

  controller.edit(fixture.input.draft);
  controller.run();
  assert.deepEqual(
    {
      reportAvailable: controller.getState().reportAvailable,
      state: controller.getState().state,
    },
    fixture.expected.whilePending,
  );

  controller.cancel();
  const afterCancel = controller.getState();
  assert.deepEqual(
    {
      draft: afterCancel.draft,
      reportAvailable: afterCancel.reportAvailable,
      state: afterCancel.state,
    },
    fixture.expected.afterCancel,
  );
  assert.equal(workers[0].terminated, true);

  workers[0].respond({ ok: true, result: fixture.input.lateResult });
  const afterLate = controller.getState();
  assert.deepEqual(
    { reportAvailable: afterLate.reportAvailable, state: afterLate.state },
    fixture.expected.afterLateResult,
  );

  controller.reset();
  const afterReset = controller.getState();
  assert.deepEqual(
    {
      draft: afterReset.draft,
      reportAvailable: afterReset.reportAvailable,
      state: afterReset.state,
    },
    fixture.expected.afterReset,
  );
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
    error: { code: "RANGE", field: "carKmPerYear", row: null },
  });
  workers[1].respond(newerOutcome);
  const afterNewer = controller.getState();
  assert.deepEqual(
    {
      error: afterNewer.error,
      reportAvailable: afterNewer.reportAvailable,
      state: afterNewer.state,
    },
    fixture.expected.afterNewerResult,
  );

  workers[0].respond({ ok: true, result: fixture.input.olderLateResult });
  const afterOlderLate = controller.getState();
  assert.deepEqual(
    {
      error: afterOlderLate.error,
      reportAvailable: afterOlderLate.reportAvailable,
      state: afterOlderLate.state,
    },
    fixture.expected.afterOlderLateResult,
  );
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
  controller.edit({ electricityKwhPerMonth: "301" });
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
  controller.edit({ carKmPerYear: "500001" });
  controller.run();
  workers[0].respond({
    ok: false,
    error: { code: "RANGE", field: "carKmPerYear", row: null },
  });
  assert.equal(controller.getState().state, "error");
  controller.edit({ carKmPerYear: "12000" });
  const state = controller.getState();
  assert.equal(state.state, "dirty");
  assert.equal(state.error, null);
  assert.equal(state.reportAvailable, false);
});
