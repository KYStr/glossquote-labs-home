// Controller tests. The three state fixtures from the fixed spec fixtures
// (vendored verbatim at test/fixtures.json, spec candidate
// 2b83a326544418542bb0223b58f2cc86701a49dd) are exercised through a fake
// executor with controllable completion timing — the equivalent seam of the
// spec's fake Worker. Expected checkpoints are the fixtures' own values.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createController } from "../public/js/core/controller.mjs";
import { run as runCore } from "../public/js/core/rent-budget.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const byId = new Map(fixtures.cases.map((c) => [c.id, c]));

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function assertCheckpoint(state, checkpoint) {
  assert.equal(state.status, checkpoint.state);
  assert.equal(state.reportAvailable, checkpoint.reportAvailable);
  if (checkpoint.draft) assert.deepStrictEqual(state.draft, checkpoint.draft);
  if (checkpoint.error) assert.deepStrictEqual(state.error, checkpoint.error);
}

test("fixture state-dirty-error", async () => {
  const fixture = byId.get("state-dirty-error");
  const controller = createController({ execute: (input) => Promise.resolve(runCore(input)) });
  controller.edit(fixture.input.initial);
  controller.run();
  await flush();
  assertCheckpoint(controller.getState(), fixture.expected.afterRun);
  controller.edit(fixture.input.edit);
  assertCheckpoint(controller.getState(), fixture.expected.afterEdit);
  controller.run();
  await flush();
  assertCheckpoint(controller.getState(), fixture.expected.afterRerun);
});

test("fixture state-cancel-late", async () => {
  const fixture = byId.get("state-cancel-late");
  const gate = deferred();
  const controller = createController({ execute: () => gate.promise });
  controller.edit(fixture.input.draft);
  controller.run();
  assertCheckpoint(controller.getState(), fixture.expected.whilePending);
  controller.cancel();
  assertCheckpoint(controller.getState(), fixture.expected.afterCancel);
  gate.resolve({ ok: true, result: fixture.input.lateResult });
  await flush();
  assertCheckpoint(controller.getState(), fixture.expected.afterLateResult);
  controller.reset();
  assertCheckpoint(controller.getState(), fixture.expected.afterReset);
});

test("fixture state-replace-late", async () => {
  const fixture = byId.get("state-replace-late");
  const older = deferred();
  let calls = 0;
  const controller = createController({
    execute: (input) => {
      calls += 1;
      if (calls === 1) return older.promise;
      return Promise.resolve(runCore(input));
    },
  });
  controller.edit(fixture.input.olderDraft);
  controller.run();
  controller.edit(fixture.input.newerDraft);
  controller.run();
  await flush();
  assertCheckpoint(controller.getState(), fixture.expected.afterNewerResult);
  older.resolve({ ok: true, result: fixture.input.olderLateResult });
  await flush();
  assertCheckpoint(controller.getState(), fixture.expected.afterOlderLateResult);
});

test("executor rejection becomes WORKER_ERROR and editing clears it to dirty", async () => {
  const controller = createController({
    execute: () => Promise.reject(new Error("boom")),
  });
  controller.run();
  await flush();
  const failed = controller.getState();
  assert.equal(failed.status, "error");
  assert.deepStrictEqual(failed.error, { code: "WORKER_ERROR", field: null, row: null });
  controller.edit({ ...failed.draft, income: "50000" });
  const dirty = controller.getState();
  assert.equal(dirty.status, "dirty");
  assert.equal(dirty.error, null);
  assert.equal(dirty.reportAvailable, false);
});

test("cancel outside busy is a no-op; reset restores the pinned defaults", async () => {
  const controller = createController({ execute: (input) => Promise.resolve(runCore(input)) });
  controller.cancel();
  assert.equal(controller.getState().status, "empty");
  controller.run();
  await flush();
  assert.equal(controller.getState().status, "success");
  controller.reset();
  const state = controller.getState();
  assert.equal(state.status, "empty");
  assert.deepStrictEqual(state.draft, {
    income: "45000",
    ratioPreset: "P30",
    customRatio: "",
    candidateRent: "12000",
    depositMonths: "2",
    agencyFee: "0.5",
  });
});
