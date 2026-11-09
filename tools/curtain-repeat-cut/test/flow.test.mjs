import test from "node:test";
import assert from "node:assert/strict";
import {
  createFlow,
  emptyDraft,
  SAMPLE_DRAFT,
} from "../public/js/core/curtain-repeat-cut.mjs";

// Flow cases transcribed from docs/specs/curtain-repeat-cut/fixtures.json
// (dirty-after-edit, cancel-then-late) plus the SPEC's state rules.

const MATCHED_DRAFT = {
  stockMm: 4000, repeatMm: 320, headPhaseMm: 80, motifPhaseMm: 0,
  panels: [
    { name: "A", finishedMm: 1500, topMm: 50, bottomMm: 70 },
    { name: "B", finishedMm: 1500, topMm: 50, bottomMm: 70 },
  ],
};

const PLAIN_DRAFT = {
  stockMm: 1800, repeatMm: 0, headPhaseMm: 0, motifPhaseMm: 0,
  panels: [
    { name: "A", finishedMm: 800, topMm: 50, bottomMm: 50 },
    { name: "B", finishedMm: 700, topMm: 20, bottomMm: 30 },
  ],
};

const PLAIN_RESULT = {
  cuts: [
    { name: "A", skipMm: 0, startMm: 0, endMm: 900 },
    { name: "B", skipMm: 0, startMm: 900, endMm: 1650 },
  ],
  neededMm: 1650, wasteMm: 0, spareMm: 150, shortageMm: 0,
};

test("fixture dirty-after-edit: a settled result is cleared the moment the draft changes", () => {
  const flow = createFlow();
  assert.equal(flow.phase, "empty");
  flow.edit(MATCHED_DRAFT);
  assert.equal(flow.phase, "dirty");
  flow.run(1);
  assert.equal(flow.phase, "busy");
  flow.settle(1);
  assert.equal(flow.phase, "ready");
  assert.ok(flow.result);
  flow.edit(PLAIN_DRAFT);
  assert.deepStrictEqual(flow.state(), { phase: "dirty", result: null, error: null });
});

test("fixture cancel-then-late: cancel invalidates run 1; a late settle for run 1 cannot overwrite run 2", () => {
  const flow = createFlow();
  flow.edit(MATCHED_DRAFT);
  flow.run(1);
  flow.cancel();
  assert.deepStrictEqual(flow.state(), { phase: "dirty", result: null, error: null });
  flow.edit(PLAIN_DRAFT);
  flow.run(2);
  flow.settle(2);
  assert.deepStrictEqual(flow.state(), { phase: "ready", result: PLAIN_RESULT, error: null });
  flow.settle(1);
  assert.deepStrictEqual(flow.state(), { phase: "ready", result: PLAIN_RESULT, error: null });
});

test("run while busy is ignored; settle with the wrong runId is ignored", () => {
  const flow = createFlow();
  flow.edit(MATCHED_DRAFT);
  flow.run(1);
  flow.run(2);
  assert.equal(flow.pendingRunId, 1);
  flow.settle(2);
  assert.equal(flow.phase, "busy");
  flow.settle(1);
  assert.equal(flow.phase, "ready");
});

test("a failing solve lands in error and keeps the draft; a fix returns to dirty", () => {
  const flow = createFlow();
  flow.edit({ ...MATCHED_DRAFT, repeatMm: 0, headPhaseMm: 1 });
  flow.run(1);
  flow.settle(1);
  assert.deepStrictEqual(flow.state(), {
    phase: "error",
    result: null,
    error: { code: "PHASE", path: "/headPhaseMm" },
  });
  assert.equal(flow.draft.headPhaseMm, 1);
  flow.edit({ ...MATCHED_DRAFT, repeatMm: 0, headPhaseMm: 0, motifPhaseMm: 0 });
  assert.equal(flow.phase, "dirty");
  assert.equal(flow.error, null);
});

test("reset returns to the initial empty draft and clears result, error and pending runs", () => {
  const flow = createFlow();
  flow.edit(MATCHED_DRAFT);
  flow.run(1);
  flow.settle(1);
  flow.reset();
  assert.deepStrictEqual(flow.state(), { phase: "empty", result: null, error: null });
  assert.deepStrictEqual(flow.draft, emptyDraft());
  flow.settle(1);
  assert.equal(flow.phase, "empty");
});

test("loading the sample is still dirty, not ready", () => {
  const flow = createFlow();
  flow.loadSample();
  assert.equal(flow.phase, "dirty");
  assert.equal(flow.result, null);
  assert.deepStrictEqual(flow.draft, SAMPLE_DRAFT);
  flow.run(7);
  flow.settle(7);
  assert.equal(flow.phase, "ready");
  assert.equal(flow.result.neededMm, 3730);
});

test("cancel from dirty is a no-op; editing while busy invalidates the pending run", () => {
  const flow = createFlow();
  flow.edit(MATCHED_DRAFT);
  flow.cancel();
  assert.equal(flow.phase, "dirty");
  flow.run(1);
  flow.edit(PLAIN_DRAFT);
  assert.equal(flow.phase, "dirty");
  flow.settle(1);
  assert.equal(flow.phase, "dirty");
  assert.equal(flow.result, null);
});
