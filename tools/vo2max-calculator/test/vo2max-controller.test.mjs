// Controller tests: the three controller fixtures from fixtures.json
// (driven by a fake worker whose completion is controllable), plus
// sequence-isolation, replacement, worker-failure, reset, example and
// draft-persistence cases. Expected states, drafts, sequences and
// status strings are taken verbatim from the fixtures; worker replies
// for the fixture runs are produced by the real core, exactly as the
// page's worker handler produces them.

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/vo2max.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const controllerCases = Object.fromEntries(
  fixtures.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);

function makeFakeWorker() {
  return {
    posted: [],
    terminated: false,
    onmessage: null,
    onerror: null,
    postMessage(message) {
      this.posted.push(message);
    },
    terminate() {
      this.terminated = true;
    },
    deliver(payload) {
      this.onmessage?.({ data: payload });
    },
    fail() {
      this.onerror?.(new Error("boom"));
    },
  };
}

function setup(options = {}) {
  const workers = [];
  const controller = createController({
    createWorker: () => {
      const worker = makeFakeWorker();
      workers.push(worker);
      return worker;
    },
    ...options,
  });
  return { controller, workers };
}

// Deliver the reply the real worker would produce for the draft the
// controller posted to this worker.
function deliverCoreResult(worker) {
  const posted = worker.posted[worker.posted.length - 1];
  worker.deliver({ sequence: posted.sequence, draft: posted.draft, outcome: run(posted.draft) });
}

function checkCheckpoint(state, checkpoint) {
  if ("currentDraft" in checkpoint) assert.deepEqual(state.draft, checkpoint.currentDraft);
  if ("currentSequence" in checkpoint) assert.equal(state.sequence, checkpoint.currentSequence);
  if ("displayed" in checkpoint) assert.deepEqual(state.result, checkpoint.displayed);
  if ("reportDownload" in checkpoint) {
    assert.equal(state.reportAvailable, checkpoint.reportDownload === "available");
  }
  if ("state" in checkpoint) assert.equal(state.state, checkpoint.state);
  if ("statusText" in checkpoint) assert.equal(state.status.zh, checkpoint.statusText);
}

test("fixture state-dirty-error", () => {
  const fixture = controllerCases["state-dirty-error"];
  const { controller, workers } = setup();
  assert.deepEqual(controller.getState().draft, fixture.initialDraft);
  controller.run();
  deliverCoreResult(workers[0]);
  const afterRun = controller.getState();
  assert.deepEqual(afterRun.result, fixture.afterRun.displayed);
  assert.equal(afterRun.reportAvailable, fixture.afterRun.reportDownload === "available");
  assert.equal(afterRun.state, fixture.afterRun.state);
  assert.equal(afterRun.status.en, fixture.afterRun.statusEn);
  assert.equal(afterRun.status.zh, fixture.afterRun.statusZh);
  controller.edit(fixture.edit);
  const afterEdit = controller.getState();
  assert.equal(afterEdit.result, fixture.afterEdit.displayed);
  assert.equal(afterEdit.reportAvailable, fixture.afterEdit.reportDownload === "available");
  assert.equal(afterEdit.state, fixture.afterEdit.state);
  controller.run();
  // The rerun fails local validation, so no second worker is created.
  assert.equal(workers.length, 1);
  const afterRerun = controller.getState();
  assert.equal(afterRerun.result, fixture.afterRerun.displayed);
  assert.equal(afterRerun.reportAvailable, fixture.afterRerun.reportDownload === "available");
  assert.equal(afterRerun.state, fixture.afterRerun.state);
  assert.deepEqual(afterRerun.error, fixture.localOutcome.error);
});

test("fixture state-cancel-late", () => {
  const fixture = controllerCases["state-cancel-late"];
  const { controller, workers } = setup();
  checkCheckpoint(controller.getState(), fixture.checkpoints.afterLoad);
  controller.run();
  checkCheckpoint(controller.getState(), fixture.checkpoints.afterSubmit);
  controller.edit(fixture.edit);
  checkCheckpoint(controller.getState(), fixture.checkpoints.afterEdit);
  // Deliver A's late reply: it must be ignored entirely.
  const firstPosted = workers[0].posted[0];
  workers[0].deliver({
    sequence: firstPosted.sequence,
    draft: firstPosted.draft,
    outcome: fixture.workerOutcome,
  });
  checkCheckpoint(controller.getState(), fixture.checkpoints.afterLateReply);
  controller.run();
  checkCheckpoint(controller.getState(), fixture.checkpoints.afterSecondSubmit);
  deliverCoreResult(workers[1]);
  const afterSecondReply = controller.getState();
  checkCheckpoint(afterSecondReply, fixture.checkpoints.afterSecondReply);
  assert.deepEqual(afterSecondReply.result, fixture.secondWorkerOutcome.result);
});

test("fixture state-replace-late", () => {
  const fixture = controllerCases["state-replace-late"];
  const { controller, workers } = setup();
  checkCheckpoint(controller.getState(), fixture.checkpoints.afterLoad);
  controller.run();
  checkCheckpoint(controller.getState(), fixture.checkpoints.afterOlderSubmit);
  assert.equal(workers.length, 1);
  // Edit to the newer draft, then run it: local validation fails, so
  // the sequence stays at 3 and no second worker is created.
  controller.edit({ distanceMeters: fixture.newerDraft.distanceMeters });
  assert.deepEqual(controller.getState().draft, fixture.newerDraft);
  controller.run();
  assert.equal(workers.length, 1);
  const afterNewerRun = controller.getState();
  checkCheckpoint(afterNewerRun, fixture.checkpoints.afterNewerRun);
  assert.deepEqual(afterNewerRun.error, fixture.newerOutcome.error);
  // Deliver A's late success reply: it must not replace the error.
  const olderPosted = workers[0].posted[0];
  workers[0].deliver({
    sequence: olderPosted.sequence,
    draft: olderPosted.draft,
    outcome: fixture.olderWorkerOutcome,
  });
  const afterOlderReply = controller.getState();
  checkCheckpoint(afterOlderReply, fixture.checkpoints.afterOlderReply);
  assert.deepEqual(afterOlderReply.error, fixture.newerOutcome.error);
});

test("a second run press while submitting is ignored", () => {
  const { controller, workers } = setup();
  controller.run();
  const sequence = controller.getState().sequence;
  controller.run();
  assert.equal(workers.length, 1);
  assert.equal(controller.getState().sequence, sequence);
  assert.equal(controller.getState().state, "submitting");
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
});

test("a reply with a mismatched draft echo is ignored", () => {
  const { controller, workers } = setup();
  controller.run();
  const posted = workers[0].posted[0];
  workers[0].deliver({
    sequence: posted.sequence,
    draft: { ...posted.draft, distanceMeters: "2800" },
    outcome: run({ ...posted.draft, distanceMeters: "2800" }),
  });
  assert.equal(controller.getState().state, "submitting");
  assert.equal(controller.getState().result, null);
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
});

test("edit during submitting terminates the worker, goes dirty, and drops the late reply", () => {
  const { controller, workers } = setup();
  controller.run();
  assert.equal(controller.getState().state, "submitting");
  controller.edit({ distanceMeters: "2800" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.reportAvailable, false);
  assert.equal(workers[0].terminated, true);
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().result, null);
});

test("a worker error becomes unavailable and keeps the draft; a retry can succeed", () => {
  const { controller, workers } = setup();
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "unavailable");
  assert.equal(state.status.zh, "背景計算不可用");
  assert.equal(state.status.en, "Background calculation unavailable");
  assert.deepEqual(state.draft, DEFAULTS);
  assert.equal(state.reportAvailable, false);
  controller.run();
  assert.equal(controller.getState().state, "submitting");
  deliverCoreResult(workers[1]);
  assert.equal(controller.getState().state, "success");
});

test("a createWorker throw becomes unavailable, not a fabricated result", () => {
  const controller = createController({
    createWorker: () => {
      throw new Error("no worker");
    },
  });
  controller.run();
  const state = controller.getState();
  assert.equal(state.state, "unavailable");
  assert.equal(state.result, null);
  assert.equal(state.error, null);
});

test("loadExample fills the example draft and waits for a manual run", () => {
  const { controller, workers } = setup();
  const loaded = controller.loadExample();
  assert.deepEqual(loaded.draft, EXAMPLE);
  assert.equal(loaded.isExample, true);
  assert.equal(loaded.state, "idle");
  assert.equal(loaded.status.zh, "已載入範例");
  controller.run();
  assert.deepEqual(workers[0].posted[0].draft, EXAMPLE);
});

test("reset from success restores defaults byte-for-byte and the idle state", () => {
  const { controller, workers } = setup();
  controller.edit({ distanceMeters: "2800" });
  controller.run();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "success");
  const reset = controller.reset();
  assert.equal(reset.state, "idle");
  assert.deepEqual(reset.draft, DEFAULTS);
  assert.equal(JSON.stringify(reset.draft), JSON.stringify(DEFAULTS));
  assert.equal(reset.reportAvailable, false);
  assert.equal(reset.result, null);
  assert.equal(reset.error, null);
  assert.equal(reset.status.zh, "已重設");
});

test("edit from idle stays idle; edit from error goes dirty and clears the error", () => {
  const { controller, workers } = setup();
  controller.edit({ distanceMeters: "2800" });
  assert.equal(controller.getState().state, "idle");
  controller.edit({ distanceMeters: "10001" });
  controller.run();
  assert.equal(controller.getState().state, "error");
  controller.edit({ distanceMeters: "2800" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.error, null);
});

test("a stored draft is restored on load; a schema-invalid one is discarded", () => {
  const store = new Map();
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
  const first = setup({ storage });
  first.controller.edit({ distanceMeters: "2800", age: "35", sex: "male" });
  const second = setup({ storage });
  assert.deepEqual(second.controller.getState().draft, {
    ...DEFAULTS,
    distanceMeters: "2800",
    age: "35",
    sex: "male",
  });
  assert.equal(second.controller.getState().state, "idle");

  store.set("gloss-tools:vo2max-calculator:draft:v1", '{"test":"cooper12","extra":1}');
  const third = setup({ storage });
  assert.deepEqual(third.controller.getState().draft, DEFAULTS);

  store.set("gloss-tools:vo2max-calculator:draft:v1", "not json at all");
  const fourth = setup({ storage });
  assert.deepEqual(fourth.controller.getState().draft, DEFAULTS);
});

test("destroy invalidates a pending reply", () => {
  const { controller, workers } = setup();
  controller.run();
  controller.destroy();
  deliverCoreResult(workers[0]);
  assert.equal(controller.getState().state, "submitting");
  assert.equal(controller.getState().result, null);
});
