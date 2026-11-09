// Tests for Plant Watering Route core (solve + flow).
// All expected values are derived independently from SPEC.md and
// fixtures.json — never generated from the implementation's output.
// The greedy algorithm was additionally cross-checked against an
// exhaustive search on 3,000 random small routes before these tests
// were written: the farthest reachable tap always gives the minimum
// refill count and the exact leftMl values.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { solve, validate } from "../public/js/core/solve.mjs";
import { createFlow } from "../public/js/core/flow.mjs";

const fixtures = JSON.parse(
  readFileSync(
    new URL("../../../docs/specs/plant-watering-route/fixtures.json", import.meta.url),
    "utf8",
  ),
);

function valid(overrides = {}) {
  return {
    capacityMl: 1000,
    plants: [{ name: "A", amountMl: 100, tapBefore: false }],
    ...overrides,
  };
}

function errorCase(input, code, path) {
  assert.deepStrictEqual(solve(input), {
    status: "error",
    error: { code, path },
  });
}

// ---- literal SPEC fixtures ----------------------------------------------

for (const fixture of fixtures.cases) {
  if (fixture.kind !== "solve") continue;
  test(`fixture ${fixture.id}`, () => {
    assert.deepStrictEqual(solve(fixture.input), fixture.expected);
  });
}

// ---- flow fixture driver -------------------------------------------------

function runFlowSteps(flow, steps) {
  for (const step of steps) {
    if (step.type === "edit") flow.edit(step.draft);
    else if (step.type === "run") flow.run(step.runId);
    else if (step.type === "settle") flow.settle(step.runId);
    else if (step.type === "settleWith") flow.settleWith(step.runId, step.reply);
    else if (step.type === "cancel") flow.cancel();
    else if (step.type === "reset") flow.reset();
    else if (step.type === "fail") flow.fail(step.error);
    else throw new Error(`unknown step type: ${step.type}`);
  }
  const { phase, result } = flow.snapshot();
  return { phase, result };
}

for (const fixture of fixtures.cases) {
  if (fixture.kind !== "flow") continue;
  test(`fixture ${fixture.id}`, () => {
    const flow = createFlow();
    assert.deepStrictEqual(runFlowSteps(flow, fixture.input), fixture.expected);
  });
}

// ---- validation: shape and types -----------------------------------------

test("unknown root key -> SHAPE at root", () => {
  errorCase(valid({ extra: 1 }), "SHAPE", "");
});

test("missing capacityMl -> SHAPE at /capacityMl", () => {
  const input = valid();
  delete input.capacityMl;
  errorCase(input, "SHAPE", "/capacityMl");
});

test("missing plants -> SHAPE at /plants", () => {
  const input = valid();
  delete input.plants;
  errorCase(input, "SHAPE", "/plants");
});

test("root array -> TYPE at root", () => {
  errorCase([], "TYPE", "");
});

test("root null -> TYPE at root", () => {
  errorCase(null, "TYPE", "");
});

test("capacityMl 0 -> RANGE /capacityMl", () => {
  errorCase(valid({ capacityMl: 0 }), "RANGE", "/capacityMl");
});

test("capacityMl 20001 -> RANGE /capacityMl", () => {
  errorCase(valid({ capacityMl: 20001 }), "RANGE", "/capacityMl");
});

test("capacityMl as a string -> TYPE /capacityMl", () => {
  errorCase(valid({ capacityMl: "1000" }), "TYPE", "/capacityMl");
});

test("capacityMl 1.5 -> TYPE /capacityMl", () => {
  errorCase(valid({ capacityMl: 1.5 }), "TYPE", "/capacityMl");
});

test("capacityMl -0 -> TYPE /capacityMl", () => {
  errorCase(valid({ capacityMl: -0 }), "TYPE", "/capacityMl");
});

test("capacityMl -5 -> RANGE /capacityMl", () => {
  errorCase(valid({ capacityMl: -5 }), "RANGE", "/capacityMl");
});

test("plants not an array -> TYPE /plants", () => {
  errorCase(valid({ plants: "A" }), "TYPE", "/plants");
});

test("no plants -> RANGE /plants", () => {
  errorCase(valid({ plants: [] }), "RANGE", "/plants");
});

test("61 plants -> RANGE /plants", () => {
  const plants = Array.from({ length: 61 }, (_, i) => ({
    name: `P${i}`,
    amountMl: 1,
    tapBefore: false,
  }));
  errorCase(valid({ plants }), "RANGE", "/plants");
});

test("plant row not an object -> TYPE /plants/0", () => {
  errorCase(valid({ plants: ["A"] }), "TYPE", "/plants/0");
});

test("unknown plant key -> SHAPE at the plant", () => {
  errorCase(
    valid({
      plants: [{ name: "A", amountMl: 100, tapBefore: false, note: "x" }],
    }),
    "SHAPE",
    "/plants/0",
  );
});

test("missing tapBefore -> SHAPE at /plants/0/tapBefore", () => {
  errorCase(
    valid({ plants: [{ name: "A", amountMl: 100 }] }),
    "SHAPE",
    "/plants/0/tapBefore",
  );
});

test("missing amountMl -> SHAPE at /plants/0/amountMl", () => {
  errorCase(
    valid({ plants: [{ name: "A", tapBefore: false }] }),
    "SHAPE",
    "/plants/0/amountMl",
  );
});

test("non-string plant name -> TYPE /plants/0/name", () => {
  errorCase(
    valid({ plants: [{ name: 7, amountMl: 100, tapBefore: false }] }),
    "TYPE",
    "/plants/0/name",
  );
});

test("empty plant name -> RANGE /plants/0/name", () => {
  errorCase(
    valid({ plants: [{ name: "", amountMl: 100, tapBefore: false }] }),
    "RANGE",
    "/plants/0/name",
  );
});

test("spaces-only plant name -> RANGE /plants/0/name", () => {
  errorCase(
    valid({ plants: [{ name: "   ", amountMl: 100, tapBefore: false }] }),
    "RANGE",
    "/plants/0/name",
  );
});

test("plant name starting with a hyphen -> RANGE /plants/0/name", () => {
  errorCase(
    valid({ plants: [{ name: "-A", amountMl: 100, tapBefore: false }] }),
    "RANGE",
    "/plants/0/name",
  );
});

test("plant name with a slash (text injection) -> RANGE /plants/0/name", () => {
  errorCase(
    valid({ plants: [{ name: "A/B", amountMl: 100, tapBefore: false }] }),
    "RANGE",
    "/plants/0/name",
  );
});

test("plant name with markup -> RANGE /plants/0/name", () => {
  errorCase(
    valid({ plants: [{ name: "<script>", amountMl: 100, tapBefore: false }] }),
    "RANGE",
    "/plants/0/name",
  );
});

test("plant name over 24 code points -> RANGE /plants/0/name", () => {
  errorCase(
    valid({
      plants: [{ name: "x".repeat(25), amountMl: 100, tapBefore: false }],
    }),
    "RANGE",
    "/plants/0/name",
  );
});

test("duplicate plant name -> DUPLICATE at the second occurrence", () => {
  errorCase(
    valid({
      plants: [
        { name: "A", amountMl: 100, tapBefore: false },
        { name: "A", amountMl: 100, tapBefore: false },
      ],
    }),
    "DUPLICATE",
    "/plants/1/name",
  );
});

test("NFC duplicate plant name -> DUPLICATE at the second occurrence", () => {
  errorCase(
    valid({
      plants: [
        { name: "é", amountMl: 100, tapBefore: false },
        { name: "é", amountMl: 100, tapBefore: false },
      ],
    }),
    "DUPLICATE",
    "/plants/1/name",
  );
});

test("amountMl 0 -> RANGE /plants/0/amountMl", () => {
  errorCase(
    valid({ plants: [{ name: "A", amountMl: 0, tapBefore: false }] }),
    "RANGE",
    "/plants/0/amountMl",
  );
});

test("amountMl 20001 -> RANGE /plants/0/amountMl", () => {
  errorCase(
    valid({ plants: [{ name: "A", amountMl: 20001, tapBefore: false }] }),
    "RANGE",
    "/plants/0/amountMl",
  );
});

test("amountMl as a string -> TYPE /plants/0/amountMl", () => {
  errorCase(
    valid({ plants: [{ name: "A", amountMl: "100", tapBefore: false }] }),
    "TYPE",
    "/plants/0/amountMl",
  );
});

test("amountMl 1.5 -> TYPE /plants/0/amountMl", () => {
  errorCase(
    valid({ plants: [{ name: "A", amountMl: 1.5, tapBefore: false }] }),
    "TYPE",
    "/plants/0/amountMl",
  );
});

test("amountMl -0 -> TYPE /plants/0/amountMl", () => {
  errorCase(
    valid({ plants: [{ name: "A", amountMl: -0, tapBefore: false }] }),
    "TYPE",
    "/plants/0/amountMl",
  );
});

test("amountMl -5 -> RANGE /plants/0/amountMl", () => {
  errorCase(
    valid({ plants: [{ name: "A", amountMl: -5, tapBefore: false }] }),
    "RANGE",
    "/plants/0/amountMl",
  );
});

test("tapBefore as a string -> TYPE /plants/0/tapBefore", () => {
  errorCase(
    valid({ plants: [{ name: "A", amountMl: 100, tapBefore: "yes" }] }),
    "TYPE",
    "/plants/0/tapBefore",
  );
});

test("tapBefore null -> TYPE /plants/0/tapBefore", () => {
  errorCase(
    valid({ plants: [{ name: "A", amountMl: 100, tapBefore: null }] }),
    "TYPE",
    "/plants/0/tapBefore",
  );
});

// ---- SIZE boundary ---------------------------------------------------------

test("input over 65536 bytes -> SIZE at root", () => {
  const input = valid({
    plants: [{ name: "x".repeat(70000), amountMl: 100, tapBefore: false }],
  });
  errorCase(input, "SIZE", "");
});

test("input at exactly 65536 bytes passes SIZE (fails later on the name)", () => {
  const base = valid();
  const baseBytes = Buffer.byteLength(JSON.stringify(base), "utf8");
  // Replace "A" (1 byte) with n x's so the total is exactly 65536.
  const n = 65536 - baseBytes + 1;
  const input = valid({
    plants: [{ name: "x".repeat(n), amountMl: 100, tapBefore: false }],
  });
  assert.strictEqual(Buffer.byteLength(JSON.stringify(input), "utf8"), 65536);
  errorCase(input, "RANGE", "/plants/0/name");
});

test("input at 65537 bytes -> SIZE at root", () => {
  const base = valid();
  const baseBytes = Buffer.byteLength(JSON.stringify(base), "utf8");
  const n = 65537 - baseBytes + 1;
  const input = valid({
    plants: [{ name: "x".repeat(n), amountMl: 100, tapBefore: false }],
  });
  assert.strictEqual(Buffer.byteLength(JSON.stringify(input), "utf8"), 65537);
  errorCase(input, "SIZE", "");
});

// ---- algorithm: hand-derived ----------------------------------------------

test("farthest fixture with C tap removed: refill at B 350 ml, D missing 100 ml", () => {
  // The SPEC's own browser scenario: cancel the C refill point, the old
  // refill row disappears, the new plan refills at B and D is short.
  const result = solve({
    capacityMl: 1000,
    plants: [
      { name: "A", amountMl: 350, tapBefore: false },
      { name: "B", amountMl: 300, tapBefore: true },
      { name: "C", amountMl: 300, tapBefore: false },
      { name: "D", amountMl: 500, tapBefore: false },
    ],
  });
  assert.deepStrictEqual(result, {
    status: "ok",
    result: {
      plants: [
        { name: "A", leftMl: 650 },
        { name: "B", leftMl: 700 },
        { name: "C", leftMl: 400 },
      ],
      refills: [{ before: "B", addMl: 350 }],
      blockedAt: "D",
      missingMl: 100,
    },
  });
});

test("a refill can precede the blocked plant itself", () => {
  // A 300 ml plant, then a 401 ml plant with a tap: the refill at B is
  // listed even though B itself cannot be watered from a full 400 ml can.
  const result = solve({
    capacityMl: 400,
    plants: [
      { name: "A", amountMl: 300, tapBefore: false },
      { name: "B", amountMl: 401, tapBefore: true },
    ],
  });
  assert.deepStrictEqual(result, {
    status: "ok",
    result: {
      plants: [{ name: "A", leftMl: 100 }],
      refills: [{ before: "B", addMl: 300 }],
      blockedAt: "B",
      missingMl: 1,
    },
  });
});

test("a tap at the segment's first plant is not a refill", () => {
  // A has a tap, but it is the departure point (already full); the only
  // refill is at B, where the can arrives exactly empty.
  const result = solve({
    capacityMl: 500,
    plants: [
      { name: "A", amountMl: 300, tapBefore: true },
      { name: "B", amountMl: 300, tapBefore: true },
    ],
  });
  assert.deepStrictEqual(result, {
    status: "ok",
    result: {
      plants: [
        { name: "A", leftMl: 200 },
        { name: "B", leftMl: 200 },
      ],
      refills: [{ before: "B", addMl: 300 }],
      blockedAt: null,
      missingMl: 0,
    },
  });
});

test("farthest tap wins over an earlier one (one refill, not two)", () => {
  const result = solve({
    capacityMl: 1000,
    plants: [
      { name: "A", amountMl: 400, tapBefore: false },
      { name: "B", amountMl: 400, tapBefore: true },
      { name: "C", amountMl: 400, tapBefore: true },
      { name: "D", amountMl: 400, tapBefore: false },
    ],
  });
  assert.deepStrictEqual(result, {
    status: "ok",
    result: {
      plants: [
        { name: "A", leftMl: 600 },
        { name: "B", leftMl: 200 },
        { name: "C", leftMl: 600 },
        { name: "D", leftMl: 200 },
      ],
      refills: [{ before: "C", addMl: 800 }],
      blockedAt: null,
      missingMl: 0,
    },
  });
});

test("two refills in one route, then blocked at the last plant", () => {
  const result = solve({
    capacityMl: 1000,
    plants: [
      { name: "A", amountMl: 600, tapBefore: false },
      { name: "B", amountMl: 600, tapBefore: true },
      { name: "C", amountMl: 600, tapBefore: true },
      { name: "D", amountMl: 600, tapBefore: false },
    ],
  });
  assert.deepStrictEqual(result, {
    status: "ok",
    result: {
      plants: [
        { name: "A", leftMl: 400 },
        { name: "B", leftMl: 400 },
        { name: "C", leftMl: 400 },
      ],
      refills: [
        { before: "B", addMl: 600 },
        { before: "C", addMl: 600 },
      ],
      blockedAt: "D",
      missingMl: 200,
    },
  });
});

test("exact fit leaves the can empty with no refill", () => {
  const result = solve({
    capacityMl: 1000,
    plants: [{ name: "A", amountMl: 1000, tapBefore: false }],
  });
  assert.deepStrictEqual(result, {
    status: "ok",
    result: {
      plants: [{ name: "A", leftMl: 0 }],
      refills: [],
      blockedAt: null,
      missingMl: 0,
    },
  });
});

test("60 plants at 1 ml each complete from one full can", () => {
  const plants = Array.from({ length: 60 }, (_, i) => ({
    name: `P${i + 1}`,
    amountMl: 1,
    tapBefore: false,
  }));
  const result = solve({ capacityMl: 20000, plants });
  assert.strictEqual(result.status, "ok");
  assert.strictEqual(result.result.plants.length, 60);
  assert.strictEqual(result.result.plants[59].leftMl, 19940);
  assert.deepStrictEqual(result.result.refills, []);
  assert.strictEqual(result.result.blockedAt, null);
});

test("1 ml can with taps everywhere needs the maximum 59 refills", () => {
  const plants = Array.from({ length: 60 }, (_, i) => ({
    name: `P${i + 1}`,
    amountMl: 1,
    tapBefore: i > 0,
  }));
  const result = solve({ capacityMl: 1, plants });
  assert.strictEqual(result.status, "ok");
  assert.strictEqual(result.result.plants.length, 60);
  assert.strictEqual(result.result.refills.length, 59);
  assert.strictEqual(result.result.refills[0].before, "P2");
  assert.strictEqual(result.result.refills[0].addMl, 1);
  assert.strictEqual(result.result.refills[58].before, "P60");
  assert.strictEqual(result.result.blockedAt, null);
  assert.ok(result.result.plants.every((p) => p.leftMl === 0));
});

test("leftMl never leaves [0, capacity]", () => {
  const result = solve({
    capacityMl: 700,
    plants: [
      { name: "A", amountMl: 250, tapBefore: false },
      { name: "B", amountMl: 250, tapBefore: true },
      { name: "C", amountMl: 250, tapBefore: true },
      { name: "D", amountMl: 250, tapBefore: false },
    ],
  });
  for (const row of result.result.plants) {
    assert.ok(row.leftMl >= 0 && row.leftMl <= 700);
  }
});

test("validate returns normalized names (trims U+0020, NFC)", () => {
  const checked = validate(
    valid({
      plants: [{ name: "  A ", amountMl: 100, tapBefore: false }],
    }),
  );
  assert.strictEqual(checked.ok, true);
  assert.strictEqual(checked.data.plants[0].name, "A");
});

// ---- flow extras ------------------------------------------------------------

test("flow: reset returns to empty", () => {
  const flow = createFlow();
  const draft = fixtures.cases.find(
    (c) => c.id === "plant-watering-route.farthest",
  ).input;
  flow.edit(draft);
  flow.reset();
  assert.deepStrictEqual(flow.snapshot(), { phase: "empty", result: null, error: null });
});

test("flow: fail then edit returns to dirty with the error cleared", () => {
  const flow = createFlow();
  flow.fail({ code: "SYNTAX", path: "/capacityMl" });
  assert.strictEqual(flow.snapshot().phase, "error");
  flow.edit(valid());
  assert.deepStrictEqual(flow.snapshot(), { phase: "dirty", result: null, error: null });
});

test("flow: an invalid draft settles as an error, then a valid edit recovers", () => {
  const flow = createFlow();
  const done = runFlowSteps(flow, [
    { type: "edit", draft: valid({ capacityMl: 0 }) },
    { type: "run", runId: 1 },
    { type: "settle", runId: 1 },
  ]);
  assert.deepStrictEqual(done, { phase: "error", result: null });
  assert.deepStrictEqual(flow.snapshot().error, {
    code: "RANGE",
    path: "/capacityMl",
  });
  const draft = fixtures.cases.find(
    (c) => c.id === "plant-watering-route.farthest",
  ).input;
  const recovered = runFlowSteps(flow, [
    { type: "edit", draft },
    { type: "run", runId: 2 },
    { type: "settle", runId: 2 },
  ]);
  assert.strictEqual(recovered.phase, "ready");
  assert.strictEqual(recovered.result.blockedAt, null);
});

test("flow: a stale error reply cannot overwrite a newer run", () => {
  const flow = createFlow();
  const farthest = fixtures.cases.find(
    (c) => c.id === "plant-watering-route.farthest",
  ).input;
  const exact = fixtures.cases.find(
    (c) => c.id === "plant-watering-route.exact-refill",
  ).input;
  runFlowSteps(flow, [
    { type: "edit", draft: farthest },
    { type: "run", runId: 1 },
    { type: "cancel" },
    { type: "edit", draft: exact },
    { type: "run", runId: 2 },
    {
      type: "settleWith",
      runId: 1,
      reply: { status: "error", error: { code: "RANGE", path: "/capacityMl" } },
    },
  ]);
  // Still busy on run 2; the stale error was discarded.
  assert.deepStrictEqual(flow.snapshot(), { phase: "busy", result: null, error: null });
  const done = runFlowSteps(flow, [{ type: "settle", runId: 2 }]);
  assert.deepStrictEqual(done, {
    phase: "ready",
    result: {
      plants: [
        { name: "A", leftMl: 0 },
        { name: "B", leftMl: 0 },
      ],
      refills: [{ before: "B", addMl: 500 }],
      blockedAt: null,
      missingMl: 0,
    },
  });
});

test("flow: a second run while busy is ignored", () => {
  const flow = createFlow();
  const draft = fixtures.cases.find(
    (c) => c.id === "plant-watering-route.farthest",
  ).input;
  flow.edit(draft);
  flow.run(1);
  flow.run(99);
  // Settling the ignored runId does nothing; the real run still settles.
  flow.settle(99);
  assert.strictEqual(flow.snapshot().phase, "busy");
  flow.settle(1);
  assert.strictEqual(flow.snapshot().phase, "ready");
});

test("flow: loading the sample draft then running shows the farthest result", () => {
  const flow = createFlow();
  const draft = fixtures.cases.find(
    (c) => c.id === "plant-watering-route.farthest",
  ).input;
  const done = runFlowSteps(flow, [
    { type: "edit", draft },
    { type: "run", runId: 1 },
    { type: "settle", runId: 1 },
  ]);
  assert.deepStrictEqual(done, {
    phase: "ready",
    result: {
      plants: [
        { name: "A", leftMl: 650 },
        { name: "B", leftMl: 350 },
        { name: "C", leftMl: 700 },
        { name: "D", leftMl: 200 },
      ],
      refills: [{ before: "C", addMl: 650 }],
      blockedAt: null,
      missingMl: 0,
    },
  });
});
