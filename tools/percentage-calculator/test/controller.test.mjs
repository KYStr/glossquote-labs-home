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
  controller.run();
  const gen = transport.sent[transport.sent.length - 1].generation;
  controller.edit({ first: "1" });
  assert.equal(controller.state, "dirty");
  assert.ok(transport.terminated >= 1);
  controller.deliver(gen, run({ mode: "of", first: "20", second: "150" }));
  assert.equal(controller.state, "dirty");
  assert.equal(controller.reportAvailable, false);
});
