// Controller tests: the 3 literal controller cases from the fixed
// spec's fixtures.json (vendored verbatim at test/fixtures.json from
// spec candidate b68311b57e79ddbbae922a0672b4bd8fe299ba3a) replayed
// against a fake executor, plus the generic flow-state contract
// (example, reset, report gating, worker failure). The fake executor
// delivers payloads produced by the real core for the current draft,
// or a fixture's pinned late result where the fixture supplies one.

import assert from "node:assert/strict";
import test from "node:test";

import { createController } from "../public/js/controller.mjs";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/zodiac.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

function fixture(id) {
  return fixtures.cases.find((entry) => entry.id === id);
}

function createFakeExecutor() {
  const calls = [];
  const execute = (snapshot, callbacks) => {
    const call = { snapshot, callbacks, cancelled: false };
    calls.push(call);
    return {
      cancel() {
        call.cancelled = true;
      },
    };
  };
  return { execute, calls };
}

function createRig() {
  const fake = createFakeExecutor();
  const snapshots = [];
  const controller = createController({
    execute: fake.execute,
    onChange: (snapshot) => snapshots.push(snapshot),
  });
  return { fake, controller, snapshots };
}

function setDraft(controller, draft) {
  controller.setField("birthDate", draft.birthDate);
  controller.setField("asOfDate", draft.asOfDate);
}

test("fixture state-dirty-error: run, edit, rerun into the pinned error", () => {
  const entry = fixture("state-dirty-error");
  const { fake, controller } = createRig();
  setDraft(controller, entry.input.initial);
  controller.run();
  assert.equal(controller.getSnapshot().state, "busy");
  fake.calls[0].callbacks.onResult(run(entry.input.initial));
  let snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterRun.state);
  assert.equal(snapshot.reportAvailable, entry.expected.afterRun.reportAvailable);
  controller.setField("birthDate", entry.input.edit.birthDate);
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterEdit.state);
  assert.equal(snapshot.reportAvailable, entry.expected.afterEdit.reportAvailable);
  controller.run();
  fake.calls[1].callbacks.onResult(run(controller.getSnapshot().draft));
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterRerun.state);
  assert.equal(snapshot.reportAvailable, entry.expected.afterRerun.reportAvailable);
  assert.deepEqual(snapshot.draft, { ...entry.input.initial, ...entry.input.edit });
  assert.deepEqual(snapshot.error, entry.expected.afterRerun.error);
});

test("fixture state-cancel-late: a late result never revives a cancelled run", () => {
  const entry = fixture("state-cancel-late");
  const { fake, controller } = createRig();
  setDraft(controller, entry.input.draft);
  controller.run();
  let snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.whilePending.state);
  controller.cancel();
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterCancel.state);
  assert.deepEqual(snapshot.draft, entry.expected.afterCancel.draft);
  assert.equal(fake.calls[0].cancelled, true);
  fake.calls[0].callbacks.onResult({ ok: true, result: entry.input.lateResult });
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterLateResult.state);
  assert.equal(snapshot.result, null);
  controller.reset();
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterReset.state);
  assert.deepEqual(snapshot.draft, entry.expected.afterReset.draft);
});

test("fixture state-replace-late: the older late result never replaces the newer error", () => {
  const entry = fixture("state-replace-late");
  const { fake, controller } = createRig();
  setDraft(controller, entry.input.olderDraft);
  controller.run();
  setDraft(controller, entry.input.newerDraft);
  assert.equal(fake.calls[0].cancelled, true, "edit during busy retires the older run");
  controller.run();
  fake.calls[1].callbacks.onResult(run(entry.input.newerDraft));
  let snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterNewerResult.state);
  assert.deepEqual(snapshot.error, entry.expected.afterNewerResult.error);
  fake.calls[0].callbacks.onResult({ ok: true, result: entry.input.lateResult });
  snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, entry.expected.afterOlderLateResult.state);
  assert.deepEqual(snapshot.error, entry.expected.afterOlderLateResult.error);
});

test("starts empty with the SPEC defaults, and loadExample fills fixture case 1", () => {
  const { controller } = createRig();
  const initial = controller.getSnapshot();
  assert.equal(initial.state, "empty");
  assert.deepEqual(initial.draft, DEFAULTS);
  assert.equal(initial.reportAvailable, false);
  controller.loadExample();
  const loaded = controller.getSnapshot();
  assert.equal(loaded.state, "dirty");
  assert.deepEqual(loaded.draft, EXAMPLE);
  assert.deepEqual(loaded.draft, fixture("pre-cny-2025").input);
});

test("report download is gated on a successful state", () => {
  const { fake, controller } = createRig();
  assert.equal(controller.downloadReport(), null);
  setDraft(controller, { birthDate: "2025-01-29", asOfDate: "" });
  controller.run();
  assert.equal(controller.downloadReport(), null, "busy: no report");
  fake.calls[0].callbacks.onResult(run({ birthDate: "2025-01-29", asOfDate: "" }));
  const report = controller.downloadReport();
  assert.equal(report.ok, true);
  assert.equal(report.filename, "chinese-zodiac-report.json");
  controller.setField("asOfDate", "2026-01-01");
  assert.equal(controller.downloadReport(), null, "dirty: report withdrawn");
});

test("a worker failure surfaces WORKER_ERROR", () => {
  const { fake, controller } = createRig();
  setDraft(controller, { birthDate: "2025-01-29", asOfDate: "" });
  controller.run();
  fake.calls[0].callbacks.onError(new Error("boom"));
  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, "error");
  assert.deepEqual(snapshot.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(snapshot.reportAvailable, false);
});

test("a malformed worker payload surfaces WORKER_ERROR, never a crash", () => {
  const { fake, controller } = createRig();
  setDraft(controller, { birthDate: "2025-01-29", asOfDate: "" });
  controller.run();
  fake.calls[0].callbacks.onResult({ unexpected: true });
  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, "error");
  assert.deepEqual(snapshot.error, { code: "WORKER_ERROR", field: null, row: null });
});

test("cancel outside busy is a no-op; reset restores the defaults", () => {
  const { controller } = createRig();
  controller.cancel();
  assert.equal(controller.getSnapshot().state, "empty");
  controller.loadExample();
  controller.reset();
  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.state, "empty");
  assert.deepEqual(snapshot.draft, DEFAULTS);
  assert.equal(snapshot.result, null);
  assert.equal(snapshot.error, null);
});
