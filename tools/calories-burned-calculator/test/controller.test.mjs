// Controller tests: the three controller fixtures from fixtures.json
// (driven by a controllable scheduler whose delivery is held back on
// demand), plus generation-isolation, replacement, and reset cases.
//
// Step semantics used for the fixture cases (the SPEC names the actions;
// this file defines what each step does, per §4.3):
// - runInitial: set the draft to initialInput, run, deliver the outcome.
// - edit: change one draft field.
// - runAgain: run, deliver the outcome.
// - cancel: cancel the controller (a no-op once the cycle delivered).
// - replace: run a new cycle that replaces the previous one (its
//   delivery is still pending when the late result arrives).
// - deliverLate: invoke the superseded cycle's delivery with the
//   fixture's lateResult; it must be dropped.
// - assertInitial: the last accepted result is still the initial run's
//   result — a late result never replaces visible state, and a re-run
//   with a now-invalid edit shows the new error while the previous
//   result remains the last accepted one.

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULTS, run } from "../public/js/core/calculate.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const controllerCases = Object.fromEntries(
  fixtures.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);

function setup() {
  const deliveries = [];
  const controller = createController({
    schedule: (deliver, snapshot) => {
      deliveries.push({ deliver, snapshot });
    },
  });
  return { controller, deliveries };
}

function initialResult(fixture) {
  const outcome = run(fixture.initialInput);
  assert.equal(outcome.ok, true);
  return outcome.result;
}

// Deliver the pending outcome the real core produces for the snapshot
// the controller posted; returns the delivery's accepted flag.
function deliverCore(deliveries, index = deliveries.length - 1) {
  const { deliver, snapshot } = deliveries[index];
  return deliver(run(snapshot));
}

test("fixture state-dirty-error", () => {
  const fixture = controllerCases["state-dirty-error"];
  const { controller, deliveries } = setup();
  controller.edit(fixture.initialInput);
  controller.run();
  assert.equal(controller.getState().state, "busy");
  assert.equal(deliverCore(deliveries), true);
  const afterRun = controller.getState();
  assert.equal(afterRun.state, "success");
  assert.equal(afterRun.reportAvailable, true);
  assert.deepEqual(afterRun.lastAccepted, { input: fixture.initialInput, result: initialResult(fixture) });

  controller.edit({ weight: "60kg" });
  const afterEdit = controller.getState();
  assert.equal(afterEdit.state, "dirty");
  assert.equal(afterEdit.reportAvailable, false);
  assert.deepEqual(afterEdit.lastAccepted, { input: fixture.initialInput, result: initialResult(fixture) });

  controller.run();
  assert.equal(controller.getState().state, "busy");
  assert.equal(deliverCore(deliveries), true);
  const afterRerun = controller.getState();
  assert.equal(afterRerun.state, "error");
  assert.deepEqual(afterRerun.error, fixture.expectedError);
  assert.equal(afterRerun.reportAvailable, false);
  // assertInitial: the previous result remains the last accepted one.
  assert.deepEqual(afterRerun.lastAccepted, { input: fixture.initialInput, result: initialResult(fixture) });
});

test("fixture state-cancel-late", () => {
  const fixture = controllerCases["state-cancel-late"];
  const { controller, deliveries } = setup();
  controller.edit(fixture.initialInput);
  controller.run();
  assert.equal(deliverCore(deliveries), true);
  assert.equal(controller.getState().state, "success");

  controller.cancel();
  const afterCancel = controller.getState();
  assert.equal(afterCancel.state, "success");
  assert.deepEqual(afterCancel.lastAccepted.result, fixture.lateResult);

  // The already-delivered cycle tries to deliver its result again, late.
  const late = deliveries[0].deliver({ ok: true, result: fixture.lateResult });
  assert.equal(late, false);
  // assertInitial: the visible state is unchanged by the late result.
  const afterLate = controller.getState();
  assert.equal(afterLate.state, "success");
  assert.deepEqual(afterLate.lastAccepted, { input: fixture.initialInput, result: fixture.lateResult });
  assert.equal(afterLate.reportAvailable, true);

  controller.reset();
  const afterReset = controller.getState();
  assert.equal(afterReset.state, "empty");
  assert.deepEqual(afterReset.draft, DEFAULTS);
  assert.equal(afterReset.lastAccepted, null);
  assert.equal(afterReset.reportAvailable, false);
});

test("fixture state-replace-late", () => {
  const fixture = controllerCases["state-replace-late"];
  const { controller, deliveries } = setup();
  controller.edit(fixture.initialInput);
  controller.run();
  assert.equal(deliverCore(deliveries, 0), true);
  assert.equal(controller.getState().state, "success");

  controller.run();
  assert.equal(controller.getState().state, "busy");
  assert.equal(deliveries.length, 2);

  // The superseded first cycle's result arrives late: dropped.
  const late = deliveries[0].deliver({ ok: true, result: fixture.lateResult });
  assert.equal(late, false);
  // assertInitial: the last accepted result is still the initial one,
  // and the newer cycle is still pending.
  const afterLate = controller.getState();
  assert.equal(afterLate.state, "busy");
  assert.deepEqual(afterLate.lastAccepted, { input: fixture.initialInput, result: fixture.lateResult });

  assert.equal(deliverCore(deliveries, 1), true);
  assert.equal(controller.getState().state, "success");
  assert.deepEqual(controller.getState().lastAccepted.result, fixture.lateResult);
});

test("edit during busy cancels the pending cycle and drops its late delivery", () => {
  const { controller, deliveries } = setup();
  controller.edit({ weight: "70", durationMinutes: "60", activities: ["walking-brisk"] });
  controller.run();
  assert.equal(controller.getState().state, "busy");
  controller.edit({ weight: "71" });
  const dirty = controller.getState();
  assert.equal(dirty.state, "dirty");
  assert.equal(dirty.lastAccepted, null);
  assert.equal(deliveries[0].deliver(run(deliveries[0].snapshot)), false);
  assert.equal(controller.getState().state, "dirty");
});

test("cancel during busy keeps the draft and drops the late delivery", () => {
  const { controller, deliveries } = setup();
  controller.edit({ weight: "70", durationMinutes: "60", activities: ["jogging-general"] });
  controller.run();
  controller.cancel();
  const cancelled = controller.getState();
  assert.equal(cancelled.state, "cancelled");
  assert.deepEqual(cancelled.draft, { weight: "70", durationMinutes: "60", activities: ["jogging-general"] });
  assert.equal(cancelled.lastAccepted, null);
  assert.equal(deliveries[0].deliver(run(deliveries[0].snapshot)), false);
  assert.equal(controller.getState().state, "cancelled");
});

test("running while busy replaces the pending cycle; the old delivery is dropped", () => {
  const { controller, deliveries } = setup();
  controller.edit({ weight: "60", durationMinutes: "30", activities: ["walking-moderate"] });
  controller.run();
  controller.run();
  assert.equal(deliveries[0].deliver(run(deliveries[0].snapshot)), false);
  assert.equal(deliverCore(deliveries, 1), true);
  assert.equal(controller.getState().state, "success");
});

test("cancel when not busy is a no-op", () => {
  const { controller } = setup();
  assert.equal(controller.getState().state, "empty");
  controller.cancel();
  assert.equal(controller.getState().state, "empty");
});

test("a delivery is accepted only once: redelivering the same cycle is dropped", () => {
  const { controller, deliveries } = setup();
  controller.run();
  assert.equal(deliverCore(deliveries, 0), true);
  assert.equal(deliveries[0].deliver(run(deliveries[0].snapshot)), false);
  assert.equal(controller.getState().state, "success");
});

test("edit after an error keeps the error until the next run", () => {
  const { controller, deliveries } = setup();
  controller.edit({ weight: "60kg" });
  controller.run();
  assert.equal(deliverCore(deliveries, 0), true);
  assert.equal(controller.getState().state, "error");
  controller.edit({ weight: "61kg" });
  const kept = controller.getState();
  assert.equal(kept.state, "error");
  assert.deepEqual(kept.error, { code: "DECIMAL_FORMAT", field: "weight", row: null });
  controller.edit({ weight: "61" });
  assert.equal(controller.getState().state, "error");
  controller.run();
  assert.equal(deliverCore(deliveries, 1), true);
  assert.equal(controller.getState().state, "success");
});

test("reset from success restores the factory default and empty state", () => {
  const { controller, deliveries } = setup();
  controller.edit({ weight: "80", durationMinutes: "47", activities: ["resistance-training"] });
  controller.run();
  assert.equal(deliverCore(deliveries, 0), true);
  assert.equal(controller.getState().state, "success");
  const reset = controller.reset();
  assert.equal(reset.state, "empty");
  assert.deepEqual(reset.draft, DEFAULTS);
  assert.equal(reset.lastAccepted, null);
  assert.equal(reset.reportAvailable, false);
});

test("edit from empty stays empty; unchanged edits do not change state", () => {
  const { controller } = setup();
  controller.edit({ weight: "60" });
  assert.equal(controller.getState().state, "empty");
  controller.edit({ weight: "60" });
  assert.equal(controller.getState().state, "empty");
  controller.edit({ weight: "70" });
  assert.equal(controller.getState().state, "empty");
  assert.equal(controller.getState().draft.weight, "70");
});

test("default scheduler delivers synchronously: run returns in success or error", () => {
  const sync = createController();
  sync.edit({ weight: "60", durationMinutes: "30", activities: ["walking-moderate"] });
  assert.equal(sync.run().state, "success");
  assert.equal(sync.getState().lastAccepted.result.totalKcal, 114);
  sync.edit({ weight: "bad" });
  assert.equal(sync.run().state, "error");
  assert.deepEqual(sync.getState().error, { code: "DECIMAL_FORMAT", field: "weight", row: null });
  assert.equal(sync.getState().lastAccepted.result.totalKcal, 114);
});
