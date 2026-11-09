// Controller tests. The worker is a fake with controllable completion
// time, exactly as the SPEC's state cases prescribe. Expected values come
// from docs/specs/semver-precedence/fixtures.json.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createController } from "../public/js/controller.mjs";
import { run } from "../public/js/core/semver.mjs";

const TOOL_ROOT = fileURLToPath(new URL("..", import.meta.url));
const fixtures = JSON.parse(
  await readFile(`${TOOL_ROOT}/../../docs/specs/semver-precedence/fixtures.json`, "utf8"),
);
const byId = new Map(fixtures.cases.map((c) => [c.id, c]));

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

  controller.setDraft(fixture.input.initial);
  controller.run();
  assert.equal(workers.length, 1);
  const first = workers[0];
  assert.equal(first.posted.length, 1);
  assert.equal(first.posted[0].generation, 1);
  first.deliver({ generation: 1, outcome: outcomeFor(fixture.input.initial) });
  const afterRun = controller.getState();
  assert.deepEqual(
    {
      state: afterRun.state,
      reportAvailable: afterRun.reportAvailable,
    },
    fixture.expected.afterRun,
  );
  assert.equal(controller.getReport().endsWith("\n"), true);

  controller.setDraft(fixture.input.edit);
  const afterEdit = controller.getState();
  assert.deepEqual(
    {
      state: afterEdit.state,
      reportAvailable: afterEdit.reportAvailable,
    },
    fixture.expected.afterEdit,
  );
  assert.equal(controller.getReport(), null);

  controller.run();
  assert.equal(workers.length, 2);
  workers[1].deliver({ generation: 2, outcome: outcomeFor(fixture.input.edit) });
  const afterRerun = controller.getState();
  assert.deepEqual(
    {
      state: afterRerun.state,
      reportAvailable: afterRerun.reportAvailable,
      error: afterRerun.error,
    },
    fixture.expected.afterRerun,
  );
});

test("fixture state-cancel-late", () => {
  const fixture = byId.get("state-cancel-late");
  const { createWorker, workers } = factory();
  const controller = createController({ createWorker });

  controller.setDraft(fixture.input.draft);
  controller.run();
  const whilePending = controller.getState();
  assert.deepEqual(
    {
      state: whilePending.state,
      reportAvailable: whilePending.reportAvailable,
    },
    fixture.expected.whilePending,
  );

  controller.cancel();
  const afterCancel = controller.getState();
  assert.deepEqual(
    {
      state: afterCancel.state,
      reportAvailable: afterCancel.reportAvailable,
      draft: afterCancel.draft,
    },
    fixture.expected.afterCancel,
  );

  // The late reply from the cancelled generation must not revive a
  // result, even if its message was already in flight.
  workers[0].deliverRaw({
    generation: 1,
    outcome: { ok: true, result: fixture.input.lateResult },
  });
  const afterLateResult = controller.getState();
  assert.deepEqual(
    {
      state: afterLateResult.state,
      reportAvailable: afterLateResult.reportAvailable,
    },
    fixture.expected.afterLateResult,
  );

  controller.reset();
  const afterReset = controller.getState();
  assert.deepEqual(
    {
      state: afterReset.state,
      reportAvailable: afterReset.reportAvailable,
      draft: afterReset.draft,
    },
    fixture.expected.afterReset,
  );
});

test("fixture state-replace-late", () => {
  const fixture = byId.get("state-replace-late");
  const { createWorker, workers } = factory();
  const controller = createController({ createWorker });

  controller.setDraft(fixture.input.olderDraft);
  controller.run();
  assert.equal(workers[0].terminated, false);

  controller.setDraft(fixture.input.newerDraft);
  // Editing terminates the older work and revokes its (absent) result.
  assert.equal(workers[0].terminated, true);
  assert.equal(controller.getState().state, "dirty");

  controller.run();
  assert.equal(workers.length, 2);
  workers[1].deliver({ generation: 2, outcome: outcomeFor(fixture.input.newerDraft) });
  const afterNewerResult = controller.getState();
  assert.deepEqual(
    {
      state: afterNewerResult.state,
      reportAvailable: afterNewerResult.reportAvailable,
      error: afterNewerResult.error,
    },
    fixture.expected.afterNewerResult,
  );

  // The older generation's late success must not overwrite the error,
  // even if its message was already in flight when the worker stopped.
  workers[0].deliverRaw({
    generation: 1,
    outcome: { ok: true, result: fixture.input.olderLateResult },
  });
  const afterOlderLateResult = controller.getState();
  assert.deepEqual(
    {
      state: afterOlderLateResult.state,
      reportAvailable: afterOlderLateResult.reportAvailable,
      error: afterOlderLateResult.error,
    },
    fixture.expected.afterOlderLateResult,
  );
});

test("starting a new run while busy replaces the old work", () => {
  const { createWorker, workers } = factory();
  const controller = createController({ createWorker });
  controller.setDraft({ left: "1.0.0-rc.10", right: "1.0.0-rc.2" });
  controller.run();
  controller.run();
  assert.equal(workers.length, 2);
  assert.equal(workers[0].terminated, true);
  assert.equal(workers[1].posted[0].generation, 2);
  // A reply for the superseded generation is ignored even while busy,
  // including one that was already in flight when the worker stopped.
  workers[0].deliverRaw({
    generation: 1,
    outcome: { ok: true, result: { relation: "gt", reason: { kind: "prerelease-number", index: 2 } } },
  });
  assert.equal(controller.getState().state, "busy");
  workers[1].deliver({
    generation: 2,
    outcome: outcomeFor({ left: "1.0.0-rc.10", right: "1.0.0-rc.2" }),
  });
  assert.equal(controller.getState().state, "success");
  assert.equal(controller.getState().result.relation, "gt");
});

test("editing while busy terminates the worker and goes dirty", () => {
  const { createWorker, workers } = factory();
  const controller = createController({ createWorker });
  controller.setDraft({ left: "1.0.0", right: "2.0.0" });
  controller.run();
  controller.setDraft({ left: "1.0.0", right: "3.0.0" });
  assert.equal(workers[0].terminated, true);
  assert.equal(controller.getState().state, "dirty");
  assert.equal(controller.getState().reportAvailable, false);
});

test("loadExample fills the draft and waits for a manual run", () => {
  const { createWorker, workers } = factory();
  const controller = createController({ createWorker });
  controller.loadExample({ left: "1.0.0-rc.10", right: "1.0.0-rc.2" });
  const state = controller.getState();
  assert.deepEqual(state.draft, { left: "1.0.0-rc.10", right: "1.0.0-rc.2" });
  assert.equal(state.state, "dirty");
  assert.equal(workers.length, 0);
  assert.equal(state.reportAvailable, false);
});

test("worker failure keeps the draft and reports WORKER_ERROR", () => {
  const { createWorker, workers } = factory();
  const controller = createController({ createWorker });
  controller.setDraft({ left: "1.0.0", right: "2.0.0" });
  controller.run();
  workers[0].fail();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.deepEqual(state.draft, { left: "1.0.0", right: "2.0.0" });
  assert.equal(state.reportAvailable, false);
  // Retry works after a worker failure.
  controller.run();
  assert.equal(workers.length, 2);
  workers[1].deliver({ generation: 2, outcome: outcomeFor({ left: "1.0.0", right: "2.0.0" }) });
  assert.equal(controller.getState().state, "success");
});

test("createWorker throwing keeps the draft and reports WORKER_ERROR", () => {
  const controller = createController({
    createWorker() {
      throw new Error("no workers here");
    },
  });
  controller.setDraft({ left: "1.0.0", right: "2.0.0" });
  controller.run();
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.deepEqual(state.draft, { left: "1.0.0", right: "2.0.0" });
});

test("cancel and reset are no-ops outside busy; reset restores defaults", () => {
  const { createWorker } = factory();
  const controller = createController({ createWorker });
  controller.cancel();
  assert.equal(controller.getState().state, "empty");
  controller.setDraft({ left: "1.0.0", right: "2.0.0" });
  controller.reset();
  assert.deepEqual(controller.getState(), {
    state: "empty",
    draft: { left: "", right: "" },
    result: null,
    error: null,
    reportAvailable: false,
  });
});

test("running empty drafts yields the EMPTY field error", () => {
  const { createWorker, workers } = factory();
  const controller = createController({ createWorker });
  controller.run();
  workers[0].deliver({ generation: 1, outcome: outcomeFor({ left: "", right: "" }) });
  const state = controller.getState();
  assert.equal(state.state, "error");
  assert.deepEqual(state.error, { code: "EMPTY", field: "left", row: null });
});

test("onChange listeners receive snapshots and can unsubscribe", () => {
  const { createWorker, workers } = factory();
  const controller = createController({ createWorker });
  const seen = [];
  const unsubscribe = controller.onChange((state) => seen.push(state.state));
  controller.setDraft({ left: "1.0.0", right: "2.0.0" });
  controller.run();
  workers[0].deliver({ generation: 1, outcome: outcomeFor({ left: "1.0.0", right: "2.0.0" }) });
  unsubscribe();
  controller.reset();
  assert.deepEqual(seen, ["empty", "busy", "success"]);
});
