// Controller tests. Drives the real Controller with a fake transport whose
// completion time the test controls. Expected states come from the SPEC
// controller fixtures in test/fixtures.json — never from the app's output.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { Controller, DEFAULT_DRAFT, EXAMPLE_DRAFT } from "../public/js/core/controller.mjs";
import { run } from "../public/js/core/core.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8")
);
const controllerCases = Object.fromEntries(
  fixtures.cases.filter((c) => c.kind === "controller").map((c) => [c.id, c])
);

function fakeTransport() {
  const t = { sent: [], terminated: 0 };
  t.send = (snapshot, generation) => {
    t.sent.push({ snapshot, generation });
  };
  t.terminate = () => {
    t.terminated += 1;
  };
  return t;
}

test("fixture state-dirty-error: run, edit to invalid, rerun errors, report gone", () => {
  const c = controllerCases["state-dirty-error"];
  const t = fakeTransport();
  const ctl = new Controller(t);
  ctl.edit(c.input.initial);
  ctl.run();
  assert.equal(ctl.snapshot().state, "busy");
  const [job] = t.sent;
  assert.equal(ctl.deliver(job.generation, run(job.snapshot)), true);
  assert.deepEqual(
    { reportAvailable: ctl.reportAvailable, state: ctl.snapshot().state },
    c.expected.afterRun
  );
  ctl.edit(c.input.edit);
  assert.deepEqual(
    { reportAvailable: ctl.reportAvailable, state: ctl.snapshot().state },
    c.expected.afterEdit
  );
  ctl.run();
  const job2 = t.sent[t.sent.length - 1];
  assert.equal(ctl.deliver(job2.generation, run(job2.snapshot)), true);
  assert.deepEqual(
    {
      error: ctl.snapshot().error,
      reportAvailable: ctl.reportAvailable,
      state: ctl.snapshot().state,
    },
    c.expected.afterRerun
  );
});

test("fixture state-cancel-late: pending, cancel, late result dropped, reset to default", () => {
  const c = controllerCases["state-cancel-late"];
  const t = fakeTransport();
  const ctl = new Controller(t);
  ctl.edit(c.input.draft);
  ctl.run();
  assert.deepEqual(
    { reportAvailable: ctl.reportAvailable, state: ctl.snapshot().state },
    c.expected.whilePending
  );
  ctl.cancel();
  assert.deepEqual(
    {
      draft: ctl.snapshot().draft,
      reportAvailable: ctl.reportAvailable,
      state: ctl.snapshot().state,
    },
    c.expected.afterCancel
  );
  // The late result arrives with the old generation: it must not revive.
  assert.equal(ctl.deliver(1, { ok: true, result: c.input.lateResult }), false);
  assert.deepEqual(
    { reportAvailable: ctl.reportAvailable, state: ctl.snapshot().state },
    c.expected.afterLateResult
  );
  ctl.reset();
  assert.deepEqual(
    {
      draft: ctl.snapshot().draft,
      reportAvailable: ctl.reportAvailable,
      state: ctl.snapshot().state,
    },
    c.expected.afterReset
  );
  assert.deepEqual(ctl.snapshot().draft, { ...DEFAULT_DRAFT });
});

test("loadExample fills the first fixture draft and marks dirty", () => {
  const t = fakeTransport();
  const ctl = new Controller(t);
  ctl.loadExample();
  assert.deepEqual(ctl.snapshot().draft, { ...EXAMPLE_DRAFT });
  assert.equal(ctl.snapshot().state, "dirty");
  assert.equal(ctl.snapshot().exampleLoaded, true);
  assert.equal(ctl.reportAvailable, false);
});

test("edit during busy terminates old work and invalidates the result", () => {
  const t = fakeTransport();
  const ctl = new Controller(t);
  ctl.edit({ guests: "10", durationHours: "2", mealType: "snacks" });
  ctl.run();
  const [job] = t.sent;
  ctl.deliver(job.generation, run(job.snapshot));
  assert.equal(ctl.snapshot().state, "success");
  assert.equal(ctl.reportAvailable, true);
  ctl.edit({ guests: "11" });
  assert.equal(ctl.snapshot().state, "dirty");
  assert.equal(ctl.reportAvailable, false);
  assert.equal(ctl.snapshot().result, null);
});

test("run while busy is a no-op; deliver while not busy is dropped", () => {
  const t = fakeTransport();
  const ctl = new Controller(t);
  ctl.run();
  ctl.run();
  assert.equal(t.sent.length, 1);
  assert.equal(
    ctl.deliver(999, { ok: true, result: { mealType: "full" } }),
    false
  );
  assert.equal(ctl.snapshot().state, "busy");
});

test("cancel and reset are no-ops outside busy; stopWork only ends busy work", () => {
  const t = fakeTransport();
  const ctl = new Controller(t);
  ctl.cancel();
  assert.equal(ctl.snapshot().state, "empty");
  ctl.stopWork();
  assert.equal(t.terminated, 0);
  ctl.run();
  ctl.stopWork();
  assert.equal(t.terminated, 1);
  assert.equal(ctl.snapshot().state, "busy");
});
