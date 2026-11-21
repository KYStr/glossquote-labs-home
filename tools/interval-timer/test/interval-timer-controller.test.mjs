// Controller tests for the Interval Timer: every controller fixture
// from test/fixtures.json is replayed against a fake worker whose
// completion is controllable, plus hand-derived checks for worker
// failure. Expected values come from the SPEC fixtures, never from the
// implementation's own output.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createController, WORKER_ERROR } from "../public/js/controller.mjs";
import { run as coreRun } from "../public/js/core/interval-timer.mjs";

const fixtures = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "fixtures.json"), "utf8"),
);
const controllerCases = Object.fromEntries(
  fixtures.cases.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);

function project(state) {
  return {
    state: state.state,
    reportAvailable: state.reportAvailable,
    ...(state.error ? { error: state.error } : {}),
  };
}

class FakeWorker {
  constructor() {
    this.posted = [];
    this.terminated = false;
    this.onmessage = null;
    this.onerror = null;
  }

  postMessage(message) {
    this.posted.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  deliver(outcome) {
    const last = this.posted[this.posted.length - 1];
    this.onmessage?.({ data: { type: "result", sequence: last?.sequence, outcome } });
  }

  fail() {
    this.onerror?.(new Error("worker failed"));
  }
}

function makeController(workers) {
  return createController({
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
  });
}

describe("controller: SPEC fixtures", () => {
  it("state-dirty-error", () => {
    const entry = controllerCases["state-dirty-error"];
    const workers = [];
    const controller = makeController(workers);
    controller.edit(entry.input.initial);
    controller.run();
    assert.equal(workers.length, 1);
    workers[0].deliver(coreRun(entry.input.initial));
    assert.deepEqual(project(controller.getPublicState()), entry.expected.afterRun);
    controller.edit(entry.input.edit);
    assert.deepEqual(project(controller.getPublicState()), entry.expected.afterEdit);
    controller.run();
    assert.deepEqual(project(controller.getPublicState()), entry.expected.afterRerun);
  });

  it("state-cancel-late", () => {
    const entry = controllerCases["state-cancel-late"];
    const workers = [];
    const controller = makeController(workers);
    controller.edit(entry.input.draft);
    controller.run();
    assert.deepEqual(project(controller.getPublicState()), entry.expected.whilePending);
    controller.cancel();
    const afterCancel = controller.getPublicState();
    assert.deepEqual(
      { state: afterCancel.state, reportAvailable: afterCancel.reportAvailable },
      { state: entry.expected.afterCancel.state, reportAvailable: entry.expected.afterCancel.reportAvailable },
    );
    assert.deepEqual(afterCancel.draft, entry.expected.afterCancel.draft);
    workers[0].deliver({ ok: true, result: entry.input.lateResult });
    assert.deepEqual(project(controller.getPublicState()), entry.expected.afterLateResult);
    const afterReset = controller.reset();
    assert.deepEqual(
      { state: afterReset.state, reportAvailable: afterReset.reportAvailable },
      { state: entry.expected.afterReset.state, reportAvailable: entry.expected.afterReset.reportAvailable },
    );
    assert.deepEqual(afterReset.draft, entry.expected.afterReset.draft);
  });

  it("state-replace-late", () => {
    const entry = controllerCases["state-replace-late"];
    const workers = [];
    const controller = makeController(workers);
    controller.edit(entry.input.olderDraft);
    controller.run();
    assert.equal(workers.length, 1);
    const olderWorker = workers[0];
    controller.edit(entry.input.newerDraft);
    controller.run();
    assert.deepEqual(project(controller.getPublicState()), entry.expected.afterNewerResult);
    // The older worker's late success must not revive the error state.
    olderWorker.deliver({ ok: true, result: entry.input.olderLateResult });
    assert.deepEqual(project(controller.getPublicState()), entry.expected.afterOlderLateResult);
  });
});

describe("controller: hand-derived worker failure", () => {
  const draft = {
    prepareSeconds: "10",
    workSeconds: "30",
    restSeconds: "10",
    rounds: "8",
    finalRest: "skip",
  };

  it("a worker that cannot be created goes to error with WORKER_ERROR", () => {
    const controller = createController({
      createWorker: () => {
        throw new Error("no worker");
      },
    });
    controller.edit(draft);
    const state = controller.run();
    assert.equal(state.state, "error");
    assert.deepEqual(state.error, WORKER_ERROR);
    assert.deepEqual(state.draft, draft);
  });

  it("a worker error event goes to error with WORKER_ERROR and keeps the draft", () => {
    const workers = [];
    const controller = makeController(workers);
    controller.edit(draft);
    controller.run();
    workers[0].fail();
    const state = controller.getPublicState();
    assert.equal(state.state, "error");
    assert.deepEqual(state.error, WORKER_ERROR);
    assert.deepEqual(state.draft, draft);
    assert.equal(state.reportAvailable, false);
  });

  it("cancel while not busy is a no-op; reset restores defaults", () => {
    const workers = [];
    const controller = makeController(workers);
    assert.equal(controller.cancel().state, "empty");
    controller.edit(draft);
    controller.run();
    workers[0].deliver(coreRun(draft));
    assert.equal(controller.getPublicState().state, "success");
    assert.equal(controller.cancel().state, "success");
    const reset = controller.reset();
    assert.equal(reset.state, "empty");
    assert.deepEqual(reset.draft, {
      prepareSeconds: "10",
      workSeconds: "30",
      restSeconds: "10",
      rounds: "8",
      finalRest: "skip",
    });
  });

  it("loadExample fills the tabata draft and waits for a manual run", () => {
    const workers = [];
    const controller = makeController(workers);
    const state = controller.loadExample();
    assert.equal(state.state, "dirty");
    assert.deepEqual(state.draft, {
      prepareSeconds: "10",
      workSeconds: "20",
      restSeconds: "10",
      rounds: "8",
      finalRest: "skip",
    });
    assert.equal(workers.length, 0);
  });
});
