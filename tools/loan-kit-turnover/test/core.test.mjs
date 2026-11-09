// Tests for Loan Kit Turnover Check core (solve + flow).
// All expected values are derived independently from SPEC.md and
// fixtures.json — never generated from the implementation's output.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { solve, validate } from "../public/js/core/solve.mjs";
import { createFlow } from "../public/js/core/flow.mjs";
import { formatMinute } from "../public/js/core/i18n.mjs";

const fixtures = JSON.parse(
  readFileSync(
    new URL("../../../docs/specs/loan-kit-turnover/fixtures.json", import.meta.url),
    "utf8",
  ),
);

function valid(overrides = {}) {
  return {
    kits: [{ name: "K", count: 4, turnMin: 10 }],
    loans: [{ name: "A", kit: "K", start: 10, end: 30, qty: 2 }],
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

// ---- validation: shape and size ------------------------------------------

test("unknown root key -> SHAPE at root", () => {
  errorCase(valid({ extra: 1 }), "SHAPE", "");
});

test("missing loans -> SHAPE at /loans", () => {
  const input = valid();
  delete input.loans;
  errorCase(input, "SHAPE", "/loans");
});

test("root not an object -> TYPE at root", () => {
  errorCase([], "TYPE", "");
  errorCase(null, "TYPE", "");
  errorCase("x", "TYPE", "");
});

test("unknown kit row key -> SHAPE at the row", () => {
  errorCase(valid({ kits: [{ name: "K", count: 4, turnMin: 10, extra: 1 }] }), "SHAPE", "/kits/0");
});

test("missing turnMin -> SHAPE at /kits/0/turnMin", () => {
  errorCase(valid({ kits: [{ name: "K", count: 4 }] }), "SHAPE", "/kits/0/turnMin");
});

test("unknown loan row key -> SHAPE at the row", () => {
  const input = valid();
  input.loans[0].extra = 1;
  errorCase(input, "SHAPE", "/loans/0");
});

test("missing qty -> SHAPE at /loans/0/qty", () => {
  const input = valid();
  delete input.loans[0].qty;
  errorCase(input, "SHAPE", "/loans/0/qty");
});

test("oversized JSON -> SIZE at root", () => {
  // A 70,000-character name is far over the 65,536-byte cap; SIZE is
  // checked before any field validation.
  errorCase(valid({ kits: [{ name: "x".repeat(70000), count: 4, turnMin: 0 }] }), "SIZE", "");
});

test("1,000-character name -> RANGE, proving SIZE precedes name rules", () => {
  errorCase(valid({ kits: [{ name: "x".repeat(1000), count: 4, turnMin: 0 }] }), "RANGE", "/kits/0/name");
});

// ---- validation: types and ranges ----------------------------------------

test("kits not an array -> TYPE /kits", () => {
  errorCase(valid({ kits: {} }), "TYPE", "/kits");
});

test("loans not an array -> TYPE /loans", () => {
  errorCase(valid({ loans: {} }), "TYPE", "/loans");
});

test("zero kits -> RANGE /kits", () => {
  errorCase(valid({ kits: [] }), "RANGE", "/kits");
});

test("13 kits -> RANGE /kits", () => {
  const kits = Array.from({ length: 13 }, (_, i) => ({ name: `K${i}`, count: 1, turnMin: 0 }));
  errorCase(valid({ kits, loans: [] }), "RANGE", "/kits");
});

test("61 loans -> RANGE /loans", () => {
  const loans = Array.from({ length: 61 }, (_, i) => ({
    name: `L${i}`, kit: "K", start: 0, end: 10, qty: 1,
  }));
  errorCase(valid({ loans }), "RANGE", "/loans");
});

test("kit row not an object -> TYPE /kits/0", () => {
  errorCase(valid({ kits: ["K"] }), "TYPE", "/kits/0");
});

test("count as string -> TYPE", () => {
  errorCase(valid({ kits: [{ name: "K", count: "4", turnMin: 0 }] }), "TYPE", "/kits/0/count");
});

test("count 1.5 -> TYPE; count -0 -> TYPE", () => {
  errorCase(valid({ kits: [{ name: "K", count: 1.5, turnMin: 0 }] }), "TYPE", "/kits/0/count");
  errorCase(valid({ kits: [{ name: "K", count: -0, turnMin: 0 }] }), "TYPE", "/kits/0/count");
});

test("count 1001 -> RANGE; turnMin 121 -> RANGE; turnMin -1 -> RANGE", () => {
  errorCase(valid({ kits: [{ name: "K", count: 1001, turnMin: 0 }] }), "RANGE", "/kits/0/count");
  errorCase(valid({ kits: [{ name: "K", count: 1, turnMin: 121 }] }), "RANGE", "/kits/0/turnMin");
  errorCase(valid({ kits: [{ name: "K", count: 1, turnMin: -1 }] }), "RANGE", "/kits/0/turnMin");
});

test("start 1440 -> RANGE; end 0 -> RANGE; end 1441 -> RANGE; qty 0 -> RANGE", () => {
  const loan = (over) => valid({ loans: [{ name: "A", kit: "K", start: 10, end: 30, qty: 1, ...over }] });
  errorCase(loan({ start: 1440 }), "RANGE", "/loans/0/start");
  errorCase(loan({ end: 0 }), "RANGE", "/loans/0/end");
  errorCase(loan({ end: 1441 }), "RANGE", "/loans/0/end");
  errorCase(loan({ qty: 0 }), "RANGE", "/loans/0/qty");
  errorCase(loan({ qty: 1001 }), "RANGE", "/loans/0/qty");
  errorCase(loan({ start: "10" }), "TYPE", "/loans/0/start");
});

// ---- validation: names ----------------------------------------------------

test("empty name -> RANGE; 25-code-point name -> RANGE", () => {
  errorCase(valid({ kits: [{ name: "", count: 1, turnMin: 0 }] }), "RANGE", "/kits/0/name");
  errorCase(valid({ kits: [{ name: "x".repeat(25), count: 1, turnMin: 0 }] }), "RANGE", "/kits/0/name");
});

test("name starting with '-' -> RANGE; markup in name -> RANGE", () => {
  errorCase(valid({ kits: [{ name: "-K", count: 1, turnMin: 0 }] }), "RANGE", "/kits/0/name");
  errorCase(valid({ kits: [{ name: "<script>", count: 1, turnMin: 0 }] }), "RANGE", "/kits/0/name");
  errorCase(valid({ kits: [{ name: "A/B", count: 1, turnMin: 0 }] }), "RANGE", "/kits/0/name");
});

test("NFC duplicate kit names -> DUPLICATE at the second name", () => {
  const kits = [
    { name: "é", count: 1, turnMin: 0 },
    { name: "é", count: 1, turnMin: 0 },
  ];
  errorCase(valid({ kits, loans: [] }), "DUPLICATE", "/kits/1/name");
});

test("duplicate loan names -> DUPLICATE at the second name", () => {
  const loans = [
    { name: "A", kit: "K", start: 0, end: 10, qty: 1 },
    { name: "A", kit: "K", start: 20, end: 30, qty: 1 },
  ];
  errorCase(valid({ loans }), "DUPLICATE", "/loans/1/name");
});

test("kit name is case-sensitive: K and k are different kits", () => {
  const input = valid({
    kits: [
      { name: "K", count: 1, turnMin: 0 },
      { name: "k", count: 1, turnMin: 0 },
    ],
    loans: [{ name: "A", kit: "k", start: 0, end: 10, qty: 1 }],
  });
  assert.deepStrictEqual(solve(input), {
    status: "ok",
    result: {
      kits: [
        { name: "K", peak: 0, minExtra: 0, shortages: [] },
        { name: "k", peak: 1, minExtra: 0, shortages: [] },
      ],
    },
  });
});

test("surrounding U+0020 trims before matching a kit reference", () => {
  const input = valid({
    kits: [{ name: " K ", count: 1, turnMin: 0 }],
    loans: [{ name: "A", kit: "K", start: 0, end: 10, qty: 1 }],
  });
  const reply = solve(input);
  assert.equal(reply.status, "ok");
  assert.equal(reply.result.kits[0].name, "K");
  assert.equal(reply.result.kits[0].peak, 1);
});

// ---- cross-field -----------------------------------------------------------

test("REF is checked for all loans before any ORDER check", () => {
  const loans = [
    { name: "A", kit: "K", start: 30, end: 30, qty: 1 },
    { name: "B", kit: "MISSING", start: 0, end: 10, qty: 1 },
  ];
  errorCase(valid({ loans }), "REF", "/loans/1/kit");
});

test("end == start -> ORDER at /loans/0/end; end < start -> ORDER", () => {
  errorCase(
    valid({ loans: [{ name: "A", kit: "K", start: 30, end: 30, qty: 1 }] }),
    "ORDER",
    "/loans/0/end",
  );
  errorCase(
    valid({ loans: [{ name: "A", kit: "K", start: 40, end: 30, qty: 1 }] }),
    "ORDER",
    "/loans/0/end",
  );
});

// ---- algorithm --------------------------------------------------------------

test("turnaround keeps the kit occupied past the return", () => {
  const input = valid({
    kits: [{ name: "K", count: 1, turnMin: 10 }],
    loans: [
      { name: "A", kit: "K", start: 0, end: 10, qty: 1 },
      { name: "B", kit: "K", start: 10, end: 20, qty: 1 },
    ],
  });
  assert.deepStrictEqual(solve(input), {
    status: "ok",
    result: {
      kits: [
        {
          name: "K",
          peak: 2,
          minExtra: 1,
          shortages: [
            { from: 10, to: 20, demand: 2, extra: 1, loans: ["A", "B"] },
          ],
        },
      ],
    },
  });
});

test("segment loan names follow loan input order, not start order", () => {
  const input = valid({
    kits: [{ name: "K", count: 10, turnMin: 0 }],
    loans: [
      { name: "B", kit: "K", start: 20, end: 40, qty: 1 },
      { name: "A", kit: "K", start: 0, end: 30, qty: 1 },
    ],
  });
  const reply = solve(input);
  assert.equal(reply.status, "ok");
  assert.equal(reply.result.kits[0].peak, 2);
  assert.deepStrictEqual(reply.result.kits[0].shortages, []);
  // Re-run with a count that makes the middle segment a shortage, to
  // read the loan order off the shortage itself.
  const short = valid({
    kits: [{ name: "K", count: 1, turnMin: 0 }],
    loans: [
      { name: "B", kit: "K", start: 20, end: 40, qty: 1 },
      { name: "A", kit: "K", start: 0, end: 30, qty: 1 },
    ],
  });
  assert.deepStrictEqual(solve(short).result.kits[0].shortages, [
    { from: 20, to: 30, demand: 2, extra: 1, loans: ["B", "A"] },
  ]);
});

test("loans on different kits never interact", () => {
  const input = valid({
    kits: [
      { name: "K", count: 1, turnMin: 0 },
      { name: "L", count: 1, turnMin: 0 },
    ],
    loans: [
      { name: "A", kit: "K", start: 0, end: 30, qty: 1 },
      { name: "B", kit: "L", start: 0, end: 30, qty: 1 },
    ],
  });
  assert.deepStrictEqual(solve(input), {
    status: "ok",
    result: {
      kits: [
        { name: "K", peak: 1, minExtra: 0, shortages: [] },
        { name: "L", peak: 1, minExtra: 0, shortages: [] },
      ],
    },
  });
});

test("loan ending exactly at 1440 with no turnaround", () => {
  const input = valid({
    kits: [{ name: "K", count: 1, turnMin: 0 }],
    loans: [{ name: "A", kit: "K", start: 1430, end: 1440, qty: 1 }],
  });
  assert.deepStrictEqual(solve(input), {
    status: "ok",
    result: {
      kits: [{ name: "K", peak: 1, minExtra: 0, shortages: [] }],
    },
  });
});

test("maximum size input solves: 12 kits, 60 loans on one kit", () => {
  const kits = [{ name: "K0", count: 0, turnMin: 0 }];
  for (let i = 1; i < 12; i += 1) kits.push({ name: `K${i}`, count: 1, turnMin: 0 });
  const loans = Array.from({ length: 60 }, (_, i) => ({
    name: `L${i}`, kit: "K0", start: 0, end: 60, qty: 1,
  }));
  const reply = solve({ kits, loans });
  assert.equal(reply.status, "ok");
  assert.equal(reply.result.kits[0].peak, 60);
  assert.equal(reply.result.kits[0].minExtra, 60);
  assert.equal(reply.result.kits[0].shortages.length, 1);
  assert.deepStrictEqual(reply.result.kits[0].shortages[0], {
    from: 0,
    to: 60,
    demand: 60,
    extra: 60,
    loans: loans.map((loan) => loan.name),
  });
  for (let i = 1; i < 12; i += 1) {
    assert.deepStrictEqual(reply.result.kits[i], {
      name: `K${i}`,
      peak: 0,
      minExtra: 0,
      shortages: [],
    });
  }
});

test("validate() returns the normalized draft for a valid input", () => {
  const checked = validate({
    kits: [{ name: " K ", count: 2, turnMin: 5 }],
    loans: [{ name: "A", kit: "K", start: 0, end: 10, qty: 1 }],
  });
  assert.equal(checked.ok, true);
  assert.deepStrictEqual(checked.data, {
    kits: [{ name: "K", count: 2, turnMin: 5 }],
    loans: [{ name: "A", kit: "K", start: 0, end: 10, qty: 1 }],
  });
});

// ---- display formatting ------------------------------------------------------

test("formatMinute: 24:00 and next-day marks", () => {
  assert.equal(formatMinute(0, "zh-Hant"), "00:00");
  assert.equal(formatMinute(600, "zh-Hant"), "10:00");
  assert.equal(formatMinute(1439, "zh-Hant"), "23:59");
  assert.equal(formatMinute(1440, "zh-Hant"), "24:00");
  assert.equal(formatMinute(1440, "en"), "24:00");
  assert.equal(formatMinute(1560, "zh-Hant"), "隔日 02:00");
  assert.equal(formatMinute(1560, "en"), "next day 02:00");
});

// ---- flow extras --------------------------------------------------------------

test("flow: reset returns to empty; run with no draft is ignored", () => {
  const flow = createFlow();
  assert.deepStrictEqual(flow.snapshot(), { phase: "empty", result: null, error: null });
  flow.run(1);
  assert.equal(flow.snapshot().phase, "empty");
  flow.edit(valid());
  flow.run(1);
  assert.equal(flow.snapshot().phase, "busy");
  flow.reset();
  assert.deepStrictEqual(flow.snapshot(), { phase: "empty", result: null, error: null });
});

test("flow: run while busy is ignored; cancel while idle is a no-op", () => {
  const flow = createFlow();
  flow.edit(valid());
  flow.run(1);
  flow.run(2);
  flow.settle(2);
  assert.equal(flow.snapshot().phase, "busy");
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  flow.cancel();
  assert.equal(flow.snapshot().phase, "ready");
});

test("flow: a stale error reply cannot overwrite a newer ready state", () => {
  const flow = createFlow();
  flow.edit(valid());
  flow.run(1);
  flow.cancel();
  flow.edit(valid());
  flow.run(2);
  flow.settle(2);
  assert.equal(flow.snapshot().phase, "ready");
  flow.settleWith(1, { status: "error", error: { code: "REF", path: "/loans/0/kit" } });
  assert.equal(flow.snapshot().phase, "ready");
  assert.equal(flow.snapshot().error, null);
});

test("flow: fail then edit returns to dirty with the error cleared", () => {
  const flow = createFlow();
  flow.edit(valid());
  flow.fail({ code: "SYNTAX", path: "/loans/0/start" });
  assert.equal(flow.snapshot().phase, "error");
  assert.equal(flow.snapshot().error.code, "SYNTAX");
  flow.edit(valid());
  assert.deepStrictEqual(flow.snapshot(), { phase: "dirty", result: null, error: null });
});

test("flow: settle of a core error enters the error phase", () => {
  const flow = createFlow();
  flow.edit(valid({ loans: [{ name: "A", kit: "NOPE", start: 0, end: 10, qty: 1 }] }));
  flow.run(1);
  flow.settle(1);
  assert.deepStrictEqual(flow.snapshot(), {
    phase: "error",
    result: null,
    error: { code: "REF", path: "/loans/0/kit" },
  });
});
