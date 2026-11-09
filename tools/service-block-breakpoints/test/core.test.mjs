// Tests for Studio Visit Fee Breakpoints core (solve + flow).
// All expected values are derived independently from SPEC.md and
// fixtures.json — never generated from the implementation's output.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { solve, validate, planCost, normalizeName } from "../public/js/core/solve.mjs";
import { createFlow } from "../public/js/core/flow.mjs";

const fixtures = JSON.parse(
  readFileSync(
    new URL("../../../docs/specs/service-block-breakpoints/fixtures.json", import.meta.url),
    "utf8",
  ),
);

function progressive(name, baseMinor, included, bands) {
  return { name, type: "progressive", baseMinor, included, bands };
}

function blocks(name, baseMinor, included, blockSize, blockMinor) {
  return { name, type: "blocks", baseMinor, included, blockSize, blockMinor };
}

function valid(overrides = {}) {
  return {
    maxVisits: 4,
    plans: [
      blocks("A", 0, 0, 2, 600),
      progressive("B", 0, 0, [{ upTo: null, rateMinor: 350 }]),
    ],
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

// ---- validation: size -----------------------------------------------------

test("SIZE at exactly 65536 / 65537 UTF-8 bytes", () => {
  // SIZE is checked before SHAPE, so a pad key is a valid way to reach
  // the cap: the byte count is measured on the whole JSON input.
  const base = valid();
  const prefix = JSON.stringify({ ...base, pad: "" }).length;
  const atCap = { ...base, pad: "x".repeat(65536 - prefix) };
  assert.strictEqual(
    Buffer.byteLength(JSON.stringify(atCap), "utf8"),
    65536,
  );
  // Exactly at the cap SIZE does not fire; the unknown pad key then
  // reports SHAPE, which proves the SIZE gate itself passed.
  assert.deepStrictEqual(solve(atCap), {
    status: "error",
    error: { code: "SHAPE", path: "" },
  });
  const overCap = { ...base, pad: "x".repeat(65537 - prefix) };
  assert.strictEqual(
    Buffer.byteLength(JSON.stringify(overCap), "utf8"),
    65537,
  );
  errorCase(overCap, "SIZE", "");
});

test("SIZE precedes SHAPE and name validation", () => {
  const base = valid({ plans: [blocks("", 0, 0, 2, 600), blocks("B", 0, 0, 2, 600)] });
  const prefix = JSON.stringify({ ...base, pad: "" }).length;
  const input = { ...base, pad: "x".repeat(65537 - prefix), extra: 1 };
  errorCase(input, "SIZE", "");
});

// ---- validation: shape and types -----------------------------------------

test("unknown root key -> SHAPE at root", () => {
  errorCase(valid({ extra: 1 }), "SHAPE", "");
});

test("missing maxVisits -> SHAPE at /maxVisits", () => {
  const input = valid();
  delete input.maxVisits;
  errorCase(input, "SHAPE", "/maxVisits");
});

test("missing plans -> SHAPE at /plans", () => {
  const input = valid();
  delete input.plans;
  errorCase(input, "SHAPE", "/plans");
});

test("non-object root -> SHAPE at root", () => {
  errorCase(null, "SHAPE", "");
  errorCase([1, 2], "SHAPE", "");
  errorCase("x", "SHAPE", "");
});

test("plans not an array -> TYPE at /plans", () => {
  errorCase(valid({ plans: {} }), "TYPE", "/plans");
});

test("plans length != 2 -> RANGE at /plans", () => {
  errorCase(valid({ plans: [blocks("A", 0, 0, 2, 600)] }), "RANGE", "/plans");
  errorCase(
    valid({
      plans: [
        blocks("A", 0, 0, 2, 600),
        blocks("B", 0, 0, 2, 600),
        blocks("C", 0, 0, 2, 600),
      ],
    }),
    "RANGE",
    "/plans",
  );
});

test("plan not an object -> TYPE at /plans/0", () => {
  errorCase(valid({ plans: ["A", blocks("B", 0, 0, 2, 600)] }), "TYPE", "/plans/0");
});

test("unknown plan key -> SHAPE at /plans/0", () => {
  const plan = blocks("A", 0, 0, 2, 600);
  plan.extra = 1;
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "SHAPE", "/plans/0");
});

test("progressive plan with blockSize -> SHAPE at /plans/0", () => {
  const plan = progressive("A", 0, 0, [{ upTo: null, rateMinor: 10 }]);
  plan.blockSize = 2;
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "SHAPE", "/plans/0");
});

test("blocks plan with bands -> SHAPE at /plans/0", () => {
  const plan = blocks("A", 0, 0, 2, 600);
  plan.bands = [{ upTo: null, rateMinor: 10 }];
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "SHAPE", "/plans/0");
});

test("missing bands -> SHAPE at /plans/0/bands", () => {
  const plan = progressive("A", 0, 0, [{ upTo: null, rateMinor: 10 }]);
  delete plan.bands;
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "SHAPE", "/plans/0/bands");
});

test("missing blockSize -> SHAPE at /plans/0/blockSize", () => {
  const plan = blocks("A", 0, 0, 2, 600);
  delete plan.blockSize;
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "SHAPE", "/plans/0/blockSize");
});

test("missing blockMinor -> SHAPE at /plans/0/blockMinor", () => {
  const plan = blocks("A", 0, 0, 2, 600);
  delete plan.blockMinor;
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "SHAPE", "/plans/0/blockMinor");
});

test("bands not an array -> TYPE at /plans/0/bands", () => {
  const plan = progressive("A", 0, 0, [{ upTo: null, rateMinor: 10 }]);
  plan.bands = {};
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "TYPE", "/plans/0/bands");
});

test("bands length 0 or 6 -> RANGE at /plans/0/bands", () => {
  const empty = progressive("A", 0, 0, []);
  errorCase(valid({ plans: [empty, blocks("B", 0, 0, 2, 600)] }), "RANGE", "/plans/0/bands");
  const six = progressive("A", 0, 0, [
    { upTo: 1, rateMinor: 1 },
    { upTo: 2, rateMinor: 1 },
    { upTo: 3, rateMinor: 1 },
    { upTo: 4, rateMinor: 1 },
    { upTo: 5, rateMinor: 1 },
    { upTo: null, rateMinor: 1 },
  ]);
  errorCase(valid({ plans: [six, blocks("B", 0, 0, 2, 600)] }), "RANGE", "/plans/0/bands");
});

test("band not an object -> TYPE at /plans/0/bands/0", () => {
  const plan = progressive("A", 0, 0, ["x"]);
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "TYPE", "/plans/0/bands/0");
});

test("unknown band key -> SHAPE at /plans/0/bands/0", () => {
  const plan = progressive("A", 0, 0, [{ upTo: null, rateMinor: 10, extra: 1 }]);
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "SHAPE", "/plans/0/bands/0");
});

test("missing band upTo -> SHAPE at /plans/0/bands/0/upTo", () => {
  const plan = progressive("A", 0, 0, [{ rateMinor: 10 }]);
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "SHAPE", "/plans/0/bands/0/upTo");
});

test("missing band rateMinor -> SHAPE at /plans/0/bands/0/rateMinor", () => {
  const plan = progressive("A", 0, 0, [{ upTo: null }]);
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "SHAPE", "/plans/0/bands/0/rateMinor");
});

// ---- validation: integer types and ranges ---------------------------------

test("string numbers, fractions and -0 -> TYPE", () => {
  errorCase(valid({ maxVisits: "4" }), "TYPE", "/maxVisits");
  errorCase(valid({ maxVisits: 4.5 }), "TYPE", "/maxVisits");
  errorCase(valid({ maxVisits: -0 }), "TYPE", "/maxVisits");
  errorCase(valid({ maxVisits: 2 ** 60 }), "TYPE", "/maxVisits");
  const plan = blocks("A", "0", 0, 2, 600);
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "TYPE", "/plans/0/baseMinor");
  const bandPlan = progressive("A", 0, 0, [{ upTo: 1.5, rateMinor: 10 }]);
  errorCase(valid({ plans: [bandPlan, blocks("B", 0, 0, 2, 600)] }), "TYPE", "/plans/0/bands/0/upTo");
  const negZero = progressive("A", 0, 0, [{ upTo: null, rateMinor: -0 }]);
  errorCase(valid({ plans: [negZero, blocks("B", 0, 0, 2, 600)] }), "TYPE", "/plans/0/bands/0/rateMinor");
});

test("integer bounds -> RANGE at the fixed path", () => {
  errorCase(valid({ maxVisits: 241 }), "RANGE", "/maxVisits");
  errorCase(valid({ maxVisits: -1 }), "RANGE", "/maxVisits");
  errorCase(
    valid({ plans: [blocks("A", 1000001, 0, 2, 600), blocks("B", 0, 0, 2, 600)] }),
    "RANGE",
    "/plans/0/baseMinor",
  );
  errorCase(
    valid({ plans: [blocks("A", 0, 241, 2, 600), blocks("B", 0, 0, 2, 600)] }),
    "RANGE",
    "/plans/0/included",
  );
  errorCase(
    valid({ plans: [blocks("A", 0, 0, 0, 600), blocks("B", 0, 0, 2, 600)] }),
    "RANGE",
    "/plans/0/blockSize",
  );
  errorCase(
    valid({ plans: [blocks("A", 0, 0, 241, 600), blocks("B", 0, 0, 2, 600)] }),
    "RANGE",
    "/plans/0/blockSize",
  );
  errorCase(
    valid({ plans: [blocks("A", 0, 0, 2, -1), blocks("B", 0, 0, 2, 600)] }),
    "RANGE",
    "/plans/0/blockMinor",
  );
  const upToZero = progressive("A", 0, 0, [{ upTo: 0, rateMinor: 10 }]);
  errorCase(valid({ plans: [upToZero, blocks("B", 0, 0, 2, 600)] }), "RANGE", "/plans/0/bands/0/upTo");
  const upToHigh = progressive("A", 0, 0, [{ upTo: 241, rateMinor: 10 }]);
  errorCase(valid({ plans: [upToHigh, blocks("B", 0, 0, 2, 600)] }), "RANGE", "/plans/0/bands/0/upTo");
  const rateHigh = progressive("A", 0, 0, [{ upTo: null, rateMinor: 1000001 }]);
  errorCase(valid({ plans: [rateHigh, blocks("B", 0, 0, 2, 600)] }), "RANGE", "/plans/0/bands/0/rateMinor");
});

test("boundary values are accepted", () => {
  const input = valid({
    maxVisits: 240,
    plans: [
      progressive("A", 1000000, 240, [{ upTo: 240, rateMinor: 1000000 }, { upTo: null, rateMinor: 0 }]),
      blocks("B", 1000000, 240, 240, 1000000),
    ],
  });
  assert.strictEqual(solve(input).status, "ok");
  const zero = valid({
    maxVisits: 0,
    plans: [
      progressive("A", 0, 0, [{ upTo: null, rateMinor: 0 }]),
      blocks("B", 0, 0, 1, 0),
    ],
  });
  assert.deepStrictEqual(solve(zero), {
    status: "ok",
    result: {
      visits: [{ count: 0, aMinor: 0, bMinor: 0, relation: "equal" }],
      spans: [{ from: 0, to: 0, relation: "equal" }],
    },
  });
});

test("unknown plan type -> ENUM at /plans/0/type", () => {
  const plan = blocks("A", 0, 0, 2, 600);
  plan.type = "other";
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "ENUM", "/plans/0/type");
  const nonString = blocks("A", 0, 0, 2, 600);
  nonString.type = 1;
  errorCase(valid({ plans: [nonString, blocks("B", 0, 0, 2, 600)] }), "ENUM", "/plans/0/type");
});

// ---- validation: names ------------------------------------------------------

test("name rules: trim, NFC, first character, charset, length", () => {
  assert.deepStrictEqual(normalizeName(" A "), { ok: true, name: "A" });
  assert.deepStrictEqual(normalizeName("1A"), { ok: true, name: "1A" });
  assert.deepStrictEqual(normalizeName("A B-c_d"), { ok: true, name: "A B-c_d" });
  // NFC: e + combining acute becomes the single code point U+00E9.
  assert.deepStrictEqual(normalizeName("é"), { ok: true, name: "é" });
  assert.deepStrictEqual(normalizeName(12), { ok: false, code: "TYPE" });
  assert.deepStrictEqual(normalizeName(""), { ok: false, code: "RANGE" });
  assert.deepStrictEqual(normalizeName("   "), { ok: false, code: "RANGE" });
  assert.deepStrictEqual(normalizeName("-A"), { ok: false, code: "RANGE" });
  assert.deepStrictEqual(normalizeName("A/B"), { ok: false, code: "RANGE" });
  assert.deepStrictEqual(normalizeName("<b>x</b>"), { ok: false, code: "RANGE" });
  assert.deepStrictEqual(normalizeName("A".repeat(25)), { ok: false, code: "RANGE" });
  assert.deepStrictEqual(normalizeName("A".repeat(24)), { ok: true, name: "A".repeat(24) });
  // 24 accented letters are 24 code points even though they are 48
  // UTF-16 units when written with combining marks.
  assert.deepStrictEqual(normalizeName("é".repeat(24)), { ok: true, name: "é".repeat(24) });
  // An emoji is neither a Unicode letter nor a digit, so it cannot be
  // the first character of a name.
  assert.deepStrictEqual(normalizeName("😀".repeat(24)), { ok: false, code: "RANGE" });
});

test("duplicate plan names -> DUPLICATE at /plans/1/name", () => {
  errorCase(
    valid({ plans: [blocks("A", 0, 0, 2, 600), blocks("A", 0, 0, 2, 600)] }),
    "DUPLICATE",
    "/plans/1/name",
  );
  // Genuine NFC pair: U+00E9 vs U+0065 + U+0301 normalize to the same name.
  errorCase(
    valid({ plans: [blocks("é", 0, 0, 2, 600), blocks("é", 0, 0, 2, 600)] }),
    "DUPLICATE",
    "/plans/1/name",
  );
  // Case-sensitive: "A" and "a" are different names.
  assert.strictEqual(
    solve(valid({ plans: [blocks("A", 0, 0, 2, 600), blocks("a", 0, 0, 2, 600)] })).status,
    "ok",
  );
});

test("blank name -> RANGE at /plans/0/name", () => {
  errorCase(
    valid({ plans: [blocks("", 0, 0, 2, 600), blocks("B", 0, 0, 2, 600)] }),
    "RANGE",
    "/plans/0/name",
  );
});

// ---- validation: band order -------------------------------------------------

test("non-last null upTo -> BAND_ORDER at that band", () => {
  const plan = progressive("A", 0, 0, [
    { upTo: null, rateMinor: 10 },
    { upTo: null, rateMinor: 20 },
  ]);
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "BAND_ORDER", "/plans/0/bands/0/upTo");
});

test("decreasing finite bounds -> BAND_ORDER at the later band", () => {
  const plan = progressive("A", 0, 0, [
    { upTo: 3, rateMinor: 10 },
    { upTo: 2, rateMinor: 20 },
    { upTo: null, rateMinor: 30 },
  ]);
  errorCase(valid({ plans: [plan, blocks("B", 0, 0, 2, 600)] }), "BAND_ORDER", "/plans/0/bands/1/upTo");
});

test("BAND_ORDER is checked on the second plan too", () => {
  const plan = progressive("B", 0, 0, [{ upTo: 5, rateMinor: 10 }]);
  errorCase(valid({ plans: [blocks("A", 0, 0, 2, 600), plan] }), "BAND_ORDER", "/plans/1/bands/0/upTo");
});

test("DUPLICATE is reported before BAND_ORDER", () => {
  const planA = progressive("A", 0, 0, [{ upTo: 5, rateMinor: 10 }]);
  const planB = progressive("A", 0, 0, [{ upTo: 5, rateMinor: 10 }]);
  errorCase(valid({ plans: [planA, planB] }), "DUPLICATE", "/plans/1/name");
});

// ---- algorithm --------------------------------------------------------------

test("blocks round up per block; included visits are free", () => {
  const input = {
    maxVisits: 5,
    plans: [
      blocks("A", 5, 2, 2, 100),
      progressive("B", 5, 0, [{ upTo: null, rateMinor: 0 }]),
    ],
  };
  assert.deepStrictEqual(solve(input), {
    status: "ok",
    result: {
      visits: [
        { count: 0, aMinor: 5, bMinor: 5, relation: "equal" },
        { count: 1, aMinor: 5, bMinor: 5, relation: "equal" },
        { count: 2, aMinor: 5, bMinor: 5, relation: "equal" },
        { count: 3, aMinor: 105, bMinor: 5, relation: "B" },
        { count: 4, aMinor: 105, bMinor: 5, relation: "B" },
        { count: 5, aMinor: 205, bMinor: 5, relation: "B" },
      ],
      spans: [
        { from: 0, to: 2, relation: "equal" },
        { from: 3, to: 5, relation: "B" },
      ],
    },
  });
});

test("progressive bands are marginal on extra visits only", () => {
  const plan = progressive("A", 10, 2, [
    { upTo: 2, rateMinor: 5 },
    { upTo: null, rateMinor: 7 },
  ]);
  assert.strictEqual(planCost(plan, 0), 10);
  assert.strictEqual(planCost(plan, 2), 10);
  assert.strictEqual(planCost(plan, 3), 15);
  assert.strictEqual(planCost(plan, 4), 20);
  assert.strictEqual(planCost(plan, 5), 27);
  assert.strictEqual(planCost(plan, 6), 34);
  // A band fully above the extra count contributes nothing.
  const narrow = progressive("B", 0, 0, [
    { upTo: 1, rateMinor: 100 },
    { upTo: null, rateMinor: 1 },
  ]);
  assert.strictEqual(planCost(narrow, 1), 100);
  assert.strictEqual(planCost(narrow, 2), 101);
});

test("blocks at x=0 buy zero blocks but keep the base fee", () => {
  assert.strictEqual(planCost(blocks("A", 5, 0, 1, 100), 0), 5);
  assert.strictEqual(planCost(blocks("A", 5, 3, 1, 100), 2), 5);
  assert.strictEqual(planCost(blocks("A", 5, 3, 1, 100), 4), 105);
});

test("maximum case: 240 visits, 5 bands, full rates stay in safe integers", () => {
  const input = {
    maxVisits: 240,
    plans: [
      progressive("A", 1000000, 0, [
        { upTo: 1, rateMinor: 1000000 },
        { upTo: 2, rateMinor: 1000000 },
        { upTo: 3, rateMinor: 1000000 },
        { upTo: 4, rateMinor: 1000000 },
        { upTo: null, rateMinor: 1000000 },
      ]),
      progressive("B", 0, 0, [{ upTo: null, rateMinor: 0 }]),
    ],
  };
  const out = solve(input);
  assert.strictEqual(out.status, "ok");
  assert.strictEqual(out.result.visits.length, 241);
  assert.strictEqual(out.result.visits[240].aMinor, 241000000);
  assert.strictEqual(out.result.visits[240].bMinor, 0);
  // A charges 1,000,000 + 1,000,000 per visit while B always charges 0,
  // so B is the lower plan at every count.
  assert.deepStrictEqual(out.result.spans, [{ from: 0, to: 240, relation: "B" }]);
});

test("solve does not mutate its input", () => {
  const input = valid();
  const frozen = JSON.parse(JSON.stringify(input));
  Object.freeze(input);
  Object.freeze(input.plans);
  Object.freeze(input.plans[0]);
  Object.freeze(input.plans[1]);
  Object.freeze(input.plans[1].bands);
  Object.freeze(input.plans[1].bands[0]);
  assert.strictEqual(solve(input).status, "ok");
  assert.deepStrictEqual(input, frozen);
});

test("validate returns the data on success and the error on failure", () => {
  assert.deepStrictEqual(validate(valid()).ok, true);
  assert.deepStrictEqual(validate(valid({ maxVisits: 241 })), {
    ok: false,
    error: { code: "RANGE", path: "/maxVisits" },
  });
});

// ---- flow extras --------------------------------------------------------------

test("flow: reset returns to empty", () => {
  const flow = createFlow();
  flow.edit(valid());
  flow.run(1);
  flow.settle(1);
  assert.strictEqual(flow.snapshot().phase, "ready");
  flow.reset();
  assert.deepStrictEqual(flow.snapshot(), { phase: "empty", result: null, error: null });
});

test("flow: fail then edit returns to dirty and keeps the new draft", () => {
  const flow = createFlow();
  flow.edit(valid());
  flow.fail({ code: "SYNTAX", path: "/maxVisits" });
  assert.strictEqual(flow.snapshot().phase, "error");
  flow.edit(valid({ maxVisits: 2 }));
  assert.deepStrictEqual(flow.snapshot(), { phase: "dirty", result: null, error: null });
  flow.run(1);
  flow.settle(1);
  assert.strictEqual(flow.snapshot().phase, "ready");
  assert.strictEqual(flow.snapshot().result.visits.length, 3);
});

test("flow: stale error reply cannot overwrite a newer ready state", () => {
  const flow = createFlow();
  flow.edit(valid());
  flow.run(1);
  flow.settle(1);
  assert.strictEqual(flow.snapshot().phase, "ready");
  flow.settleWith(1, { status: "error", error: { code: "RANGE", path: "/maxVisits" } });
  assert.strictEqual(flow.snapshot().phase, "ready");
  assert.strictEqual(flow.snapshot().error, null);
});

test("flow: run while busy is ignored; cancel while idle is a no-op", () => {
  const flow = createFlow();
  flow.edit(valid());
  flow.run(1);
  flow.run(2);
  flow.settle(2);
  assert.strictEqual(flow.snapshot().phase, "busy");
  flow.settle(1);
  assert.strictEqual(flow.snapshot().phase, "ready");
  flow.cancel();
  assert.strictEqual(flow.snapshot().phase, "ready");
});

test("flow: sample load stays dirty until run", () => {
  const flow = createFlow();
  flow.edit(fixtures.cases[0].input);
  assert.deepStrictEqual(flow.snapshot(), { phase: "dirty", result: null, error: null });
});
