// Core tests. Expected values come from the fixed spec fixtures, vendored
// verbatim at test/fixtures.json (spec candidate
// 2b83a326544418542bb0223b58f2cc86701a49dd, spec-rent-budget-planner-20261109).
// They are never derived from the implementation under test.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { run } from "../public/js/core/rent-budget.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);

for (const fixture of fixtures.cases.filter((c) => c.kind === "core")) {
  test("fixture " + fixture.id, () => {
    assert.deepStrictEqual(run(fixture.input), fixture.expected);
  });
}

const base = {
  income: "45000",
  ratioPreset: "P30",
  customRatio: "",
  candidateRent: "12000",
  depositMonths: "2",
  agencyFee: "0.5",
};

test("income upper boundary 999999999 is accepted", () => {
  const out = run({ ...base, income: "999999999" });
  assert.equal(out.ok, true);
  assert.equal(out.result.maxRentNt, 299999999); // floor(999999999 * 3/10)
});

test("candidate rent upper boundary 99999999 is accepted, 100000000 hits the raw limit", () => {
  const okOut = run({ ...base, candidateRent: "99999999" });
  assert.equal(okOut.ok, true);
  assert.deepStrictEqual(run({ ...base, candidateRent: "100000000" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "candidateRent", row: null },
  });
});

test("custom ratio boundaries 1 and 100 pass; 0 and 101 are RANGE", () => {
  assert.equal(run({ ...base, ratioPreset: "CUSTOM", customRatio: "1" }).ok, true);
  assert.equal(run({ ...base, ratioPreset: "CUSTOM", customRatio: "100" }).ok, true);
  assert.deepStrictEqual(run({ ...base, ratioPreset: "CUSTOM", customRatio: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "customRatio", row: null },
  });
  assert.deepStrictEqual(run({ ...base, ratioPreset: "CUSTOM", customRatio: "101" }), {
    ok: false,
    error: { code: "RANGE", field: "customRatio", row: null },
  });
});

test("customRatio garbage is fully ignored when the preset is not CUSTOM", () => {
  const out = run({ ...base, customRatio: "not-a-number!!" });
  assert.equal(out.ok, true);
  assert.equal(out.result.maxRentNt, 13500);
});

test("maxRent floor direction at the one-third boundary", () => {
  const input = { ...base, income: "100", ratioPreset: "P33", candidateRent: "33" };
  const atCap = run(input);
  assert.equal(atCap.result.maxRentNt, 33);
  assert.equal(atCap.result.candidate.withinBudget, true);
  const over = run({ ...input, candidateRent: "34" });
  assert.equal(over.result.candidate.withinBudget, false);
  assert.equal(over.result.candidate.overByNt, 1);
});

test("schema failures: extra field, missing field, wrong type, accessor, non-object", () => {
  assert.deepStrictEqual(run({ ...base, extra: "1" }), {
    ok: false,
    error: { code: "SCHEMA", field: "extra", row: null },
  });
  const missing = { ...base };
  delete missing.agencyFee;
  assert.deepStrictEqual(run(missing), {
    ok: false,
    error: { code: "SCHEMA", field: "agencyFee", row: null },
  });
  assert.deepStrictEqual(run({ ...base, income: 45000 }), {
    ok: false,
    error: { code: "SCHEMA", field: "income", row: null },
  });
  const withAccessor = { ...base };
  Object.defineProperty(withAccessor, "income", {
    enumerable: true,
    get() {
      return "45000";
    },
  });
  assert.deepStrictEqual(run(withAccessor), {
    ok: false,
    error: { code: "SCHEMA", field: "income", row: null },
  });
  assert.deepStrictEqual(run(null), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  assert.deepStrictEqual(run("nope"), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
});

test("grammar failures: leading zero, sign, decimal, spaces, empty", () => {
  for (const bad of ["045000", "+45000", "45000.0", "45 000", " 45000"]) {
    assert.deepStrictEqual(run({ ...base, income: bad }), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "income", row: null },
    });
  }
  assert.deepStrictEqual(run({ ...base, income: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "income", row: null },
  });
});

test("lone surrogate is UNICODE", () => {
  assert.deepStrictEqual(run({ ...base, income: "4500\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "income", row: null },
  });
});

test("validation order: the first field in the pinned order wins", () => {
  const out = run({ ...base, income: "abc", depositMonths: "9" });
  assert.deepStrictEqual(out, {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "income", row: null },
  });
});
