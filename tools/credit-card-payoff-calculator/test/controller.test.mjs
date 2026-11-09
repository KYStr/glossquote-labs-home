import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Controller fixtures are vendored verbatim from the fixed SPEC
// candidate da80a6d6387cde5ec4b0f6c2e57483b07ccc2104 (draft PR #137).
// The fake worker delivers outcomes only when the test tells it to,
// so late arrivals from older generations are exercised exactly.

import { run } from "../public/js/core/payoff.mjs";
import { DEFAULT_DRAFT } from "../public/js/core/payoff.mjs";
import { PayoffController } from "../public/js/controller.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const byId = Object.fromEntries(fixtures.cases.map((entry) => [entry.id, entry]));

class FakeWorker {
  constructor() {
    this.onmessage = null;
    this.onerror = null;
    this.terminated = false;
    this.messages = [];
  }

  postMessage(message) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  deliverCompute() {
    const message = this.messages.at(-1);
    this.onmessage({
      data: { generation: message.generation, outcome: run(message.input) },
    });
  }

  deliverRaw(data) {
    this.onmessage({ data });
  }
}

function makeController() {
  const workers = [];
  const controller = new PayoffController({
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
  });
  return { controller, workers };
}

function checkpoint(controller) {
  return { state: controller.state, reportAvailable: controller.reportAvailable };
}

test("fixture state-dirty-error", () => {
  const fixture = byId["state-dirty-error"];
  const { controller, workers } = makeController();
  controller.edit(fixture.input.initial);
  controller.run();
  workers.at(-1).deliverCompute();
  assert.deepStrictEqual(checkpoint(controller), fixture.expected.afterRun);

  controller.edit(fixture.input.edit);
  assert.deepStrictEqual(checkpoint(controller), fixture.expected.afterEdit);

  controller.run();
  workers.at(-1).deliverCompute();
  assert.deepStrictEqual(checkpoint(controller), {
    state: fixture.expected.afterRerun.state,
    reportAvailable: fixture.expected.afterRerun.reportAvailable,
  });
  assert.deepStrictEqual(controller.error, fixture.expected.afterRerun.error);
  assert.equal(controller.result, null);
});

test("fixture state-cancel-late", () => {
  const fixture = byId["state-cancel-late"];
  const { controller, workers } = makeController();
  controller.edit(fixture.input.draft);
  controller.run();
  assert.deepStrictEqual(checkpoint(controller), fixture.expected.whilePending);

  const pendingWorker = workers.at(-1);
  const pendingGeneration = pendingWorker.messages.at(-1).generation;
  controller.cancel();
  assert.deepStrictEqual(checkpoint(controller), {
    state: fixture.expected.afterCancel.state,
    reportAvailable: fixture.expected.afterCancel.reportAvailable,
  });
  assert.deepStrictEqual(controller.draft, fixture.expected.afterCancel.draft);
  assert.equal(pendingWorker.terminated, true);

  pendingWorker.deliverRaw({
    generation: pendingGeneration,
    outcome: { ok: true, result: fixture.input.lateResult },
  });
  assert.deepStrictEqual(checkpoint(controller), fixture.expected.afterLateResult);
  assert.equal(controller.result, null);

  controller.reset();
  assert.deepStrictEqual(checkpoint(controller), {
    state: fixture.expected.afterReset.state,
    reportAvailable: fixture.expected.afterReset.reportAvailable,
  });
  assert.deepStrictEqual(controller.draft, fixture.expected.afterReset.draft);
  assert.deepStrictEqual(controller.draft, { ...DEFAULT_DRAFT });
});

test("fixture state-replace-late", () => {
  const fixture = byId["state-replace-late"];
  const { controller, workers } = makeController();
  controller.edit(fixture.input.olderDraft);
  controller.run();
  const olderWorker = workers.at(-1);
  const olderGeneration = olderWorker.messages.at(-1).generation;

  controller.edit(fixture.input.newerDraft);
  assert.equal(olderWorker.terminated, true);
  controller.run();
  workers.at(-1).deliverCompute();
  assert.deepStrictEqual(checkpoint(controller), {
    state: fixture.expected.afterNewerResult.state,
    reportAvailable: fixture.expected.afterNewerResult.reportAvailable,
  });
  assert.deepStrictEqual(controller.error, fixture.expected.afterNewerResult.error);

  olderWorker.deliverRaw({
    generation: olderGeneration,
    outcome: { ok: true, result: fixture.input.olderLateResult },
  });
  assert.deepStrictEqual(checkpoint(controller), {
    state: fixture.expected.afterOlderLateResult.state,
    reportAvailable: fixture.expected.afterOlderLateResult.reportAvailable,
  });
  assert.deepStrictEqual(controller.error, fixture.expected.afterOlderLateResult.error);
  assert.equal(controller.result, null);
});

test("worker construction failure and worker error both surface WORKER_ERROR", () => {
  const failing = new PayoffController({
    createWorker: () => {
      throw new Error("no worker");
    },
  });
  failing.run();
  assert.equal(failing.state, "error");
  assert.deepStrictEqual(failing.error, { code: "WORKER_ERROR", field: null, row: null });

  const { controller, workers } = makeController();
  controller.run();
  workers.at(-1).onerror(new Error("boom"));
  assert.equal(controller.state, "error");
  assert.deepStrictEqual(controller.error, { code: "WORKER_ERROR", field: null, row: null });
  assert.equal(controller.reportAvailable, false);
});

test("cancel outside busy is a no-op and reset restores defaults", () => {
  const { controller, workers } = makeController();
  controller.cancel();
  assert.equal(controller.state, "empty");
  controller.edit({
    balance: "1200.00", aprPercent: "12", mode: "payment",
    monthlyPayment: "110.00", targetMonths: "24",
  });
  controller.run();
  workers.at(-1).deliverCompute();
  assert.equal(controller.state, "success");
  assert.equal(controller.reportAvailable, true);
  assert.ok(controller.reportBytes.byteLength > 0);
  controller.reset();
  assert.equal(controller.state, "empty");
  assert.deepStrictEqual(controller.draft, { ...DEFAULT_DRAFT });
  assert.equal(controller.reportAvailable, false);
});
