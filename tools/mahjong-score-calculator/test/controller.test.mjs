// Controller tests: the three controller fixtures from the SPEC
// (vendored verbatim in test/fixtures.json) driven by a fake worker
// whose completion timing the test controls, plus hand-derived
// transition cases. Replies are produced by the real core `run`,
// matching what the fixed worker source computes; the fixture
// expectations themselves are literal.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createController, WORKER_ERROR } from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/mahjong.mjs";

const fixtures = JSON.parse(readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"));
const byId = Object.fromEntries(
  fixtures.cases.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);

function createFakeWorkers() {
  const workers = [];
  function createWorker() {
    const worker = {
      onmessage: null,
      onerror: null,
      posted: [],
      terminated: false,
      postMessage(message) {
        this.posted.push(message);
      },
      terminate() {
        this.terminated = true;
      },
      deliver(data) {
        if (this.onmessage) this.onmessage({ data });
      },
    };
    workers.push(worker);
    return worker;
  }
  return { workers, createWorker };
}

function assertCheckpoint(state, expected) {
  for (const [key, value] of Object.entries(expected)) {
    if (key === "draft") assert.deepEqual(state.draft, value, "draft");
    else if (key === "error") assert.deepEqual(state.error, value, "error");
    else assert.equal(state[key], value, key);
  }
}

function replyWithCore(worker) {
  const message = worker.posted[worker.posted.length - 1];
  const payload = run(message.snapshot);
  worker.deliver({ generation: message.generation, ...payload });
  return message.generation;
}

test("fixture state-dirty-error: edit revokes the result, rerun reports the conflict", () => {
  const entry = byId["state-dirty-error"];
  const { workers, createWorker } = createFakeWorkers();
  const controller = createController({ createWorker });
  controller.edit(entry.input.initial);
  controller.run();
  replyWithCore(workers[0]);
  assertCheckpoint(controller.getState(), entry.expected.afterRun);
  controller.edit(entry.input.edit);
  assertCheckpoint(controller.getState(), entry.expected.afterEdit);
  controller.run();
  replyWithCore(workers[1]);
  assertCheckpoint(controller.getState(), entry.expected.afterRerun);
});

test("fixture state-cancel-late: a late result cannot revive a cancelled run; reset restores defaults", () => {
  const entry = byId["state-cancel-late"];
  const { workers, createWorker } = createFakeWorkers();
  const controller = createController({ createWorker });
  controller.edit(entry.input.draft);
  controller.run();
  assertCheckpoint(controller.getState(), entry.expected.whilePending);
  const generation = workers[0].posted[0].generation;
  controller.cancel();
  assertCheckpoint(controller.getState(), entry.expected.afterCancel);
  workers[0].deliver({ generation, ok: true, result: entry.input.lateResult });
  assertCheckpoint(controller.getState(), entry.expected.afterLateResult);
  controller.reset();
  assertCheckpoint(controller.getState(), entry.expected.afterReset);
  assert.deepEqual(controller.getState().draft, DEFAULTS);
});

test("fixture state-replace-late: an older success cannot replace a newer error", () => {
  const entry = byId["state-replace-late"];
  const { workers, createWorker } = createFakeWorkers();
  const controller = createController({ createWorker });
  controller.edit(entry.input.olderDraft);
  controller.run();
  const olderGeneration = workers[0].posted[0].generation;
  controller.edit(entry.input.newerDraft);
  controller.run();
  replyWithCore(workers[1]);
  assertCheckpoint(controller.getState(), entry.expected.afterNewerResult);
  workers[0].deliver({ generation: olderGeneration, ok: true, result: entry.input.olderLateResult });
  assertCheckpoint(controller.getState(), entry.expected.afterOlderLateResult);
});

test("editing during busy terminates the worker and drops the pending generation", () => {
  const { workers, createWorker } = createFakeWorkers();
  const controller = createController({ createWorker });
  controller.edit(EXAMPLE);
  controller.run();
  const generation = workers[0].posted[0].generation;
  controller.edit({ ...EXAMPLE, base: "200" });
  assert.equal(workers[0].terminated, true);
  assert.equal(controller.getState().state, "dirty");
  workers[0].deliver({ generation, ok: true, result: run(EXAMPLE).result });
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().reportAvailable, false);
});

test("cancel outside busy is a no-op; reset from success returns to the defaults", () => {
  const { workers, createWorker } = createFakeWorkers();
  const controller = createController({ createWorker });
  controller.cancel();
  assert.equal(controller.getState().state, "empty");
  controller.edit(EXAMPLE);
  controller.run();
  replyWithCore(workers[0]);
  assert.equal(controller.getState().state, "success");
  controller.reset();
  const state = controller.getState();
  assert.equal(state.state, "empty");
  assert.deepEqual(state.draft, DEFAULTS);
  assert.equal(state.reportAvailable, false);
});

test("worker construction failure and worker error both surface WORKER_ERROR", () => {
  const failing = createController({
    createWorker() {
      throw new Error("no workers here");
    },
  });
  failing.edit(EXAMPLE);
  failing.run();
  assert.equal(failing.getState().state, "error");
  assert.deepEqual(failing.getState().error, WORKER_ERROR);

  const { workers, createWorker } = createFakeWorkers();
  const controller = createController({ createWorker });
  controller.edit(EXAMPLE);
  controller.run();
  workers[0].onerror(new Error("boom"));
  assert.equal(controller.getState().state, "error");
  assert.deepEqual(controller.getState().error, WORKER_ERROR);
});

test("loadExample fills fixtures case 1 and waits for a manual run", () => {
  const { createWorker } = createFakeWorkers();
  const controller = createController({ createWorker });
  controller.loadExample();
  const state = controller.getState();
  assert.deepEqual(state.draft, EXAMPLE);
  assert.equal(state.isExample, true);
  assert.equal(state.state, "empty");
  assert.equal(state.reportAvailable, false);
});
