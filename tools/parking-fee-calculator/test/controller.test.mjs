// Controller tests: the 3 state cases vendored in test/fixtures.json from
// the fixed spec candidate, driven through a controllable fake Worker
// port. Checkpoints (state + reportAvailable + draft) match the fixture
// expectations literally.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ParkingController } from "../public/js/controller.mjs";
import { DEFAULT_DRAFT, run } from "../public/js/core/parking.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8")
);
const byId = Object.fromEntries(fixtures.cases.map((c) => [c.id, c]));

class FakePort {
  constructor() {
    this.messages = [];
    this.handler = null;
    this.terminateCount = 0;
  }
  post(message) {
    this.messages.push(message);
  }
  setOnMessage(fn) {
    this.handler = fn;
  }
  terminate() {
    this.terminateCount += 1;
  }
  lastGeneration() {
    return this.messages[this.messages.length - 1].generation;
  }
  // Deliver the real core outcome for a posted generation.
  deliverComputed(generation) {
    const message = this.messages.find((m) => m.generation === generation);
    this.handler({ generation, outcome: run(message.input) });
  }
  deliver(generation, outcome) {
    this.handler({ generation, outcome });
  }
}

test("fixture state-dirty-error", () => {
  const c = byId["state-dirty-error"];
  const port = new FakePort();
  const ctl = new ParkingController(port);

  ctl.edit(c.input.initial);
  ctl.run();
  port.deliverComputed(port.lastGeneration());
  assert.equal(ctl.state, c.expected.afterRun.state);
  assert.equal(ctl.reportAvailable, c.expected.afterRun.reportAvailable);
  assert.notEqual(ctl.getReport(), null);

  ctl.edit(c.input.edit);
  assert.equal(ctl.state, c.expected.afterEdit.state);
  assert.equal(ctl.reportAvailable, c.expected.afterEdit.reportAvailable);
  assert.equal(ctl.getReport(), null);

  ctl.run();
  port.deliverComputed(port.lastGeneration());
  assert.equal(ctl.state, c.expected.afterRerun.state);
  assert.deepEqual(ctl.error, c.expected.afterRerun.error);
  assert.equal(ctl.reportAvailable, c.expected.afterRerun.reportAvailable);
});

test("fixture state-cancel-late", () => {
  const c = byId["state-cancel-late"];
  const port = new FakePort();
  const ctl = new ParkingController(port);

  ctl.edit(c.input.draft);
  ctl.run();
  assert.equal(ctl.state, c.expected.whilePending.state);
  assert.equal(ctl.reportAvailable, c.expected.whilePending.reportAvailable);
  const runGeneration = port.lastGeneration();

  ctl.cancel();
  assert.equal(ctl.state, c.expected.afterCancel.state);
  assert.deepEqual(ctl.draft, c.expected.afterCancel.draft);
  assert.equal(ctl.reportAvailable, c.expected.afterCancel.reportAvailable);

  // Late success from the cancelled generation must not revive a result.
  port.deliver(runGeneration, { ok: true, result: c.input.lateResult });
  assert.equal(ctl.state, c.expected.afterLateResult.state);
  assert.equal(ctl.reportAvailable, c.expected.afterLateResult.reportAvailable);
  assert.equal(ctl.result, null);

  ctl.reset();
  assert.equal(ctl.state, c.expected.afterReset.state);
  assert.deepEqual(ctl.draft, c.expected.afterReset.draft);
  assert.deepEqual(ctl.draft, { ...DEFAULT_DRAFT });
  assert.equal(ctl.reportAvailable, c.expected.afterReset.reportAvailable);
});

test("fixture state-replace-late", () => {
  const c = byId["state-replace-late"];
  const port = new FakePort();
  const ctl = new ParkingController(port);

  ctl.edit(c.input.olderDraft);
  ctl.run();
  const olderGeneration = port.lastGeneration();

  ctl.edit(c.input.newerDraft);
  ctl.run();
  port.deliverComputed(port.lastGeneration());
  assert.equal(ctl.state, c.expected.afterNewerResult.state);
  assert.deepEqual(ctl.error, c.expected.afterNewerResult.error);
  assert.equal(ctl.reportAvailable, c.expected.afterNewerResult.reportAvailable);

  // The older run's late success must not replace the current error.
  port.deliver(olderGeneration, { ok: true, result: c.input.olderLateResult });
  assert.equal(ctl.state, c.expected.afterOlderLateResult.state);
  assert.deepEqual(ctl.error, c.expected.afterOlderLateResult.error);
  assert.equal(ctl.reportAvailable, c.expected.afterOlderLateResult.reportAvailable);
});

test("editing while busy terminates the worker and drops its reply", () => {
  const port = new FakePort();
  const ctl = new ParkingController(port);
  ctl.edit({ ...DEFAULT_DRAFT, entry: "2026-11-09T09:00", exit: "2026-11-09T10:00" });
  ctl.run();
  const generation = port.lastGeneration();
  const before = port.terminateCount;
  ctl.edit({ ...ctl.draft, exit: "2026-11-09T12:00" });
  assert.ok(port.terminateCount > before);
  assert.equal(ctl.state, "dirty");
  port.deliverComputed(generation);
  assert.equal(ctl.state, "dirty");
  assert.equal(ctl.result, null);
});
