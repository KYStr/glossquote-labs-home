import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { DEFAULTS, EXAMPLE } from "../public/js/core/blood.mjs";
import { createController } from "../public/js/controller.mjs";

// Controller fixtures vendored verbatim from the fixed spec source (spec
// candidate 27343e5d448ef476ba11f09697a8c5f9b30a77e0, spec PR #172). Each
// fixture checkpoint pins a subset of the snapshot fields; the assertions
// below compare exactly the pinned fields.
const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const byId = new Map(
  fixtures.cases.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);
const coreById = new Map(
  fixtures.cases.filter((entry) => entry.kind === "core").map((entry) => [entry.id, entry]),
);

function createFakeWorker() {
  return {
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
    deliver(payload) {
      this.onmessage?.({ data: { generation: this.posted.at(-1).generation, ...payload } });
    },
    fail() {
      this.onerror?.(new Error("worker failed"));
    },
  };
}

function setup() {
  const workers = [];
  const controller = createController({
    createWorker: () => {
      const worker = createFakeWorker();
      workers.push(worker);
      return worker;
    },
    onChange: () => {},
  });
  return { controller, workers };
}

function assertCheckpoint(snapshot, expected) {
  assert.equal(snapshot.state, expected.state);
  assert.equal(snapshot.reportAvailable, expected.reportAvailable);
  if (Object.hasOwn(expected, "draft")) assert.deepEqual(snapshot.draft, expected.draft);
  if (Object.hasOwn(expected, "error")) assert.deepEqual(snapshot.error, expected.error);
}

test("controller fixture: state-dirty-error", () => {
  const fixture = byId.get("state-dirty-error");
  const success = coreById.get("single-o-negative-universal-donor").expected.result;
  const { controller, workers } = setup();
  controller.edit(fixture.input.initial);
  controller.run();
  workers[0].deliver({ ok: true, result: success });
  assertCheckpoint(controller.snapshot(), fixture.expected.afterRun);
  controller.edit(fixture.input.edit);
  assertCheckpoint(controller.snapshot(), fixture.expected.afterEdit);
  controller.run();
  workers[1].deliver({ ok: false, error: { code: "ENUM", field: "bloodType", row: null } });
  assertCheckpoint(controller.snapshot(), fixture.expected.afterRerun);
});

test("controller fixture: state-cancel-late", () => {
  const fixture = byId.get("state-cancel-late");
  const { controller, workers } = setup();
  controller.edit(fixture.input.draft);
  controller.run();
  assertCheckpoint(controller.snapshot(), fixture.expected.whilePending);
  controller.cancel();
  assertCheckpoint(controller.snapshot(), fixture.expected.afterCancel);
  assert.equal(workers[0].terminated, true);
  workers[0].deliver({ ok: true, result: fixture.input.lateResult });
  assertCheckpoint(controller.snapshot(), fixture.expected.afterLateResult);
  controller.reset();
  assertCheckpoint(controller.snapshot(), fixture.expected.afterReset);
});

test("controller fixture: state-replace-late", () => {
  const fixture = byId.get("state-replace-late");
  const { controller, workers } = setup();
  controller.edit(fixture.input.olderDraft);
  controller.run();
  controller.edit(fixture.input.newerDraft);
  assert.equal(workers[0].terminated, true);
  assert.equal(controller.snapshot().state, "dirty");
  controller.run();
  workers[1].deliver({ ok: false, error: fixture.expected.afterNewerResult.error });
  assertCheckpoint(controller.snapshot(), fixture.expected.afterNewerResult);
  workers[0].deliver({ ok: true, result: fixture.input.olderLateResult });
  assertCheckpoint(controller.snapshot(), fixture.expected.afterOlderLateResult);
});

test("initial snapshot is the empty single-mode default draft", () => {
  const { controller } = setup();
  const snapshot = controller.snapshot();
  assert.equal(snapshot.state, "empty");
  assert.deepEqual(snapshot.draft, DEFAULTS);
  assert.equal(snapshot.reportAvailable, false);
});

test("switching mode rebuilds the draft in the new mode's shape", () => {
  const { controller } = setup();
  controller.edit({ bloodType: "A-" });
  controller.edit({ mode: "pair" });
  assert.deepEqual(controller.snapshot().draft, { mode: "pair", donor: "", recipient: "" });
  controller.edit({ donor: "B+" });
  controller.edit({ mode: "single" });
  assert.deepEqual(controller.snapshot().draft, { mode: "single", bloodType: "" });
});

test("loadExample fills the example single draft and waits for a manual run", () => {
  const { controller, workers } = setup();
  controller.loadExample();
  const snapshot = controller.snapshot();
  assert.deepEqual(snapshot.draft, EXAMPLE);
  assert.equal(snapshot.isExample, true);
  assert.equal(workers.length, 0);
});

test("a worker error event surfaces WORKER_ERROR", () => {
  const { controller, workers } = setup();
  controller.edit({ bloodType: "O-" });
  controller.run();
  workers[0].fail();
  const snapshot = controller.snapshot();
  assert.equal(snapshot.state, "error");
  assert.deepEqual(snapshot.error, { code: "WORKER_ERROR", field: null, row: null });
});

test("a createWorker failure surfaces WORKER_ERROR without throwing", () => {
  const controller = createController({
    createWorker: () => {
      throw new Error("no worker");
    },
    onChange: () => {},
  });
  controller.run();
  assert.equal(controller.snapshot().state, "error");
  assert.deepEqual(controller.snapshot().error, { code: "WORKER_ERROR", field: null, row: null });
});

test("cancel outside busy is a no-op; reset restores defaults", () => {
  const { controller, workers } = setup();
  controller.cancel();
  assert.equal(controller.snapshot().state, "empty");
  controller.loadExample();
  controller.run();
  workers[0].deliver({ ok: true, result: coreById.get("single-o-negative-universal-donor").expected.result });
  assert.equal(controller.snapshot().state, "success");
  controller.reset();
  const snapshot = controller.snapshot();
  assert.equal(snapshot.state, "empty");
  assert.deepEqual(snapshot.draft, DEFAULTS);
  assert.equal(snapshot.result, null);
});
