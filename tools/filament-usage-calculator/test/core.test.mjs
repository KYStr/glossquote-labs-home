// Core tests for the Filament Usage Calculator.
// Expectations are FIXTURE LITERALS from the fixed specification
// candidate: spec task labs-filament-usage-calculator-spec-20261109,
// candidate commit 599649b23a0e4103eb019e90190d7def7c70e4ea, vendored
// verbatim at test/fixtures.json. Expectations were never copied from
// any implementation's output. The additional endpoint/property cases
// below the fixture blocks were derived by hand from the SPEC's stated
// rules with independent double-precision arithmetic (Python math.pi)
// before the implementation existed.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DEFAULTS,
  EXAMPLE,
  buildReport,
  run,
} from "../public/js/core/filament.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const cases = new Map(fixtures.cases.map((entry) => [entry.id, entry]));
const literalCases = fixtures.cases.filter((entry) => entry.kind === "core");

test("the vendored fixtures file is the fixed spec candidate's file", () => {
  assert.equal(fixtures.slug, "filament-usage-calculator");
  assert.equal(fixtures.specId, "spec-filament-usage-calculator-20261109");
  assert.equal(fixtures.cases.length, 14);
  assert.equal(literalCases.length, 11);
});

test("vendored spec fixtures: every literal case matches its hand-written expectation", () => {
  assert.equal(literalCases.length, 11);
  for (const entry of literalCases) {
    assert.deepEqual(run(entry.input), entry.expected, entry.id);
  }
});

test("worked example input equals fixtures case 1 input", () => {
  assert.deepEqual(cases.get("length-pla-175").input, EXAMPLE);
  assert.deepEqual(run(EXAMPLE), cases.get("length-pla-175").expected);
});

test("gramsPerMetre for every material and diameter (hand-derived table)", () => {
  const expected = {
    "1.75": { pla: "2.98", petg: "3.05", abs: "2.53", tpu: "2.91", asa: "2.57", pc: "2.89" },
    "2.85": { pla: "7.91", petg: "8.10", abs: "6.70", tpu: "7.72", asa: "6.83", pc: "7.66" },
  };
  for (const [diameter, byMaterial] of Object.entries(expected)) {
    for (const [material, gpm] of Object.entries(byMaterial)) {
      const outcome = run({ ...DEFAULTS, diameter, material });
      assert.equal(outcome.ok, true, `${diameter}/${material}`);
      assert.equal(outcome.result.gramsPerMetre, gpm, `${diameter}/${material}`);
    }
  }
});

test("legal maxima: lengthM 100000 and weightG 1000000 (hand-derived)", () => {
  assert.deepEqual(run({ ...DEFAULTS, lengthM: "100000" }), {
    ok: true,
    result: { gramsPerMetre: "2.98", weightG: "298255.0" },
  });
  assert.deepEqual(
    run({ ...DEFAULTS, mode: "weight", diameter: "2.85", material: "pc", weightG: "1000000" }),
    { ok: true, result: { gramsPerMetre: "7.66", lengthM: "130628.86" } },
  );
});

test("just over the maxima is RANGE; lengthM 100000.001 is DECIMAL_FORMAT first", () => {
  assert.deepEqual(run({ ...DEFAULTS, lengthM: "100001" }), {
    ok: false,
    error: { code: "RANGE", field: "lengthM", row: null },
  });
  // 100000.001 has 3 decimal places, which lengthM allows; the value
  // itself is out of range.
  assert.deepEqual(run({ ...DEFAULTS, lengthM: "100000.001" }), {
    ok: false,
    error: { code: "RANGE", field: "lengthM", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, mode: "weight", weightG: "1000000.01" }), {
    ok: false,
    error: { code: "RANGE", field: "weightG", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, mode: "weight", weightG: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "weightG", row: null },
  });
});

test("cost mode in USD with fractional price and usage (hand-derived)", () => {
  assert.deepEqual(
    run({
      ...DEFAULTS,
      mode: "cost",
      material: "petg",
      spoolPrice: "24.99",
      usageG: "125.5",
      currency: "USD",
    }),
    {
      ok: true,
      result: {
        gramsPerMetre: "3.05",
        cost: "3.14",
        currency: "USD",
        usageLengthM: "41.08",
      },
    },
  );
});

test("spool mode: custom empty spool of 0 is legal (hand-derived)", () => {
  assert.deepEqual(
    run({
      ...DEFAULTS,
      mode: "spool",
      material: "asa",
      grossWeightG: "300",
      emptySpoolPreset: "custom",
      emptySpoolCustomG: "0",
    }),
    {
      ok: true,
      result: { gramsPerMetre: "2.57", remainingG: "300.0", remainingM: "116.57" },
    },
  );
});

test("spool cross-field: gross 0.1 below empty is NEGATIVE_REMAINING, gross == empty is zero", () => {
  assert.deepEqual(
    run({ ...DEFAULTS, mode: "spool", grossWeightG: "199.9", emptySpoolPreset: "200" }),
    { ok: false, error: { code: "NEGATIVE_REMAINING", field: "grossWeightG", row: null } },
  );
  assert.deepEqual(
    run({ ...DEFAULTS, mode: "spool", grossWeightG: "250", emptySpoolPreset: "250" }),
    { ok: true, result: { gramsPerMetre: "2.98", remainingG: "0.0", remainingM: "0.00" } },
  );
});

test("decimal grammar and per-field decimal-place limits", () => {
  for (const bad of ["1.234", ".5", "10.", " 10", "1e3", "01", "-5", "+5"]) {
    assert.deepEqual(
      run({ ...DEFAULTS, mode: "weight", weightG: bad }),
      { ok: false, error: { code: "DECIMAL_FORMAT", field: "weightG", row: null } },
      bad,
    );
  }
  // lengthM allows 3 places; grossWeightG allows only 1.
  assert.equal(run({ ...DEFAULTS, lengthM: "1.234" }).ok, true);
  assert.deepEqual(run({ ...DEFAULTS, mode: "spool", grossWeightG: "850.55" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "grossWeightG", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, mode: "weight", weightG: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "weightG", row: null },
  });
});

test("range edges: spoolNetWeightG 0 is RANGE, 1 is legal; usageG 0 is RANGE", () => {
  assert.deepEqual(run({ ...DEFAULTS, mode: "cost", spoolNetWeightG: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "spoolNetWeightG", row: null },
  });
  assert.equal(run({ ...DEFAULTS, mode: "cost", spoolNetWeightG: "1" }).ok, true);
  assert.deepEqual(run({ ...DEFAULTS, mode: "cost", usageG: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "usageG", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, mode: "cost", spoolPrice: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "spoolPrice", row: null },
  });
  assert.deepEqual(
    run({ ...DEFAULTS, mode: "spool", emptySpoolPreset: "custom", emptySpoolCustomG: "10000.1" }),
    { ok: false, error: { code: "RANGE", field: "emptySpoolCustomG", row: null } },
  );
});

test("enum errors, and mode ENUM outranks later field errors", () => {
  assert.deepEqual(run({ ...DEFAULTS, mode: "volume" }), {
    ok: false,
    error: { code: "ENUM", field: "mode", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, mode: "", lengthM: "0" }), {
    ok: false,
    error: { code: "ENUM", field: "mode", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, diameter: "3.0" }), {
    ok: false,
    error: { code: "ENUM", field: "diameter", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, material: "petx" }), {
    ok: false,
    error: { code: "ENUM", field: "material", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, mode: "spool", emptySpoolPreset: "175" }), {
    ok: false,
    error: { code: "ENUM", field: "emptySpoolPreset", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, mode: "cost", currency: "GBP" }), {
    ok: false,
    error: { code: "ENUM", field: "currency", row: null },
  });
});

test("inactive fields only receive schema/capacity/unicode checks", () => {
  // mode=length: every other mode's fields may hold invalid values.
  assert.equal(
    run({
      ...DEFAULTS,
      weightG: "abc",
      grossWeightG: "-1",
      emptySpoolPreset: "bogus",
      emptySpoolCustomG: "xyz",
      spoolPrice: "",
      spoolNetWeightG: "0",
      usageG: "1e9",
      currency: "GBP",
    }).ok,
    true,
  );
  // mode=spool with a preset: emptySpoolCustomG is inactive garbage-tolerant.
  assert.equal(
    run({ ...DEFAULTS, mode: "spool", emptySpoolCustomG: "abc" }).ok,
    true,
  );
  // ...but capacity and unicode still apply to inactive fields.
  assert.deepEqual(run({ ...DEFAULTS, weightG: "10000000000" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "weightG", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, currency: "\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "currency", row: null },
  });
});

test("schema errors: shape, types, unknown and missing fields, accessors", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run(undefined), schema);
  assert.deepEqual(run("length"), schema);
  assert.deepEqual(run([1, 2, 3]), schema);
  assert.deepEqual(run({ ...DEFAULTS, lengthM: 10 }), schema);
  const missing = { ...DEFAULTS };
  delete missing.currency;
  assert.deepEqual(run(missing), schema);
  assert.deepEqual(run({ ...DEFAULTS, extra: "x" }), schema);
  let getterCalled = false;
  const withGetter = { ...DEFAULTS };
  Object.defineProperty(withGetter, "lengthM", {
    enumerable: true,
    get() {
      getterCalled = true;
      return "10";
    },
  });
  assert.deepEqual(run(withGetter), schema);
  assert.equal(getterCalled, false);
});

test("phase order: capacity/unicode across all fields precede value errors", () => {
  // lengthM is out of range (a value error), but currency is over its
  // raw capacity — the SPEC's step 2 (all fields) fires before step 3.
  assert.deepEqual(run({ ...DEFAULTS, lengthM: "0", currency: "TWDD" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "currency", row: null },
  });
  // Within step 2 the fixed field order decides: diameter before mode
  // is impossible (mode is first), so lengthM beats weightG.
  assert.deepEqual(run({ ...DEFAULTS, lengthM: "10000000000", weightG: "\uD800\uD800\uD800\uD800\uD800\uD800" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "lengthM", row: null },
  });
  // Within a field: capacity before unicode (9 units over the 8 cap).
  assert.deepEqual(run({ ...DEFAULTS, mode: "spool", grossWeightG: "12345678\uD800" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "grossWeightG", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, grossWeightG: "\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "grossWeightG", row: null },
  });
});

test("capacity limits are UTF-16 code units on every field", () => {
  assert.deepEqual(run({ ...DEFAULTS, mode: "lengthXXX" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "mode", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, diameter: "1.755" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "diameter", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, material: "petgx" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "material", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, mode: "spool", emptySpoolPreset: "customX" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "emptySpoolPreset", row: null },
  });
});

test("report: fixed filename, sorted keys, compact JSON, one trailing LF", () => {
  const outcome = run(cases.get("length-pla-175").input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "filament-usage-report.json");
  // Hand-written literal: keys sorted by UTF-16 code units.
  assert.equal(report.text, '{"gramsPerMetre":"2.98","weightG":"298.3"}\n');
  assert.equal(report.byteLength, Buffer.byteLength(report.text, "utf8"));

  const costReport = buildReport(run(cases.get("cost-pla-twd").input).result);
  assert.equal(costReport.ok, true);
  assert.equal(
    costReport.text,
    '{"cost":"149.75","currency":"TWD","gramsPerMetre":"2.98","usageLengthM":"83.82"}\n',
  );
});

test("report: serializer never calls an input's toJSON and rejects non-plain data", () => {
  let called = false;
  const hostile = {
    toJSON() {
      called = true;
      return { gramsPerMetre: "2.98" };
    },
  };
  const report = buildReport(hostile);
  assert.equal(called, false);
  assert.equal(report.ok, false);
  assert.deepEqual(report.error, { code: "INTERNAL", field: null, row: null });
  assert.equal(buildReport({ gramsPerMetre: Number.NaN }).ok, false);
  assert.equal(buildReport({ fn: () => 1 }).ok, false);
  assert.equal(buildReport(null).ok, false);
});

test("report: nested plain data serializes with recursively sorted keys", () => {
  const report = buildReport({ z: 1, a: { d: [3, 1], b: "x" } });
  assert.equal(report.ok, true);
  assert.equal(report.text, '{"a":{"b":"x","d":[3,1]},"z":1}\n');
});
