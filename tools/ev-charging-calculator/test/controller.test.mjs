// Controller tests driven by the vendored SPEC controller fixtures
// (test/fixtures.json, spec candidate 548ffc2efc37072e11080e229d24c281683e7c79)
// with a manually flushed scheduler so settlement timing is controlled.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createController } from "../public/js/core/controller.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const controllerCases = Object.fromEntries(
  fixtures.cases.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);

function createHarness() {
  const queue = [];
  const schedule = (task) => {
    const entry = { task, cancelled: false };
    queue.push(entry);
    return () => {
      entry.cancelled = true;
    };
  };
  const controller = createController({ schedule });
  return {
    controller,
    flush() {
      while (queue.length > 0) {
        const entry = queue.shift();
        if (!entry.cancelled) entry.task();
      }
    },
  };
}

function checkpoint(snapshot) {
  return {
    state: snapshot.state,
    reportAvailable: snapshot.reportAvailable,
    ...(snapshot.error ? { error: snapshot.error } : {}),
    ...(snapshot.draft ? { draft: snapshot.draft } : {}),
  };
}

test("fixture state-dirty-error", () => {
  const entry = controllerCases["state-dirty-error"];
  const { controller, flush } = createHarness();

  controller.edit(entry.input.initial);
  controller.execute();
  flush();
  let snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterRun.state);
  assert.equal(snapshot.reportAvailable, entry.expected.afterRun.reportAvailable);
  assert.deepEqual(snapshot.result, {
    needsCharge: true,
    energyBatteryKwh: "36.00",
    energyWallKwh: "40.00",
    timeMinutes: 343,
    cost: null,
  });

  controller.edit(entry.input.edit);
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterEdit.state);
  assert.equal(snapshot.reportAvailable, entry.expected.afterEdit.reportAvailable);
  assert.equal(snapshot.result, null);

  controller.execute();
  flush();
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterRerun.state);
  assert.equal(snapshot.reportAvailable, entry.expected.afterRerun.reportAvailable);
  assert.deepEqual(snapshot.error, entry.expected.afterRerun.error);
});

test("fixture state-cancel-late", () => {
  const entry = controllerCases["state-cancel-late"];
  const { controller } = createHarness();

  controller.edit(entry.input.draft);
  controller.execute();
  let snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.whilePending.state);
  assert.equal(snapshot.reportAvailable, entry.expected.whilePending.reportAvailable);

  controller.cancel();
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterCancel.state);
  assert.equal(snapshot.reportAvailable, entry.expected.afterCancel.reportAvailable);
  assert.deepEqual(snapshot.draft, entry.expected.afterCancel.draft);

  controller.injectLateResult(entry.input.lateResult);
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterLateResult.state);
  assert.equal(snapshot.reportAvailable, entry.expected.afterLateResult.reportAvailable);
  assert.equal(snapshot.result, null);

  controller.reset();
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterReset.state);
  assert.equal(snapshot.reportAvailable, entry.expected.afterReset.reportAvailable);
  assert.deepEqual(snapshot.draft, entry.expected.afterReset.draft);
});

test("fixture state-replace-late", () => {
  const entry = controllerCases["state-replace-late"];
  const { controller, flush } = createHarness();

  controller.edit(entry.input.olderDraft);
  controller.execute(); // older work stays pending
  controller.edit(entry.input.newerDraft); // editing invalidates the older work
  controller.execute();
  flush(); // newer work settles with its error
  let snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterNewerResult.state);
  assert.equal(snapshot.reportAvailable, entry.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(snapshot.error, entry.expected.afterNewerResult.error);

  controller.injectLateResult(entry.input.olderLateResult);
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterOlderLateResult.state);
  assert.equal(snapshot.reportAvailable, entry.expected.afterOlderLateResult.reportAvailable);
  assert.deepEqual(snapshot.error, entry.expected.afterOlderLateResult.error);
  assert.equal(snapshot.result, null);
});

test("checkpoint helper keeps its documented shape", () => {
  const { controller } = createHarness();
  const snapshot = checkpoint(controller.getSnapshot());
  assert.equal(snapshot.state, "empty");
  assert.equal(snapshot.reportAvailable, false);
});
