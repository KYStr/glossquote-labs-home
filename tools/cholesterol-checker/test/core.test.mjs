// Core tests. Expected values come from the fixed SPEC fixtures
// (test/fixtures.json, copied verbatim from docs/specs/cholesterol-checker)
// plus cases derived by hand from the SPEC rules — never from the core's
// own output.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { run } from "../public/js/core/core.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8")
);
const coreCases = fixtures.cases.filter((c) => c.kind === "core");

for (const c of coreCases) {
  test(`fixture ${c.id}`, () => {
    assert.deepEqual(run(c.input), c.expected);
  });
}

const BASE = { total: "180", ldl: "90", hdl: "65", triglycerides: "120" };

function classify(field, raw) {
  const outcome = run({ ...BASE, [field]: raw });
  assert.equal(outcome.ok, true, `expected ok for ${field}=${raw}`);
  return outcome.result.classifications[field];
}

// Every NCEP ATP III cut point, 1 mg/dL below and at the cut point.
// The other three fields stay at the ideal defaults (severity 0), so the
// overall rank equals the tested field's severity.
const CUT_POINTS = [
  // [field, below, belowBand, belowSeverity, at, atBand, atSeverity]
  ["total", "199", "desirable", 0, "200", "borderline-high", 1],
  ["total", "239", "borderline-high", 1, "240", "high", 2],
  ["ldl", "99", "optimal", 0, "100", "near-optimal", 1],
  ["ldl", "129", "near-optimal", 1, "130", "borderline-high", 2],
  ["ldl", "159", "borderline-high", 2, "160", "high", 3],
  ["ldl", "189", "high", 3, "190", "very-high", 4],
  ["hdl", "39", "low", 2, "40", "normal", 0],
  ["hdl", "59", "normal", 0, "60", "high", 0],
  ["triglycerides", "149", "normal", 0, "150", "borderline-high", 1],
  ["triglycerides", "199", "borderline-high", 1, "200", "high", 2],
  ["triglycerides", "499", "high", 2, "500", "very-high", 3],
];

for (const [field, below, belowBand, belowSeverity, at, atBand, atSeverity] of CUT_POINTS) {
  test(`cut point ${field}: ${below} vs ${at}`, () => {
    assert.deepEqual(classify(field, below), { band: belowBand, severity: belowSeverity });
    assert.deepEqual(classify(field, at), { band: atBand, severity: atSeverity });
    const belowOutcome = run({ ...BASE, [field]: below });
    assert.equal(belowOutcome.result.overall.rank, belowSeverity);
    const atOutcome = run({ ...BASE, [field]: at });
    assert.equal(atOutcome.result.overall.rank, atSeverity);
  });
}

test("boundaries: 1 and 9999 are legal in every field", () => {
  const outcome = run({ total: "1", ldl: "1", hdl: "1", triglycerides: "1" });
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.result.values, { total: 1, ldl: 1, hdl: 1, triglycerides: 1 });
  assert.equal(outcome.result.nonHdl, 0);
  const top = run({ total: "9999", ldl: "9999", hdl: "9999", triglycerides: "9999" });
  assert.equal(top.ok, true);
  assert.equal(top.result.nonHdl, 0);
  assert.equal(top.result.overall.rank, 4);
});

test("nonHdl is plain integer subtraction and may be zero or negative", () => {
  // total == hdl: nonHdl 0, still ok, never graded.
  const zero = run({ total: "180", ldl: "90", hdl: "180", triglycerides: "120" });
  assert.equal(zero.ok, true);
  assert.equal(zero.result.nonHdl, 0);
  // total < hdl: negative nonHdl is shown as-is, no error.
  const negative = run({ total: "1", ldl: "90", hdl: "9999", triglycerides: "120" });
  assert.equal(negative.ok, true);
  assert.equal(negative.result.nonHdl, -9998);
});

test("overall rank is the maximum item severity", () => {
  const outcome = run({ total: "260", ldl: "195", hdl: "65", triglycerides: "120" });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.overall.rank, 4);
  assert.equal(outcome.result.overall.label, "needs-attention");
  const borderline = run({ total: "210", ldl: "90", hdl: "65", triglycerides: "120" });
  assert.equal(borderline.result.overall.rank, 1);
  assert.equal(borderline.result.overall.label, "borderline");
});

test("grammar: valid and invalid shapes", () => {
  assert.equal(run({ ...BASE, total: "0" }).ok, false); // 0 is RANGE, not grammar
  assert.deepEqual(run({ ...BASE, total: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "total", row: null },
  });
  for (const bad of ["180.0", "180.5", "+180", " 180", "180 ", "0180", "007", "1e3", "180mg", "１８０", "180\n", "-180", "18,0"]) {
    assert.deepEqual(
      run({ ...BASE, total: bad }),
      { ok: false, error: { code: "INTEGER_FORMAT", field: "total", row: null } },
      `expected INTEGER_FORMAT for ${JSON.stringify(bad)}`
    );
  }
});

test("capacity: 5 characters pass, 6 fail with INPUT_LIMIT before grammar", () => {
  // "10000" is 5 characters: capacity passes, range fails.
  assert.deepEqual(run({ ...BASE, total: "10000" }), {
    ok: false,
    error: { code: "RANGE", field: "total", row: null },
  });
  // "123456" is 6 characters: INPUT_LIMIT wins even though it is also a
  // grammar-valid integer that would be out of range.
  assert.deepEqual(run({ ...BASE, total: "123456" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "total", row: null },
  });
  // A 6-character non-numeric string still reports INPUT_LIMIT first.
  assert.deepEqual(run({ ...BASE, total: "199.55" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "total", row: null },
  });
});

test("field order: the first failing field wins", () => {
  // total fails and ldl fails: total is reported.
  assert.deepEqual(run({ total: "", ldl: "", hdl: "65", triglycerides: "120" }), {
    ok: false,
    error: { code: "EMPTY", field: "total", row: null },
  });
  // ldl fails and hdl fails: ldl is reported.
  assert.deepEqual(run({ total: "180", ldl: "abc", hdl: "", triglycerides: "120" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "ldl", row: null },
  });
  // hdl fails and triglycerides fails: hdl is reported.
  assert.deepEqual(run({ total: "180", ldl: "90", hdl: "0", triglycerides: "10000" }), {
    ok: false,
    error: { code: "RANGE", field: "hdl", row: null },
  });
});

test("empty is EMPTY, not INTEGER_FORMAT, in every field", () => {
  for (const field of ["total", "ldl", "hdl", "triglycerides"]) {
    assert.deepEqual(run({ ...BASE, [field]: "" }), {
      ok: false,
      error: { code: "EMPTY", field, row: null },
    });
  }
});

test("schema: wrong types, missing fields, extra fields, accessors", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run("180"), schema);
  assert.deepEqual(run({ total: "180", ldl: "90", hdl: "65" }), schema);
  assert.deepEqual(run({ ...BASE, extra: "1" }), schema);
  assert.deepEqual(run({ total: 180, ldl: "90", hdl: "65", triglycerides: "120" }), schema);
  assert.deepEqual(run({ total: "180", ldl: "90", hdl: "65", triglycerides: null }), schema);
  assert.deepEqual(run(["180", "90", "65", "120"]), schema);
  const withGetter = { ldl: "90", hdl: "65", triglycerides: "120" };
  Object.defineProperty(withGetter, "total", {
    enumerable: true,
    get() {
      return "180";
    },
  });
  assert.deepEqual(run(withGetter), schema);
});

test("unicode: lone surrogate is UNICODE, after INPUT_LIMIT order", () => {
  assert.deepEqual(run({ ...BASE, total: "\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "total", row: null },
  });
  assert.deepEqual(run({ ...BASE, total: "1\uDC00" }), {
    ok: false,
    error: { code: "UNICODE", field: "total", row: null },
  });
  // A paired surrogate is two code units of grammar-invalid text.
  assert.deepEqual(run({ ...BASE, total: "\uD83D\uDE00" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "total", row: null },
  });
  // Six code units: INPUT_LIMIT wins over UNICODE.
  assert.deepEqual(run({ ...BASE, total: "\uD80012345" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "total", row: null },
  });
});
