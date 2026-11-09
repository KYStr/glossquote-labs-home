// Controller tests. The worker is a fake with controllable completion
// time, exactly as the SPEC's state cases prescribe. Expected values
// come from the fixed spec fixtures (vendored verbatim in fixtures.mjs).

import assert from "node:assert/strict";
import { test } from "node:test";
import { createController } from "../public/js/controller.mjs";
import { run } from "../public/js/core/zodiac.mjs";
import { FIXTURES } from "./fixtures.mjs";

const byId = new Map(FIXTURES.cases.map((c) => [c.id, c]));

/** A worker whose replies the test delivers by hand. */
class FakeWorker {
  constructor() {
    this.posted = [];
    this.terminated = false;
    this.onmessage = null;
    this.onerror = null;
  }

  postMessage(message) {
    if (this.terminated) throw new Error("postMessage after terminate");
    this.posted.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  /** Deliver a reply as if the worker had finished. */
  deliver(message) {
    if (!this.terminated && typeof this.onmessage === "function") {
      this.onmessage({ data: message });
    }
  }

  /**
   * Deliver a reply even after terminate(), simulating a message that
   * was already in flight when the worker was terminated. This is the
   * case the controller's generation guard must catch.
   */
  deliverRaw(message) {
    if (typeof this.onmessage === "function") {
      this.onmessage({ data: message });
    }
  }

  fail() {
    if (!this.terminated && typeof this.onerror === "function") {
      this.onerror(new Error("worker failed"));
    }
  }
}

/** Factory that records every worker it creates. */
function factory() {
  const workers = [];
  return {
    workers,
    createWorker() {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
  };
}

function outcomeFor(draft) {
  return run(draft);
}

test("fixture state-dirty-error", () => {
  const fixture = byId.get("state-dirty-error");
  const { createWorker, workers } = factory();
  const controller = createController({ createWorker });

  controller.loadExample(fixture.input.initial);
  controller.run();
  let worker = workers.at(-1);
  assert.equal(worker.posted.length, 1);
  const first = controller.getState();
  assert.equal(first.state, "busy");
  worker.deliver({
    generation: worker.posted[0].generation,
    outcome: outcomeFor(fixture.input.initial),
  });
  let state = controller.getState();
  assert.equal(state.state, fixture.expected.afterRun.state);
  assert.equal(state.reportAvailable, fixture.expected.afterRun.reportAvailable);
  assert.notEqual(controller.getReport(), null);

  controller.setDraft(fixture.input.edit);
  state = controller.getState();
  assert.equal(state.state, fixture.expected.afterEdit.state);
  assert.equal(state.reportAvailable, fixture.expected.afterEdit.reportAvailable);
  assert.equal(controller.getReport(), null);

  controller.run();
  worker = workers.at(-1);
  worker.deliver({
    generation: worker.posted[0].generation,
    outcome: outcomeFor(fixture.input.edit),
  });
  state = controller.getState();
  assert.equal(state.state, fixture.expected.afterRerun.state);
  assert.deepEqual(state.error, fixture.expected.afterRerun.error);
  assert.equal(state.reportAvailable, fixture.expected.afterRerun.reportAvailable);
});

test("fixture state-cancel-late", () => {
  const fixture = byId.get("state-cancel-late");
  const { createWorker, workers } = factory();
  const controller = createController({ createWorker });

  controller.loadExample(fixture.input.draft);
  controller.run();
  const worker = workers.at(-1);
  const generation = worker.posted[0].generation;
  let state = controller.getState();
  assert.equal(state.state, fixture.expected.whilePending.state);
  assert.equal(state.reportAvailable, fixture.expected.whilePending.reportAvailable);

  controller.cancel();
  state = controller.getState();
  assert.equal(state.state, fixture.expected.afterCancel.state);
  assert.deepEqual(state.draft, fixture.expected.afterCancel.draft);
  assert.equal(state.reportAvailable, fixture.expected.afterCancel.reportAvailable);
  assert.equal(worker.terminated, true);

  // The late success from the cancelled generation must not revive.
  worker.deliverRaw({
    generation,
    outcome: { ok: true, result: fixture.input.lateResult },
  });
  state = controller.getState();
  assert.equal(state.state, fixture.expected.afterLateResult.state);
  assert.equal(state.reportAvailable, fixture.expected.afterLateResult.reportAvailable);
  assert.equal(state.result, null);

  controller.reset();
  state = controller.getState();
  assert.equal(state.state, fixture.expected.afterReset.state);
  assert.deepEqual(state.draft, fixture.expected.afterReset.draft);
  assert.equal(state.reportAvailable, fixture.expected.afterReset.reportAvailable);
});

test("fixture state-replace-late", () => {
  const fixture = byId.get("state-replace-late");
  const { createWorker, workers } = factory();
  const controller = createController({ createWorker });

  controller.loadExample(fixture.input.olderDraft);
  controller.run();
  const olderWorker = workers.at(-1);
  const olderGeneration = olderWorker.posted[0].generation;

  // Replace with a newer draft while the older work is still pending,
  // then run it and let it fail.
  controller.setDraft(fixture.input.newerDraft);
  assert.equal(olderWorker.terminated, true);
  controller.run();
  const newerWorker = workers.at(-1);
  newerWorker.deliver({
    generation: newerWorker.posted[0].generation,
    outcome: outcomeFor(fixture.input.newerDraft),
  });
  let state = controller.getState();
  assert.equal(state.state, fixture.expected.afterNewerResult.state);
  assert.deepEqual(state.error, fixture.expected.afterNewerResult.error);
  assert.equal(state.reportAvailable, fixture.expected.afterNewerResult.reportAvailable);

  // The older generation's late success must not replace the error.
  olderWorker.deliverRaw({
    generation: olderGeneration,
    outcome: { ok: true, result: fixture.input.olderLateResult },
  });
  state = controller.getState();
  assert.equal(state.state, fixture.expected.afterOlderLateResult.state);
  assert.deepEqual(state.error, fixture.expected.afterOlderLateResult.error);
  assert.equal(
    state.reportAvailable,
    fixture.expected.afterOlderLateResult.reportAvailable,
  );
});

test("worker creation failure and worker error both yield WORKER_ERROR", () => {
  const throwing = createController({
    createWorker() {
      throw new Error("no workers here");
    },
  });
  throwing.loadExample({ month: "12", day: "25", year: "" });
  throwing.run();
  let state = throwing.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });

  const { createWorker, workers } = factory();
  const controller = createController({ createWorker });
  controller.loadExample({ month: "12", day: "25", year: "" });
  controller.run();
  workers.at(-1).fail();
  state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
});

test("editing during busy stops the worker and moves to dirty", () => {
  const { createWorker, workers } = factory();
  const controller = createController({ createWorker });
  controller.loadExample({ month: "12", day: "25", year: "" });
  controller.run();
  const worker = workers.at(-1);
  controller.setDraft({ month: "1", day: "10", year: "" });
  const state = controller.getState();
  assert.equal(state.state, "dirty");
  assert.equal(worker.terminated, true);
  // A reply already in flight from that worker changes nothing.
  worker.deliverRaw({
    generation: worker.posted[0].generation,
    outcome: outcomeFor({ month: "12", day: "25", year: "" }),
  });
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().result, null);
});

test("cancel outside busy is a no-op; reset restores the default draft", () => {
  const { createWorker } = factory();
  const controller = createController({ createWorker });
  assert.equal(controller.cancel().state, "empty");
  controller.loadExample({ month: "3", day: "21", year: "" });
  const state = controller.reset();
  assert.equal(state.state, "empty");
  assert.deepEqual(state.draft, { month: "", day: "", year: "" });
  assert.equal(state.reportAvailable, false);
});
