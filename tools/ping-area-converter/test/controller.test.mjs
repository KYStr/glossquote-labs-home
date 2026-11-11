// Controller tests. The three fixture flows are the SPEC's literal
// controller fixtures, vendored verbatim in test/fixtures.json
// (spec candidate commit c2c3f7715023990b1427e052a25c52f1987eaca9),
// driven by a fake worker whose completion is controllable, in the
// exact driving order the SPEC's tests section prescribes:
// state-dirty-error runs the initial draft, edits, and reruns;
// state-cancel-late runs, cancels before the reply, injects the
// older generation's lateResult, and resets; state-replace-late
// leaves the older draft pending, starts new work with the newer
// draft, fails the new work, then injects the older generation's
// olderLateResult. Every checkpoint compares state,
// reportAvailable, draft, and error against the fixture's literal
// expected values, and the success result delivered in
// state-dirty-error is the pinned example-thirty-ping core result
// from the same fixtures file. The additional unit tests pin the
// generation guard, worker replacement, and error surfacing.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createController,
  WORKER_ERROR,
} from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/ping-area.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const controllerCases = Object.fromEntries(
  fixtures.cases
    .filter((entry) => entry.kind === "controller")
    .map((entry) => [entry.id, entry]),
);
assert.equal(Object.keys(controllerCases).length, 3);
const exampleResult = fixtures.cases.find(
  (entry) => entry.id === "example-thirty-ping",
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

function assertCheckpoint(controller, expected) {
  const state = controller.getState();
  assert.equal(state.state, expected.state);
  assert.equal(state.reportAvailable, expected.reportAvailable);
  if (expected.draft) assert.deepEqual(state.draft, expected.draft);
  if ("error" in expected) assert.deepEqual(state.error, expected.error);
  return state;
}

test("fixture state-dirty-error: run, edit, rerun", () => {
  const fixture = controllerCases["state-dirty-error"];
  const { controller, workers } = setup();

  controller.edit(fixture.input.initial);
  controller.run();
  workers[0].respond({ ok: true, result: exampleResult });
  const afterRun = assertCheckpoint(controller, fixture.expected.afterRun);
  assert.deepEqual(afterRun.result, exampleResult);

  controller.edit(fixture.input.edit);
  assertCheckpoint(controller, fixture.expected.afterEdit);

  controller.run();
  workers[1].respond({ ok: false, error: fixture.expected.afterRerun.error });
  assertCheckpoint(controller, fixture.expected.afterRerun);
});

test("fixture state-cancel-late: cancel invalidates a late success", () => {
  const fixture = controllerCases["state-cancel-late"];
  const { controller, workers } = setup();

  controller.edit(fixture.input.draft);
  controller.run();
  assertCheckpoint(controller, fixture.expected.whilePending);

  controller.cancel();
  assertCheckpoint(controller, fixture.expected.afterCancel);
  assert.equal(workers[0].terminated, true);

  workers[0].respond({ ok: true, result: fixture.input.lateResult });
  const afterLate = assertCheckpoint(controller, fixture.expected.afterLateResult);
  assert.equal(afterLate.result, null);

  controller.reset();
  assertCheckpoint(controller, fixture.expected.afterReset);
});

test("fixture state-replace-late: newer error stays, older late result ignored", () => {
  const fixture = controllerCases["state-replace-late"];
  const { controller, workers } = setup();

  controller.edit(fixture.input.olderDraft);
  controller.run();
  controller.edit(fixture.input.newerDraft);
  assert.equal(workers[0].terminated, true);
  controller.run();
  workers[1].respond({ ok: false, error: fixture.expected.afterNewerResult.error });
  assertCheckpoint(controller, fixture.expected.afterNewerResult);

  workers[0].respond({ ok: true, result: fixture.input.olderLateResult });
  assertCheckpoint(controller, fixture.expected.afterOlderLateResult);
});

test("the delivered success result equals the literal core result for its draft", () => {
  const { controller, workers } = setup();
  const draft = { amount: "30", unit: "ping" };
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
  controller.edit({ amount: "30", unit: "ping" });
  controller.run();
  assert.equal(controller.getState().state, "busy");
  controller.edit({ amount: "31" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.reportAvailable, false);
  assert.equal(workers[0].terminated, true);
  workers[0].respond({ ok: true, result: run({ amount: "30", unit: "ping" }).result });
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
  controller.edit({ amount: "0", unit: "ping" });
  controller.run();
  workers[0].respond({
    ok: false,
    error: { code: "RANGE", field: "amount", row: null },
  });
  assert.equal(controller.getState().state, "error");
  controller.edit({ amount: "5" });
  const state = controller.getState();
  assert.equal(state.state, "dirty");
  assert.equal(state.error, null);
  assert.equal(state.reportAvailable, false);
});

for (const restart of ["replace", "cancel"]) {
  test("PWP-01: ignores old ping reply while a " + restart + " run is busy", () => {
    const { controller, workers } = setup();
    const newer = { amount: "100", unit: "ping" };
    controller.edit(EXAMPLE);
    controller.run();
    if (restart === "cancel") {
      controller.cancel();
      assert.equal(controller.getState().state, "cancelled");
    }
    controller.edit(newer);
    controller.run();
    const [oldWorker, newWorker] = workers;
    assert.equal(oldWorker.terminated, true);

    oldWorker.respond(run(oldWorker.lastMessage.snapshot));
    const pending = controller.getState();
    assert.equal(pending.state, "busy");
    assert.equal(pending.result, null);
    assert.equal(pending.reportAvailable, false);
    assert.equal(newWorker.terminated, false);

    newWorker.respond(run(newWorker.lastMessage.snapshot));
    const complete = controller.getState();
    assert.equal(complete.state, "success");
    assert.equal(complete.reportAvailable, true);
    assert.deepEqual(complete.result, run(newer).result);
    assert.equal(newWorker.terminated, true);
  });
}
