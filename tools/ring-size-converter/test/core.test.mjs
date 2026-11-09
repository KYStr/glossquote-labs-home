// Core tests: every literal core fixture from the SPEC's fixtures.json
// (vendored verbatim into test/fixtures.json from spec candidate
// 6947befa921090dbd0ac3304666df5da896b2f81), deep-compared against the
// product's run(), plus hand-derived endpoint, boundary, and
// validation-order cases. Expected values in the extra cases were computed
// independently from the SPEC's stated rules (exact integer hundredths and
// the disclosed formulas), never from the implementation's output.

import assert from "node:assert/strict";
import test from "node:test";
import { run } from "../public/js/core/ring.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

for (const entry of coreCases) {
  test(`fixture ${entry.id}`, () => {
    assert.deepEqual(run(entry.input), entry.expected);
  });
}

function expectError(input, code, field) {
  assert.deepEqual(run(input), { ok: false, error: { code, field, row: null } });
}

test("legal endpoints for every source", () => {
  assert.equal(run({ source: "circumference", value: "40.0" }).ok, true);
  assert.equal(run({ source: "circumference", value: "70.0" }).ok, true);
  assert.equal(run({ source: "diameter", value: "12.8" }).ok, true);
  assert.equal(run({ source: "diameter", value: "22.2" }).ok, true);
  assert.equal(run({ source: "us", value: "3" }).ok, true);
  assert.equal(run({ source: "us", value: "13" }).ok, true);
  assert.equal(run({ source: "eu", value: "40" }).ok, true);
  assert.equal(run({ source: "eu", value: "70" }).ok, true);
  assert.equal(run({ source: "jp", value: "1" }).ok, true);
  assert.equal(run({ source: "jp", value: "28" }).ok, true);
  assert.equal(run({ source: "uk", value: "F½" }).ok, true);
  assert.equal(run({ source: "uk", value: "Z½" }).ok, true);
});

test("diameter endpoints derive from the pinned pi pipeline", () => {
  assert.deepEqual(run({ source: "diameter", value: "12.8" }), {
    ok: true,
    result: {
      circumferenceMm: "40.2",
      diameterMm: "12.8",
      euSize: 40,
      jpSize: null,
      nearestRow: { usSize: "3", ukSize: "F½", circumferenceMm: "44.2" },
      deltaMm: "4.0",
      fit: "between",
      adjacentRow: null,
    },
  });
  assert.deepEqual(run({ source: "diameter", value: "22.2" }), {
    ok: true,
    result: {
      circumferenceMm: "69.7",
      diameterMm: "22.2",
      euSize: 70,
      jpSize: 29,
      nearestRow: { usSize: "13", ukSize: "Z½", circumferenceMm: "69.7" },
      deltaMm: "0.0",
      fit: "exact",
      adjacentRow: null,
    },
  });
});

test("JP endpoints: size 1 is below the table, size 28 sits between rows", () => {
  assert.deepEqual(run({ source: "jp", value: "1" }), {
    ok: true,
    result: {
      circumferenceMm: "40.8",
      diameterMm: "13.0",
      euSize: 41,
      jpSize: 1,
      nearestRow: { usSize: "3", ukSize: "F½", circumferenceMm: "44.2" },
      deltaMm: "3.4",
      fit: "between",
      adjacentRow: null,
    },
  });
  assert.deepEqual(run({ source: "jp", value: "28" }), {
    ok: true,
    result: {
      circumferenceMm: "69.1",
      diameterMm: "22.0",
      euSize: 69,
      jpSize: 28,
      nearestRow: { usSize: "13", ukSize: "Z½", circumferenceMm: "69.7" },
      deltaMm: "0.6",
      fit: "between",
      adjacentRow: { usSize: "12.5", ukSize: "Y½", circumferenceMm: "68.5" },
    },
  });
});

test("table-row sources reproduce the row exactly (US 3 and US 6.5)", () => {
  assert.deepEqual(run({ source: "us", value: "3" }).result, {
    circumferenceMm: "44.2",
    diameterMm: "14.1",
    euSize: 44,
    jpSize: 4,
    nearestRow: { usSize: "3", ukSize: "F½", circumferenceMm: "44.2" },
    deltaMm: "0.0",
    fit: "exact",
    adjacentRow: null,
  });
  assert.deepEqual(run({ source: "uk", value: "M½" }).result, {
    circumferenceMm: "53.1",
    diameterMm: "16.9",
    euSize: 53,
    jpSize: 13,
    nearestRow: { usSize: "6.5", ukSize: "M½", circumferenceMm: "53.1" },
    deltaMm: "0.0",
    fit: "exact",
    adjacentRow: null,
  });
});

test("fit boundary: delta exactly 0.30 mm is exact, 0.31 mm is between", () => {
  // circH 5220 is exactly 30 units above the 51.9 row.
  const atTolerance = run({ source: "circumference", value: "52.20" });
  assert.equal(atTolerance.ok, true);
  assert.equal(atTolerance.result.fit, "exact");
  assert.equal(atTolerance.result.deltaMm, "0.3");
  assert.equal(atTolerance.result.adjacentRow, null);
  // circH 5221 is 31 units above the row: "between", even though the
  // displayed delta still rounds to "0.3".
  const pastTolerance = run({ source: "circumference", value: "52.21" });
  assert.equal(pastTolerance.ok, true);
  assert.equal(pastTolerance.result.fit, "between");
  assert.equal(pastTolerance.result.deltaMm, "0.3");
  assert.deepEqual(pastTolerance.result.adjacentRow, {
    usSize: "6.5",
    ukSize: "M½",
    circumferenceMm: "53.1",
  });
});

test("same canonical circumference gives the same result from any source", () => {
  const fromEu = run({ source: "eu", value: "52" });
  const fromCirc = run({ source: "circumference", value: "52.0" });
  const fromDerived = run({ source: "circumference", value: "51.9" });
  assert.deepEqual(fromEu.result.circumferenceMm, "52.0");
  assert.deepEqual(fromCirc.result, fromEu.result);
  assert.notDeepEqual(fromCirc.result, fromDerived.result);
});

test("range errors just outside the legal windows", () => {
  expectError({ source: "circumference", value: "39.9" }, "RANGE", "value");
  expectError({ source: "circumference", value: "70.1" }, "RANGE", "value");
  expectError({ source: "circumference", value: "0" }, "RANGE", "value");
  expectError({ source: "diameter", value: "12.7" }, "RANGE", "value");
  expectError({ source: "diameter", value: "22.3" }, "RANGE", "value");
  expectError({ source: "us", value: "2.5" }, "RANGE", "value");
  expectError({ source: "us", value: "13.5" }, "RANGE", "value");
  expectError({ source: "eu", value: "39" }, "RANGE", "value");
  expectError({ source: "eu", value: "71" }, "RANGE", "value");
  expectError({ source: "jp", value: "0" }, "RANGE", "value");
  expectError({ source: "jp", value: "29" }, "RANGE", "value");
});

test("US step: non half-step inside the range is STEP, range beats step", () => {
  expectError({ source: "us", value: "6.25" }, "STEP", "value");
  expectError({ source: "us", value: "3.1" }, "STEP", "value");
  expectError({ source: "us", value: "13.25" }, "RANGE", "value");
  expectError({ source: "us", value: "2.75" }, "RANGE", "value");
});

test("grammar errors per source family", () => {
  expectError({ source: "circumference", value: "51.955" }, "DECIMAL_FORMAT", "value");
  expectError({ source: "circumference", value: "051.9" }, "DECIMAL_FORMAT", "value");
  expectError({ source: "circumference", value: "５１.９" }, "DECIMAL_FORMAT", "value");
  expectError({ source: "diameter", value: "17,3" }, "DECIMAL_FORMAT", "value");
  expectError({ source: "us", value: "6." }, "DECIMAL_FORMAT", "value");
  expectError({ source: "eu", value: "57.0" }, "INTEGER_FORMAT", "value");
  expectError({ source: "jp", value: "07" }, "INTEGER_FORMAT", "value");
  expectError({ source: "jp", value: "-3" }, "INTEGER_FORMAT", "value");
  expectError({ source: "uk", value: "F" }, "ENUM", "value");
  expectError({ source: "uk", value: "f½" }, "ENUM", "value");
  expectError({ source: "uk", value: "L" }, "ENUM", "value");
});

test("capacity, surrogate, and empty checks run before grammar", () => {
  expectError({ source: "circumference", value: "123456789" }, "INPUT_LIMIT", "value");
  expectError({ source: "circumference", value: "12345678" }, "DECIMAL_FORMAT", "value");
  expectError({ source: "circumference", value: "\uD800" }, "UNICODE", "value");
  expectError({ source: "uk", value: "\uDC00" }, "UNICODE", "value");
  expectError({ source: "eu", value: "" }, "EMPTY", "value");
  expectError({ source: "uk", value: "" }, "EMPTY", "value");
});

test("source validation: surrogate then enum, checked before value", () => {
  expectError({ source: "\uD800", value: "51.9" }, "UNICODE", "source");
  expectError({ source: "Circumference", value: "51.9" }, "ENUM", "source");
  expectError({ source: "", value: "51.9" }, "ENUM", "source");
  expectError({ source: "hk", value: "51.9" }, "ENUM", "source");
  // A bad source beats a bad value.
  expectError({ source: "hk", value: "" }, "ENUM", "source");
});

test("schema gate: shape, types, extra/missing fields, accessors", () => {
  expectError(null, "SCHEMA", null);
  expectError([], "SCHEMA", null);
  expectError("circumference", "SCHEMA", null);
  expectError({ source: "us" }, "SCHEMA", null);
  expectError({ value: "6" }, "SCHEMA", null);
  expectError({ source: "us", value: "6", extra: "x" }, "SCHEMA", null);
  expectError({ source: "us", value: 6 }, "SCHEMA", null);
  expectError({ source: 6, value: "6" }, "SCHEMA", null);
  let accessorReads = 0;
  const hostile = {
    source: "us",
    get value() {
      accessorReads += 1;
      return "6";
    },
  };
  expectError(hostile, "SCHEMA", null);
  assert.equal(accessorReads, 0);
});
