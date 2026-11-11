import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { run } from "../public/js/core/core.mjs";
import { DEFAULT_DRAFT, createController, projectDraft } from "../public/js/controller.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const controllerCases = Object.fromEntries(
  fixtures.cases.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);

// A scheduler whose callbacks the test fires by hand, so completion order
// and late arrivals are fully deterministic (the SPEC's fake Worker).
function fakeScheduler() {
  const queue = [];
  return {
    schedule(fn) {
      queue.push(fn);
    },
    fireNext() {
      const fn = queue.shift();
      if (fn) fn();
    },
    fireLast() {
      const fn = queue.pop();
      if (fn) fn();
    },
    get pending() {
      return queue.length;
    },
  };
}

test("controller fixture: state-dirty-error", () => {
  const entry = controllerCases["state-dirty-error"];
  const scheduler = fakeScheduler();
  const controller = createController({ run, schedule: scheduler.schedule });

  controller.updateDraft(entry.input.initial);
  controller.execute();
  scheduler.fireNext();
  let state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable },
    entry.expected.afterRun,
  );

  controller.updateDraft(entry.input.edit);
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable },
    entry.expected.afterEdit,
  );

  controller.execute();
  scheduler.fireNext();
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable, error: state.error },
    {
      state: entry.expected.afterRerun.state,
      reportAvailable: entry.expected.afterRerun.reportAvailable,
      error: entry.expected.afterRerun.error,
    },
  );
});

test("controller fixture: state-cancel-late", () => {
  const entry = controllerCases["state-cancel-late"];
  const scheduler = fakeScheduler();
  const controller = createController({ run, schedule: scheduler.schedule });

  controller.updateDraft(entry.input.draft);
  controller.execute();
  let state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable },
    entry.expected.whilePending,
  );

  controller.cancel();
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable, draft: state.draft },
    entry.expected.afterCancel,
  );

  // The pending work now settles late; a controller driven by the real
  // core would produce exactly the fixture's lateResult payload. Its
  // generation was invalidated by cancel(), so it must be dropped.
  scheduler.fireNext();
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable },
    entry.expected.afterLateResult,
  );

  controller.reset();
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable, draft: state.draft },
    entry.expected.afterReset,
  );
});

test("controller fixture: state-replace-late", () => {
  const entry = controllerCases["state-replace-late"];
  const scheduler = fakeScheduler();
  const controller = createController({ run, schedule: scheduler.schedule });

  controller.updateDraft(entry.input.olderDraft);
  controller.execute();
  assert.equal(scheduler.pending, 1);

  controller.updateDraft(entry.input.newerDraft);
  controller.execute();
  assert.equal(scheduler.pending, 2);

  // The newer work settles first, with an error.
  scheduler.fireLast();
  let state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable, error: state.error },
    entry.expected.afterNewerResult,
  );

  // The older work settles late with a success; it must not replace the error.
  scheduler.fireNext();
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, reportAvailable: state.resultAvailable, error: state.error },
    entry.expected.afterOlderLateResult,
  );
});

test("projectDraft projects the five-field draft to the core's four-field input", () => {
  assert.deepStrictEqual(
    projectDraft({ mode: "count", startDate: "2026-01-02", endDate: "2026-01-09", days: "5", holidays: "" }),
    { mode: "count", startDate: "2026-01-02", endDate: "2026-01-09", holidays: "" },
  );
  assert.deepStrictEqual(
    projectDraft({ mode: "shift", startDate: "2026-01-02", endDate: "", days: "1", holidays: "" }),
    { mode: "shift", startDate: "2026-01-02", days: "1", holidays: "" },
  );
});

test("editing during busy work drops the pending settle", () => {
  const scheduler = fakeScheduler();
  const controller = createController({ run, schedule: scheduler.schedule });
  controller.updateDraft({ mode: "count", startDate: "2026-01-02", endDate: "2026-01-09", days: "5", holidays: "" });
  controller.execute();
  assert.equal(controller.getState().status, "busy");
  controller.updateDraft({ mode: "count", startDate: "2026-01-02", endDate: "2026-01-12", days: "5", holidays: "" });
  assert.equal(controller.getState().status, "dirty");
  scheduler.fireNext();
  const state = controller.getState();
  assert.equal(state.status, "dirty");
  assert.equal(state.resultAvailable, false);
});

test("switching mode invalidates a settled result immediately", () => {
  const scheduler = fakeScheduler();
  const controller = createController({ run, schedule: scheduler.schedule });
  const draft = { mode: "count", startDate: "2026-01-02", endDate: "2026-01-09", days: "5", holidays: "" };
  controller.updateDraft(draft);
  controller.execute();
  scheduler.fireNext();
  assert.equal(controller.getState().resultAvailable, true);
  controller.updateDraft({ ...draft, mode: "shift" });
  const state = controller.getState();
  assert.equal(state.status, "dirty");
  assert.equal(state.resultAvailable, false);
  assert.equal(state.draft.endDate, "2026-01-09");
});

test("reset restores the pinned default draft and empty state", () => {
  const scheduler = fakeScheduler();
  const controller = createController({ run, schedule: scheduler.schedule });
  controller.updateDraft({ mode: "shift", startDate: "2026-01-02", endDate: "", days: "1", holidays: "" });
  controller.execute();
  scheduler.fireNext();
  assert.equal(controller.getState().status, "success");
  controller.reset();
  const state = controller.getState();
  assert.equal(state.status, "empty");
  assert.deepStrictEqual(state.draft, { ...DEFAULT_DRAFT });
  assert.deepStrictEqual(state.draft, {
    mode: "count",
    startDate: "",
    endDate: "",
    days: "5",
    holidays: "",
  });
  assert.equal(state.resultAvailable, false);
});
