import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { run } from "../public/js/core/core.mjs";
import { createController } from "../public/js/controller.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const controllerCases = Object.fromEntries(
  fixtures.cases.filter((entry) => entry.kind === "controller").map((entry) => [entry.id, entry]),
);

// A scheduler whose callbacks the test fires by hand, so completion order
// and late arrivals are fully deterministic.
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

function checkpoint(state) {
  return {
    state: state.status,
    resultAvailable: state.resultAvailable,
    ...(state.error ? { error: state.error } : {}),
    ...(state.draft ? { draft: state.draft } : {}),
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
    { state: state.status, resultAvailable: state.resultAvailable },
    entry.expected.afterRun,
  );

  controller.updateDraft(entry.input.edit);
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, resultAvailable: state.resultAvailable },
    entry.expected.afterEdit,
  );

  controller.execute();
  scheduler.fireNext();
  state = controller.getState();
  assert.deepStrictEqual(checkpoint(state), {
    state: entry.expected.afterRerun.state,
    resultAvailable: entry.expected.afterRerun.resultAvailable,
    error: entry.expected.afterRerun.error,
    draft: state.draft,
  });
  assert.deepStrictEqual(state.error, entry.expected.afterRerun.error);
});

test("controller fixture: state-cancel-late", () => {
  const entry = controllerCases["state-cancel-late"];
  const scheduler = fakeScheduler();
  const controller = createController({ run, schedule: scheduler.schedule });

  controller.updateDraft(entry.input.draft);
  controller.execute();
  let state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, resultAvailable: state.resultAvailable },
    entry.expected.whilePending,
  );

  controller.cancel();
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, resultAvailable: state.resultAvailable, draft: state.draft },
    entry.expected.afterCancel,
  );

  // The pending work now settles late with the fixture's lateResult payload;
  // a controller driven by the real core would produce exactly this result.
  // Fire the queued settle: its generation was invalidated by cancel(), so
  // the outcome must be dropped.
  scheduler.fireNext();
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, resultAvailable: state.resultAvailable },
    entry.expected.afterLateResult,
  );

  controller.reset();
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, resultAvailable: state.resultAvailable, draft: state.draft },
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
    { state: state.status, resultAvailable: state.resultAvailable, error: state.error },
    entry.expected.afterNewerResult,
  );

  // The older work settles late with a success; it must not replace the error.
  scheduler.fireNext();
  state = controller.getState();
  assert.deepStrictEqual(
    { state: state.status, resultAvailable: state.resultAvailable, error: state.error },
    entry.expected.afterOlderLateResult,
  );
});

test("editing during busy work drops the pending settle", () => {
  const scheduler = fakeScheduler();
  const controller = createController({ run, schedule: scheduler.schedule });
  controller.updateDraft({ startDate: "2021-06-15", referenceDate: "2026-11-09", usedDays: "4" });
  controller.execute();
  assert.equal(controller.getState().status, "busy");
  controller.updateDraft({ startDate: "2021-06-15", referenceDate: "2026-11-09", usedDays: "5" });
  assert.equal(controller.getState().status, "dirty");
  scheduler.fireNext();
  const state = controller.getState();
  assert.equal(state.status, "dirty");
  assert.equal(state.resultAvailable, false);
});

test("reset restores the blank draft and empty state", () => {
  const scheduler = fakeScheduler();
  const controller = createController({ run, schedule: scheduler.schedule });
  controller.updateDraft({ startDate: "2021-06-15", referenceDate: "2026-11-09", usedDays: "4" });
  controller.execute();
  scheduler.fireNext();
  assert.equal(controller.getState().status, "success");
  controller.reset();
  const state = controller.getState();
  assert.equal(state.status, "empty");
  assert.deepStrictEqual(state.draft, { startDate: "", referenceDate: "", usedDays: "" });
  assert.equal(state.resultAvailable, false);
});
