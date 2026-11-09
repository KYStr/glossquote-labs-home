// Core tests. Expected values come from the fixed SPEC fixtures
// (test/fixtures.json, copied verbatim from docs/specs/percentage-calculator)
// plus cases derived by hand from the SPEC rules — never from the core's
// own output.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizeEcho, run } from "../public/js/core/core.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8")
);
const coreCases = fixtures.cases.filter((c) => c.kind === "core");

for (const c of coreCases) {
  test(`fixture ${c.id}`, () => {
    assert.deepEqual(run(c.input), c.expected);
  });
}

test("boundary: absolute value exactly 999,999,999,999 is legal", () => {
  assert.deepEqual(run({ mode: "of", first: "999999999999", second: "100" }), {
    ok: true,
    result: { mode: "of", value: "999999999999", display: "999999999999", direction: null },
  });
  assert.deepEqual(run({ mode: "of", first: "-999999999999", second: "100" }), {
    ok: true,
    result: { mode: "of", value: "-999999999999", display: "-999999999999", direction: null },
  });
});

test("boundary: raw exactly 24 characters is legal", () => {
  // 0.00000000000000000001 has 22 chars; pad the fraction to exactly 24.
  const raw = "0." + "0".repeat(21) + "1";
  assert.equal(raw.length, 24);
  // share: 1e-22 / 1e-10 * 100 = 1e-10 exactly.
  const outcome = run({ mode: "share", first: raw, second: "0.0000000001" });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.value, "0.0000000001");
  assert.equal(outcome.result.display, "0");
});

test("grammar: valid and invalid shapes", () => {
  assert.equal(run({ mode: "of", first: "0.5", second: "10" }).ok, true);
  for (const bad of [".5", "5.", "007", "+5", "1e3", " 5", "5 ", "50%", "1,000", "--5", "0x10"]) {
    assert.deepEqual(
      run({ mode: "of", first: bad, second: "10" }),
      { ok: false, error: { code: "NUMBER_FORMAT", field: "first", row: null } },
      `expected NUMBER_FORMAT for ${JSON.stringify(bad)}`
    );
  }
});

test("zero judged on exact value: -0 and 0.00 are zero", () => {
  assert.deepEqual(run({ mode: "share", first: "5", second: "-0" }), {
    ok: false,
    error: { code: "DIVISION_BY_ZERO", field: "second", row: null },
  });
  assert.deepEqual(run({ mode: "change", first: "0.00", second: "5" }), {
    ok: false,
    error: { code: "DIVISION_BY_ZERO", field: "first", row: null },
  });
  // of mode never divides: zeros are legal.
  assert.deepEqual(run({ mode: "of", first: "-0", second: "0.00" }), {
    ok: true,
    result: { mode: "of", value: "0", display: "0", direction: null },
  });
});

test("schema: wrong types, missing fields, accessors", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run("of"), schema);
  assert.deepEqual(run({ mode: "of", first: "1" }), schema);
  assert.deepEqual(run({ mode: "of", first: 1, second: "2" }), schema);
  assert.deepEqual(run({ mode: 1, first: "1", second: "2" }), schema);
  const withGetter = { mode: "of", second: "2" };
  Object.defineProperty(withGetter, "first", {
    enumerable: true,
    get() {
      return "1";
    },
  });
  assert.deepEqual(run(withGetter), schema);
});

test("unicode: lone surrogate is UNICODE, after INPUT_LIMIT order", () => {
  assert.deepEqual(run({ mode: "of", first: "\uD800", second: "1" }), {
    ok: false,
    error: { code: "UNICODE", field: "first", row: null },
  });
  assert.deepEqual(run({ mode: "of", first: "1\uDC00", second: "1" }), {
    ok: false,
    error: { code: "UNICODE", field: "first", row: null },
  });
});

test("display never derives from the rounded value", () => {
  // Exact result is 2.3449999999999: value rounds to 2.345 at 10 places,
  // but display must round the exact value to 2.34, not 2.35.
  assert.deepEqual(run({ mode: "of", first: "23.449999999999", second: "10" }), {
    ok: true,
    result: { mode: "of", value: "2.345", display: "2.34", direction: null },
  });
});

test("negative display tie rounds half away from zero", () => {
  // -2.525 exactly: display -2.53 (away from zero), value -2.525.
  assert.deepEqual(run({ mode: "of", first: "-2.5", second: "101" }), {
    ok: true,
    result: { mode: "of", value: "-2.525", display: "-2.53", direction: null },
  });
});

test("normalizeEcho trims and normalizes per the normalized-string rules", () => {
  assert.equal(normalizeEcho("20"), "20");
  assert.equal(normalizeEcho("20.50"), "20.5");
  assert.equal(normalizeEcho("-0"), "0");
  assert.equal(normalizeEcho("-0.00"), "0");
  assert.equal(normalizeEcho("0.5"), "0.5");
  assert.equal(normalizeEcho("-12.340"), "-12.34");
  assert.equal(normalizeEcho("007"), null);
  assert.equal(normalizeEcho("abc"), null);
});
