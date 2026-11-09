// Core tests: every literal core fixture from the SPEC's fixtures.json
// (vendored verbatim into test/fixtures.json from spec candidate
// ed41923a03d27c2c826658f4a27749ea188728a2), deep-compared against the
// product's run(), plus hand-derived endpoint, boundary, invariant, and
// validation-order cases. Expected values in the extra cases were worked
// out from the SPEC's pinned tables and rules by hand, never from the
// implementation's output.

import assert from "node:assert/strict";
import test from "node:test";
import { MEN_ROWS, WOMEN_ROWS, run } from "../public/js/core/clothing.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

for (const entry of coreCases) {
  test(`fixture ${entry.id}`, () => {
    assert.deepEqual(run(entry.input), entry.expected);
  });
}

function input(overrides) {
  return {
    garment: "women",
    mode: "measurement",
    measurementCm: "",
    fromSystem: "us",
    sizeValue: "",
    ...overrides,
  };
}

function expectError(overrides, code, field) {
  assert.deepEqual(run(input(overrides)), { ok: false, error: { code, field, row: null } });
}

test("legal measurement endpoints: 50.0 and 200.0 pass the field range", () => {
  const low = run(input({ measurementCm: "50.0" }));
  assert.equal(low.ok, true);
  assert.equal(low.result.status, "below-range");
  assert.equal(low.result.measurementCm, 50);
  const high = run(input({ measurementCm: "200.0" }));
  assert.equal(high.ok, true);
  assert.equal(high.result.status, "above-range");
  assert.equal(high.result.measurementCm, 200);
});

test("just outside the field range is RANGE; grammar failure beats range", () => {
  expectError({ measurementCm: "49.9" }, "RANGE", "measurementCm");
  expectError({ measurementCm: "200.1" }, "RANGE", "measurementCm");
  expectError({ measurementCm: "0" }, "RANGE", "measurementCm");
  // 99.55 is grammar-invalid (two decimals), so DECIMAL_FORMAT, not RANGE.
  expectError({ measurementCm: "99.55" }, "DECIMAL_FORMAT", "measurementCm");
});

test("measurement grammar classes", () => {
  expectError({ measurementCm: "088" }, "DECIMAL_FORMAT", "measurementCm");
  expectError({ measurementCm: "88." }, "DECIMAL_FORMAT", "measurementCm");
  expectError({ measurementCm: ".5" }, "DECIMAL_FORMAT", "measurementCm");
  expectError({ measurementCm: " 88" }, "DECIMAL_FORMAT", "measurementCm");
  expectError({ measurementCm: "88 " }, "DECIMAL_FORMAT", "measurementCm");
  expectError({ measurementCm: "+88" }, "DECIMAL_FORMAT", "measurementCm");
  expectError({ measurementCm: "1e2" }, "DECIMAL_FORMAT", "measurementCm");
  expectError({ measurementCm: "８８" }, "DECIMAL_FORMAT", "measurementCm");
  // The grammar caps the integer part at 3 digits, so 1000 never reaches
  // the range check.
  expectError({ measurementCm: "1000" }, "DECIMAL_FORMAT", "measurementCm");
  expectError({ measurementCm: "999" }, "RANGE", "measurementCm");
});

test("measurementCm output is an integer for whole centimetres", () => {
  const outcome = run(input({ measurementCm: "88.0" }));
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.measurementCm, 88);
  const decimal = run(input({ measurementCm: "88.5" }));
  assert.equal(decimal.result.measurementCm, 88.5);
});

test("half-open invariant: each row's low edge hits that row, its high edge hits the next", () => {
  const charts = [
    ["women", [74, 79, 84, 89, 94, 99, 104, 110, 116]],
    ["men", [86, 91, 96, 101, 106, 111, 116, 121]],
  ];
  for (const [garment, edges] of charts) {
    for (let i = 0; i < edges.length - 1; i += 1) {
      const atLow = run(input({ garment, measurementCm: String(edges[i]) }));
      assert.equal(atLow.ok, true);
      assert.equal(atLow.result.status, "in-range");
      assert.equal(atLow.result.row.row, i + 1, `${garment} low edge ${edges[i]}`);
      assert.equal(atLow.result.onBoundary, true);
      const justBelowHigh = run(
        input({ garment, measurementCm: (edges[i + 1] - 0.1).toFixed(1) }),
      );
      assert.equal(justBelowHigh.result.row.row, i + 1, `${garment} below high ${edges[i + 1]}`);
      assert.equal(justBelowHigh.result.onBoundary, false);
    }
    const atTop = run(input({ garment, measurementCm: String(edges[edges.length - 1]) }));
    assert.equal(atTop.result.status, "above-range", `${garment} top edge`);
    const belowChart = run(input({ garment, measurementCm: (edges[0] - 0.1).toFixed(1) }));
    assert.equal(belowChart.result.status, "below-range", `${garment} below chart`);
  }
});

test("size codes do not repeat within any searched column of either table", () => {
  for (const rows of [WOMEN_ROWS, MEN_ROWS]) {
    for (const column of ["usLetter", "usNumeric", "ukNumeric", "euNumeric", "jpLetter", "jpNumeric"]) {
      const seen = new Set();
      for (const row of rows) {
        const value = row[column];
        if (value === null) continue;
        assert.equal(seen.has(value), false, `${column} repeats ${value}`);
        seen.add(value);
      }
    }
  }
});

test("men: US 38 and UK 38 hit the same row (both are chest-inches labels)", () => {
  const fromUs = run(input({ garment: "men", mode: "size", fromSystem: "us", sizeValue: "38" }));
  const fromUk = run(input({ garment: "men", mode: "size", fromSystem: "uk", sizeValue: "38" }));
  assert.equal(fromUs.ok, true);
  assert.equal(fromUk.ok, true);
  assert.deepEqual(fromUs.result.row, fromUk.result.row);
  assert.equal(fromUs.result.row.row, 3);
  assert.equal(fromUs.result.matchedBy, "numeric");
  assert.equal(fromUk.result.matchedBy, "numeric");
});

test("JP letter and numeric columns are searched separately with the right matchedBy", () => {
  const numeric = run(input({ mode: "size", fromSystem: "jp", sizeValue: "7" }));
  assert.equal(numeric.result.row.row, 3);
  assert.equal(numeric.result.matchedBy, "numeric");
  const letter = run(input({ mode: "size", fromSystem: "jp", sizeValue: "s" }));
  assert.equal(letter.result.row.row, 3);
  assert.equal(letter.result.matchedBy, "letter");
  assert.equal(letter.result.sizeToken, "S");
});

test("women US numeric 0 is a real code (row 1), not an unknown size", () => {
  const outcome = run(input({ mode: "size", fromSystem: "us", sizeValue: "0" }));
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.row.row, 1);
  assert.equal(outcome.result.matchedBy, "numeric");
});

test("size grammar: leading zeros, spaces, and symbols are SIZE_FORMAT", () => {
  expectError({ mode: "size", sizeValue: "04" }, "SIZE_FORMAT", "sizeValue");
  expectError({ mode: "size", fromSystem: "eu", sizeValue: "048" }, "SIZE_FORMAT", "sizeValue");
  expectError({ mode: "size", sizeValue: "M " }, "SIZE_FORMAT", "sizeValue");
  expectError({ mode: "size", sizeValue: " M" }, "SIZE_FORMAT", "sizeValue");
  expectError({ mode: "size", sizeValue: "M-L" }, "SIZE_FORMAT", "sizeValue");
  expectError({ mode: "size", sizeValue: "00" }, "SIZE_FORMAT", "sizeValue");
});

test("unknown sizes after normalisation are UNKNOWN_SIZE", () => {
  expectError({ mode: "size", sizeValue: "4xl" }, "UNKNOWN_SIZE", "sizeValue");
  expectError({ mode: "size", fromSystem: "uk", sizeValue: "5" }, "UNKNOWN_SIZE", "sizeValue");
  expectError({ mode: "size", fromSystem: "eu", sizeValue: "33" }, "UNKNOWN_SIZE", "sizeValue");
  // Men's JP numeric column is all null, so a JP number never matches.
  expectError(
    { garment: "men", mode: "size", fromSystem: "jp", sizeValue: "9" },
    "UNKNOWN_SIZE",
    "sizeValue",
  );
  // LL exists only in the women's JP letter column.
  expectError(
    { garment: "men", mode: "size", fromSystem: "jp", sizeValue: "LL" },
    "UNKNOWN_SIZE",
    "sizeValue",
  );
});

test("field capacities run before content checks, in field order", () => {
  expectError({ garment: "womenx" }, "INPUT_LIMIT", "garment");
  expectError({ mode: "measurementX" }, "INPUT_LIMIT", "mode");
  expectError({ measurementCm: "123456" }, "INPUT_LIMIT", "measurementCm");
  expectError({ mode: "size", fromSystem: "usa" }, "INPUT_LIMIT", "fromSystem");
  expectError({ mode: "size", sizeValue: "XXXXL" }, "INPUT_LIMIT", "sizeValue");
  // The unused fields in each mode still get capacity checks.
  expectError({ measurementCm: "88", sizeValue: "XXXXX" }, "INPUT_LIMIT", "sizeValue");
  expectError({ measurementCm: "88", fromSystem: "usx" }, "INPUT_LIMIT", "fromSystem");
  expectError({ mode: "size", measurementCm: "123456" }, "INPUT_LIMIT", "measurementCm");
});

test("unused-field content is not validated in the active mode", () => {
  const measurement = run(input({ measurementCm: "88", fromSystem: "xx", sizeValue: "9号" }));
  assert.equal(measurement.ok, true);
  const size = run(input({ mode: "size", measurementCm: "x9x", sizeValue: "M" }));
  assert.equal(size.ok, true);
});

test("empty and enum checks per field, in field order", () => {
  expectError({ garment: "" }, "EMPTY", "garment");
  expectError({ garment: "Women" }, "ENUM", "garment");
  expectError({ mode: "" }, "EMPTY", "mode");
  expectError({ mode: "measure" }, "ENUM", "mode");
  expectError({ measurementCm: "" }, "EMPTY", "measurementCm");
  expectError({ mode: "size", fromSystem: "" }, "EMPTY", "fromSystem");
  expectError({ mode: "size", fromSystem: "US" }, "ENUM", "fromSystem");
  expectError({ mode: "size", sizeValue: "" }, "EMPTY", "sizeValue");
  // garment is checked before mode, mode before the mode-specific fields.
  expectError({ garment: "kids", mode: "bogus", measurementCm: "x" }, "ENUM", "garment");
  expectError({ mode: "bogus", measurementCm: "x" }, "ENUM", "mode");
  // In size mode the unused measurementCm surrogate check precedes
  // fromSystem's enum check (field order).
  expectError(
    { mode: "size", measurementCm: "\uD800", fromSystem: "xx" },
    "UNICODE",
    "measurementCm",
  );
});

test("unpaired surrogates are UNICODE, checked before grammar and enum", () => {
  expectError({ garment: "\uD800" }, "UNICODE", "garment");
  expectError({ measurementCm: "\uDC00" }, "UNICODE", "measurementCm");
  expectError({ mode: "size", sizeValue: "\uD800" }, "UNICODE", "sizeValue");
  // A well-formed surrogate pair is not UNICODE; it fails later checks.
  expectError({ measurementCm: "\uD83D\uDE00" }, "DECIMAL_FORMAT", "measurementCm");
});

test("schema gate: shape, types, extra/missing fields, accessors", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("women"), schema);
  assert.deepEqual(run({ garment: "women" }), schema);
  assert.deepEqual(run(input({ extra: "x" })), schema);
  const missing = input({});
  delete missing.sizeValue;
  assert.deepEqual(run(missing), schema);
  assert.deepEqual(run(input({ measurementCm: 88 })), schema);
  assert.deepEqual(run(input({ garment: null })), schema);
  let accessorReads = 0;
  const hostile = input({});
  Object.defineProperty(hostile, "sizeValue", {
    enumerable: true,
    get() {
      accessorReads += 1;
      return "M";
    },
  });
  assert.deepEqual(run(hostile), schema);
  assert.equal(accessorReads, 0);
});
