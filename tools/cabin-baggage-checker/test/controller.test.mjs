// Controller tests for the Cabin Baggage Checker. The three fixture
// cases are replayed from test/fixtures.json (vendored verbatim from
// spec candidate commit 92a5d5d91e84796517238b33f189365bf98c3853)
// against a fake worker whose completion the test controls. A normal
// delivery computes the real core outcome for the snapshot the worker
// actually received — exactly what the production worker does — while
// a "late" delivery posts the fixture's pinned late result after the
// controller has moved on. Each fixture checkpoint ({state,
// reportAvailable} plus error/draft where pinned) is compared exactly.
// The extra cases cover the remaining SPEC states the fixtures do not
// pin: editing during busy revokes the run, re-running from success
// replaces the result, loadExample during busy terminates the worker,
// and a worker that cannot be constructed fails as WORKER_ERROR.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { run } from "../public/js/core/baggage.mjs";
import { createController } from "../public/js/controller.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const controllerCases = fixtures.cases.filter((entry) => entry.kind === "controller");
assert.equal(controllerCases.length, 3);
const fixtureById = new Map(controllerCases.map((entry) => [entry.id, entry]));

function makeController(options = {}) {
  const workers = [];
  const controller = createController({
    createWorker: () => {
      if (options.failCreate === true) throw new Error("cannot construct");
      const worker = {
        posted: null,
        onmessage: null,
        onerror: null,
        terminated: false,
        postMessage(message) {
          this.posted = message;
        },
        terminate() {
          this.terminated = true;
        },
      };
      workers.push(worker);
      return worker;
    },
  });
  return { controller, workers };
}

// Deliver the real core outcome for the snapshot this worker received,
// mirroring the production worker handler.
function deliverOutcome(worker) {
  assert.notEqual(worker.posted, null, "worker never received a message");
  const outcome = run(worker.posted.snapshot);
  worker.onmessage({ data: { generation: worker.posted.generation, ...outcome } });
}

// Deliver a pinned result as a late success for this worker's run.
function deliverResult(worker, result) {
  assert.notEqual(worker.posted, null, "worker never received a message");
  worker.onmessage({ data: { generation: worker.posted.generation, ok: true, result } });
}

// Assert the controller's public state matches a fixture checkpoint
// exactly on every key the checkpoint pins.
function assertCheckpoint(controller, checkpoint) {
  const state = controller.getState();
  const subset = {};
  for (const key of Object.keys(checkpoint)) subset[key] = state[key];
  assert.deepEqual(subset, checkpoint);
}

test("fixture state-dirty-error", () => {
  const fixture = fixtureById.get("state-dirty-error");
  const { initial, edit } = fixture.input;
  const { controller, workers } = makeController();

  controller.edit(initial);
  controller.run();
  assert.equal(workers.length, 1);
  assert.deepEqual(workers[0].posted.snapshot, initial);

  deliverOutcome(workers[0]);
  assertCheckpoint(controller, fixture.expected.afterRun);
  assert.deepEqual(controller.getState().result, run(initial).result);

  controller.edit(edit);
  assertCheckpoint(controller, fixture.expected.afterEdit);
  assert.equal(controller.getState().result, null);

  controller.run();
  assert.equal(workers.length, 2);
  deliverOutcome(workers[1]);
  assertCheckpoint(controller, fixture.expected.afterRerun);
});

test("fixture state-cancel-late", () => {
  const fixture = fixtureById.get("state-cancel-late");
  const { draft, lateResult } = fixture.input;
  const { controller, workers } = makeController();

  controller.edit(draft);
  controller.run();
  assertCheckpoint(controller, fixture.expected.whilePending);

  controller.cancel();
  assert.equal(workers[0].terminated, true);
  assertCheckpoint(controller, fixture.expected.afterCancel);

  deliverResult(workers[0], lateResult);
  assertCheckpoint(controller, fixture.expected.afterLateResult);
  assert.equal(controller.getState().result, null);

  controller.reset();
  assertCheckpoint(controller, fixture.expected.afterReset);
});

test("fixture state-replace-late", () => {
  const fixture = fixtureById.get("state-replace-late");
  const { olderDraft, newerDraft, olderLateResult } = fixture.input;
  const { controller, workers } = makeController();

  controller.edit(olderDraft);
  controller.run();
  controller.edit(newerDraft);
  assert.equal(controller.getState().state, "dirty");
  assert.equal(workers[0].terminated, true);
  controller.run();
  assert.equal(workers.length, 2);

  deliverOutcome(workers[1]);
  assertCheckpoint(controller, fixture.expected.afterNewerResult);

  deliverResult(workers[0], olderLateResult);
  assertCheckpoint(controller, fixture.expected.afterOlderLateResult);
  assert.equal(controller.getState().result, null);
});

const VALID_DRAFT = {
  bagLength: "55",
  bagWidth: "35",
  bagHeight: "22",
  bagWeightKg: "6.5",
  personalLength: "",
  personalWidth: "",
  personalHeight: "",
  personalWeightKg: "",
  airlines: ["eva"],
};

test("editing during busy terminates the worker and goes dirty", () => {
  const { controller, workers } = makeController();
  controller.edit(VALID_DRAFT);
  controller.run();
  controller.edit({ bagWeightKg: "7.5" });
  const state = controller.getState();
  assert.equal(state.state, "dirty");
  assert.equal(state.draft.bagWeightKg, "7.5");
  assert.equal(workers[0].terminated, true);
  deliverResult(workers[0], { summary: {} });
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().result, null);
});

test("re-running from success replaces the result", () => {
  const { controller, workers } = makeController();
  controller.edit(VALID_DRAFT);
  controller.run();
  deliverResult(workers[0], { marker: "first" });
  assert.equal(controller.getState().state, "success");
  controller.run();
  assert.equal(controller.getState().state, "busy");
  assert.equal(controller.getState().result, null);
  deliverResult(workers[1], { marker: "second" });
  assert.deepEqual(controller.getState().result, { marker: "second" });
});

test("loadExample during busy terminates the worker and marks the example", () => {
  const { controller, workers } = makeController();
  controller.edit(VALID_DRAFT);
  controller.run();
  controller.loadExample();
  const state = controller.getState();
  assert.equal(state.state, "dirty");
  assert.equal(state.isExample, true);
  assert.equal(workers[0].terminated, true);
});

test("a worker construction failure is WORKER_ERROR", () => {
  const { controller } = makeController({ failCreate: true });
  controller.edit(VALID_DRAFT);
  controller.run();
  assert.deepEqual(controller.getState(), {
    state: "error",
    draft: VALID_DRAFT,
    isExample: false,
    result: null,
    error: { code: "WORKER_ERROR", field: null, row: null },
    reportAvailable: false,
  });
});

test("a worker onerror during busy is WORKER_ERROR", () => {
  const { controller, workers } = makeController();
  controller.edit(VALID_DRAFT);
  controller.run();
  workers[0].onerror(new Error("boom"));
  assert.equal(controller.getState().state, "error");
  assert.deepEqual(controller.getState().error, {
    code: "WORKER_ERROR",
    field: null,
    row: null,
  });
});

test("cancel outside busy is a no-op that keeps the state", () => {
  const { controller } = makeController();
  controller.cancel();
  assert.equal(controller.getState().state, "empty");
});
