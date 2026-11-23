// Controller tests against the three fixed SPEC controller fixtures, using
// a fake transport whose deliveries the test controls explicitly.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { run } from "../public/js/core/core.mjs";
import { Controller } from "../public/js/core/controller.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8")
);
const byId = new Map(fixtures.cases.map((c) => [c.id, c]));

function fakeTransport() {
  return {
    sent: [],
    terminated: 0,
    send(snapshot, generation) {
      this.sent.push({ snapshot, generation });
    },
    terminate() {
      this.terminated += 1;
    },
    // Deliver the core-computed outcome for the most recent send.
    complete(controller) {
      const last = this.sent[this.sent.length - 1];
      controller.deliver(last.generation, run(last.snapshot));
    },
  };
}

test("fixture state-dirty-error", () => {
  const c = byId.get("state-dirty-error");
  const transport = fakeTransport();
  const controller = new Controller(transport);

  controller.edit(c.input.initial);
  controller.run();
  transport.complete(controller);
  let snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterRun.state);
  assert.equal(snap.reportAvailable, c.expected.afterRun.reportAvailable);

  controller.edit(c.input.edit);
  snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterEdit.state);
  assert.equal(snap.reportAvailable, c.expected.afterEdit.reportAvailable);

  controller.run();
  transport.complete(controller);
  snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterRerun.state);
  assert.equal(snap.reportAvailable, c.expected.afterRerun.reportAvailable);
  assert.deepEqual(snap.error, c.expected.afterRerun.error);
});

test("fixture state-cancel-late", () => {
  const c = byId.get("state-cancel-late");
  const transport = fakeTransport();
  const controller = new Controller(transport);

  controller.edit(c.input.draft);
  controller.run();
  let snap = controller.snapshot();
  assert.equal(snap.state, c.expected.whilePending.state);
  assert.equal(snap.reportAvailable, c.expected.whilePending.reportAvailable);
  const pendingGeneration = transport.sent[transport.sent.length - 1].generation;

  controller.cancel();
  snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterCancel.state);
  assert.equal(snap.reportAvailable, c.expected.afterCancel.reportAvailable);
  assert.deepEqual(snap.draft, c.expected.afterCancel.draft);

  // The late success from the cancelled generation must not revive.
  controller.deliver(pendingGeneration, { ok: true, result: c.input.lateResult });
  snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterLateResult.state);
  assert.equal(snap.reportAvailable, c.expected.afterLateResult.reportAvailable);

  controller.reset();
  snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterReset.state);
  assert.equal(snap.reportAvailable, c.expected.afterReset.reportAvailable);
  assert.deepEqual(snap.draft, c.expected.afterReset.draft);
});

test("fixture state-replace-late", () => {
  const c = byId.get("state-replace-late");
  const transport = fakeTransport();
  const controller = new Controller(transport);

  controller.edit(c.input.olderDraft);
  controller.run();
  const olderGeneration = transport.sent[transport.sent.length - 1].generation;

  controller.edit(c.input.newerDraft);
  controller.run();
  transport.complete(controller);
  let snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterNewerResult.state);
  assert.equal(snap.reportAvailable, c.expected.afterNewerResult.reportAvailable);
  assert.deepEqual(snap.error, c.expected.afterNewerResult.error);

  // The older generation's late success must not replace the current error.
  controller.deliver(olderGeneration, { ok: true, result: c.input.olderLateResult });
  snap = controller.snapshot();
  assert.equal(snap.state, c.expected.afterOlderLateResult.state);
  assert.equal(snap.reportAvailable, c.expected.afterOlderLateResult.reportAvailable);
  assert.deepEqual(snap.error, c.expected.afterOlderLateResult.error);
});

test("edit during busy terminates work and drops the pending result", () => {
  const transport = fakeTransport();
  const controller = new Controller(transport);
  controller.edit({ portfolioValue: "1000000", annualWithdrawal: "50000", returnRatePct: "0", inflationRatePct: "0" });
  controller.run();
  const gen = transport.sent[transport.sent.length - 1].generation;
  controller.edit({ annualWithdrawal: "1" });
  assert.equal(controller.state, "dirty");
  assert.ok(transport.terminated >= 1);
  controller.deliver(
    gen,
    run({ mode: "depletion", portfolioValue: "1000000", annualWithdrawal: "50000", returnRatePct: "0", inflationRatePct: "0" })
  );
  assert.equal(controller.state, "dirty");
  assert.equal(controller.reportAvailable, false);
});

test("mode switch preserves each mode's inputs and sends only the active mode's fields", () => {
  const transport = fakeTransport();
  const controller = new Controller(transport);
  controller.edit({ portfolioValue: "1000000", annualWithdrawal: "50000", returnRatePct: "0", inflationRatePct: "0" });
  controller.edit({ mode: "four-percent" });
  assert.deepEqual(controller.snapshot().draft, {
    mode: "four-percent",
    annualSpending: "",
    currentPortfolio: "",
  });
  controller.edit({ annualSpending: "600000", currentPortfolio: "15000000" });
  controller.run();
  assert.deepEqual(transport.sent[transport.sent.length - 1].snapshot, {
    mode: "four-percent",
    annualSpending: "600000",
    currentPortfolio: "15000000",
  });
  transport.complete(controller);
  assert.equal(controller.snapshot().state, "success");
  assert.equal(controller.snapshot().result.targetPortfolio, "15000000.00");

  controller.edit({ mode: "depletion" });
  assert.deepEqual(controller.snapshot().draft, {
    mode: "depletion",
    portfolioValue: "1000000",
    annualWithdrawal: "50000",
    returnRatePct: "0",
    inflationRatePct: "0",
  });
  assert.equal(controller.snapshot().reportAvailable, false);
});

test("load example fills the linear-no-growth case and reset restores depletion defaults", () => {
  const transport = fakeTransport();
  const controller = new Controller(transport);
  controller.loadExample();
  let snap = controller.snapshot();
  assert.equal(snap.state, "dirty");
  assert.equal(snap.exampleLoaded, true);
  assert.deepEqual(snap.draft, {
    mode: "depletion",
    portfolioValue: "1000000",
    annualWithdrawal: "50000",
    returnRatePct: "0",
    inflationRatePct: "0",
  });
  controller.run();
  transport.complete(controller);
  assert.equal(controller.snapshot().state, "success");
  assert.equal(controller.snapshot().result.yearsUntilDepletion, "20.00");
  controller.reset();
  snap = controller.snapshot();
  assert.equal(snap.state, "empty");
  assert.equal(snap.exampleLoaded, false);
  assert.deepEqual(snap.draft, {
    mode: "depletion",
    portfolioValue: "",
    annualWithdrawal: "",
    returnRatePct: "5",
    inflationRatePct: "2",
  });
});
