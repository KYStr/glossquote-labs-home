// Controller tests for the Spacing Token Audit.
// The three SPEC controller fixtures are replayed with a controllable fake
// worker; every expected checkpoint is asserted from fixtures.json.
import { deepStrictEqual, equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createController } from "../public/js/controller.mjs";
import { DEFAULT_DRAFT, run } from "../public/js/core/audit.mjs";

const fixtures = JSON.parse(
  readFileSync(
    new URL(
      "../../../docs/specs/spacing-token-audit/fixtures.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const byId = Object.fromEntries(fixtures.cases.map((c) => [c.id, c]));

class FakeWorker {
  constructor() {
    this.sent = [];
    this.terminated = false;
    this.onmessage = null;
  }
  postMessage(message) {
    this.sent.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  deliver(data) {
    if (this.onmessage) this.onmessage({ data });
  }
  // Deliver the core's real outcome for a snapshot, as a real worker would.
  deliverRun(snapshot, generation) {
    this.deliver({ generation, outcome: run(snapshot) });
  }
}

function setup() {
  const workers = [];
  const controller = createController({
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
  });
  const states = [];
  controller.subscribe((state) => states.push(state.state));
  return { controller, workers, states };
}

test("fixture state-dirty-error", () => {
  const fixture = byId["state-dirty-error"];
  const { controller, workers } = setup();
  const initial = fixture.input.initial;
  const edit = fixture.input.edit;

  controller.edit(initial);
  controller.run();
  equal(workers.length, 1);
  workers[0].deliverRun(initial, 1);
  let state = controller.getState();
  deepStrictEqual(
    { state: state.state, reportAvailable: controller.getReportText() !== null },
    fixture.expected.afterRun,
  );

  controller.edit(edit);
  state = controller.getState();
  deepStrictEqual(
    { state: state.state, reportAvailable: controller.getReportText() !== null },
    fixture.expected.afterEdit,
  );
  ok(workers[0].terminated, "worker is stopped after success");

  controller.run();
  equal(workers.length, 2);
  workers[1].deliverRun(edit, 2);
  state = controller.getState();
  deepStrictEqual(
    {
      state: state.state,
      reportAvailable: controller.getReportText() !== null,
      error: state.error,
    },
    fixture.expected.afterRerun,
  );
});

test("fixture state-cancel-late", () => {
  const fixture = byId["state-cancel-late"];
  const { controller, workers } = setup();
  const draft = fixture.input.draft;

  controller.edit(draft);
  controller.run();
  let state = controller.getState();
  deepStrictEqual(
    { state: state.state, reportAvailable: controller.getReportText() !== null },
    fixture.expected.whilePending,
  );

  controller.cancel();
  state = controller.getState();
  deepStrictEqual(
    { state: state.state, reportAvailable: controller.getReportText() !== null, draft: state.draft },
    fixture.expected.afterCancel,
  );
  ok(workers[0].terminated, "cancel terminates the worker");

  // A late success from the cancelled generation must not resurrect.
  workers[0].deliver({ generation: 1, outcome: { ok: true, result: fixture.input.lateResult } });
  state = controller.getState();
  deepStrictEqual(
    { state: state.state, reportAvailable: controller.getReportText() !== null },
    fixture.expected.afterLateResult,
  );

  controller.reset();
  state = controller.getState();
  deepStrictEqual(
    { state: state.state, reportAvailable: controller.getReportText() !== null, draft: state.draft },
    fixture.expected.afterReset,
  );
  deepStrictEqual(state.draft, DEFAULT_DRAFT);
});

test("fixture state-replace-late", () => {
  const fixture = byId["state-replace-late"];
  const { controller, workers } = setup();

  controller.edit(fixture.input.olderDraft);
  controller.run();
  equal(workers.length, 1);
  ok(!workers[0].terminated, "older work is still pending");

  controller.edit(fixture.input.newerDraft);
  ok(workers[0].terminated, "editing terminates the older work");
  controller.run();
  equal(workers.length, 2);
  workers[1].deliverRun(fixture.input.newerDraft, 2);
  let state = controller.getState();
  deepStrictEqual(
    {
      state: state.state,
      reportAvailable: controller.getReportText() !== null,
      error: state.error,
    },
    fixture.expected.afterNewerResult,
  );

  // The older generation's late success must not replace the current error.
  workers[0].deliver({
    generation: 1,
    outcome: { ok: true, result: fixture.input.olderLateResult },
  });
  state = controller.getState();
  deepStrictEqual(
    {
      state: state.state,
      reportAvailable: controller.getReportText() !== null,
      error: state.error,
    },
    fixture.expected.afterOlderLateResult,
  );
});

test("run while busy restarts with a new generation", () => {
  const { controller, workers } = setup();
  const draft = byId["state-cancel-late"].input.draft;
  controller.edit(draft);
  controller.run();
  controller.run();
  equal(workers.length, 2);
  ok(workers[0].terminated, "first worker terminated by restart");
  equal(controller.getState().generation, 2);
  // The first generation's result is ignored even while busy.
  workers[0].deliverRun(draft, 1);
  equal(controller.getState().state, "busy");
  workers[1].deliverRun(draft, 2);
  equal(controller.getState().state, "success");
  ok(workers[1].terminated, "worker is stopped after success");
});

test("edit from empty goes dirty; reset from busy discards work", () => {
  const { controller, workers } = setup();
  equal(controller.getState().state, "empty");
  controller.edit({ tokens: "a\t1", measurements: "b\t1", tolerance: "1" });
  equal(controller.getState().state, "dirty");
  controller.run();
  equal(controller.getState().state, "busy");
  controller.reset();
  equal(controller.getState().state, "empty");
  deepStrictEqual(controller.getState().draft, DEFAULT_DRAFT);
  equal(controller.getReportText(), null);
  ok(workers[0].terminated, "reset terminates the worker");
});

test("cancel outside busy is a no-op; late result after reset is ignored", () => {
  const { controller, workers } = setup();
  controller.cancel();
  equal(controller.getState().state, "empty");
  const draft = byId["state-cancel-late"].input.draft;
  controller.edit(draft);
  controller.run();
  controller.reset();
  workers[0].deliverRun(draft, 1);
  equal(controller.getState().state, "empty");
  equal(controller.getReportText(), null);
});

test("malformed worker outcome becomes WORKER_ERROR", () => {
  const { controller, workers } = setup();
  controller.edit(byId["state-cancel-late"].input.draft);
  controller.run();
  workers[0].deliver({ generation: 1, outcome: { ok: true } });
  deepStrictEqual(controller.getState().error, {
    code: "WORKER_ERROR",
    field: null,
    row: null,
  });
  equal(controller.getState().state, "error");
});

test("worker creation failure becomes WORKER_ERROR", () => {
  const failing = createController({
    createWorker: () => {
      throw new Error("no workers here");
    },
  });
  failing.edit(byId["state-cancel-late"].input.draft);
  failing.run();
  equal(failing.getState().state, "error");
  deepStrictEqual(failing.getState().error, {
    code: "WORKER_ERROR",
    field: null,
    row: null,
  });
});

test("oversized report becomes OUTPUT_LIMIT with no downloadable result", () => {
  const { controller, workers } = setup();
  controller.edit(byId["state-cancel-late"].input.draft);
  controller.run();
  const huge = {
    rows: [
      {
        label: "x".repeat(2097153),
        px: "1",
        token: "t",
        tokenPx: "1",
        delta: "0",
        status: "exact",
      },
    ],
    outsideCount: 0,
  };
  workers[0].deliver({ generation: 1, outcome: { ok: true, result: huge } });
  equal(controller.getState().state, "error");
  deepStrictEqual(controller.getState().error, {
    code: "OUTPUT_LIMIT",
    field: null,
    row: null,
  });
  equal(controller.getReportText(), null);
});

test("success exposes a canonical report; edit invalidates it", () => {
  const { controller, workers } = setup();
  const draft = byId["state-cancel-late"].input.draft;
  controller.edit(draft);
  controller.run();
  workers[0].deliverRun(draft, 1);
  const text = controller.getReportText();
  ok(text !== null && text.endsWith("}\n"));
  ok(text.startsWith('{"outsideCount":1,'));
  controller.edit({ ...draft, tolerance: "3" });
  equal(controller.getReportText(), null);
  equal(controller.getState().state, "dirty");
});
