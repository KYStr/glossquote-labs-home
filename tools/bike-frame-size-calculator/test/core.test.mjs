// Core tests. Expected values come from the fixed SPEC fixtures
// (test/fixtures.json, copied verbatim from docs/specs/bike-frame-size-calculator)
// plus cases derived by hand from the SPEC rules and checked against an
// independent Decimal recomputation — never from the core's own output.

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

test("boundary: range endpoints are legal", () => {
  assert.deepEqual(run({ heightCm: "120", inseamCm: "50", bikeType: "road" }), {
    ok: true,
    result: {
      bikeType: "road",
      heightCm: 120,
      inseamCm: 50,
      centreCm: 33.5,
      centreIn: 13.2,
      rangeCm: { low: 32.5, high: 34.5 },
      rangeIn: { low: 12.8, high: 13.6 },
      letter: "XXS",
      saddleHeightCm: 44.2,
      warning: null,
    },
  });
  assert.deepEqual(run({ heightCm: "120", inseamCm: "110", bikeType: "road" }), {
    ok: true,
    result: {
      bikeType: "road",
      heightCm: 120,
      inseamCm: 110,
      centreCm: 73.7,
      centreIn: 29,
      rangeCm: { low: 72.7, high: 74.7 },
      rangeIn: { low: 28.6, high: 29.4 },
      letter: "XXS",
      saddleHeightCm: 97.1,
      warning: { code: "INSEAM_RATIO", ratio: 0.917 },
    },
  });
  assert.deepEqual(run({ heightCm: "220", inseamCm: "50", bikeType: "road" }), {
    ok: true,
    result: {
      bikeType: "road",
      heightCm: 220,
      inseamCm: 50,
      centreCm: 33.5,
      centreIn: 13.2,
      rangeCm: { low: 32.5, high: 34.5 },
      rangeIn: { low: 12.8, high: 13.6 },
      letter: "XXL",
      saddleHeightCm: 44.2,
      warning: { code: "INSEAM_RATIO", ratio: 0.227 },
    },
  });
});

test("boundary: just outside the range is RANGE on the right field", () => {
  for (const bad of ["119.9", "220.1"]) {
    assert.deepEqual(run({ heightCm: bad, inseamCm: "80", bikeType: "road" }), {
      ok: false,
      error: { code: "RANGE", field: "heightCm", row: null },
    });
  }
  for (const bad of ["49.9", "110.1"]) {
    assert.deepEqual(run({ heightCm: "175", inseamCm: bad, bikeType: "road" }), {
      ok: false,
      error: { code: "RANGE", field: "inseamCm", row: null },
    });
  }
});

test("grammar: valid and invalid shapes", () => {
  assert.equal(run({ heightCm: "175.5", inseamCm: "80", bikeType: "road" }).ok, true);
  assert.equal(run({ heightCm: "175", inseamCm: "80.5", bikeType: "road" }).ok, true);
  for (const bad of [".5", "5.", "+5", "1e3", " 5", "5 ", "50%", "1,000", "--5", "0x10", "175.55", "80.55"]) {
    assert.deepEqual(
      run({ heightCm: bad, inseamCm: "80", bikeType: "road" }),
      { ok: false, error: { code: "DECIMAL_FORMAT", field: "heightCm", row: null } },
      `expected DECIMAL_FORMAT for ${JSON.stringify(bad)}`
    );
  }
  for (const bad of ["80.55", "12.34"]) {
    assert.deepEqual(
      run({ heightCm: "175", inseamCm: bad, bikeType: "road" }),
      { ok: false, error: { code: "DECIMAL_FORMAT", field: "inseamCm", row: null } },
      `expected DECIMAL_FORMAT for ${JSON.stringify(bad)}`
    );
  }
});

test("grammar: leading zeros are allowed, so 007 is a value (7), not a format error", () => {
  assert.deepEqual(run({ heightCm: "175", inseamCm: "007", bikeType: "road" }), {
    ok: false,
    error: { code: "RANGE", field: "inseamCm", row: null },
  });
});

test("bike type: only road, mountain, hybrid are accepted", () => {
  for (const type of ["road", "mountain", "hybrid"]) {
    assert.equal(run({ heightCm: "175", inseamCm: "80", bikeType: type }).ok, true);
  }
  for (const bad of ["gravel", "Road", "ROAD", "mtb", "city"]) {
    assert.deepEqual(run({ heightCm: "175", inseamCm: "80", bikeType: bad }), {
      ok: false,
      error: { code: "ENUM", field: "bikeType", row: null },
    });
  }
  assert.deepEqual(run({ heightCm: "175", inseamCm: "80", bikeType: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "bikeType", row: null },
  });
});

test("same inseam, three bike types: road > hybrid > mountain, road - mountain == 11.0", () => {
  const road = run({ heightCm: "175", inseamCm: "90", bikeType: "road" }).result;
  const hybrid = run({ heightCm: "175", inseamCm: "90", bikeType: "hybrid" }).result;
  const mountain = run({ heightCm: "175", inseamCm: "90", bikeType: "mountain" }).result;
  assert.equal(road.centreCm, 60.3);
  assert.equal(hybrid.centreCm, 57.6);
  assert.equal(mountain.centreCm, 49.3);
  assert.ok(road.centreCm > hybrid.centreCm);
  assert.ok(hybrid.centreCm > mountain.centreCm);
  assert.equal(road.centreCm - mountain.centreCm, 11);
  // The saddle height is the same for all three types.
  assert.equal(road.saddleHeightCm, 79.5);
  assert.equal(hybrid.saddleHeightCm, 79.5);
  assert.equal(mountain.saddleHeightCm, 79.5);
});

test("range endpoints are centre +/- 1.0 cm on the unrounded centre", () => {
  for (const [heightCm, inseamCm, bikeType] of [
    ["175", "80", "road"],
    ["190", "88", "mountain"],
    ["155", "68", "hybrid"],
    ["200", "79.9", "road"],
  ]) {
    const { result } = run({ heightCm, inseamCm, bikeType });
    assert.equal(result.rangeCm.low, result.centreCm - 1);
    assert.equal(result.rangeCm.high, result.centreCm + 1);
  }
});

test("letter size follows height alone, half-open at every boundary", () => {
  const cases = [
    ["149.9", "XXS"], ["150", "XS"], ["159.9", "XS"], ["160", "S"],
    ["167.9", "S"], ["168", "M"], ["177.9", "M"], ["178", "L"],
    ["184.9", "L"], ["185", "XL"], ["192.9", "XL"], ["193", "XXL"],
  ];
  for (const [heightCm, letter] of cases) {
    assert.equal(
      run({ heightCm, inseamCm: "70", bikeType: "road" }).result.letter,
      letter,
      `height ${heightCm}`
    );
  }
});

test("ratio warning: endpoints 0.40 and 0.50 are quiet, just outside warns", () => {
  assert.equal(run({ heightCm: "200", inseamCm: "80", bikeType: "road" }).result.warning, null);
  assert.equal(run({ heightCm: "200", inseamCm: "100", bikeType: "road" }).result.warning, null);
  // 79.9/200 = 0.3995 exactly: warns, and the displayed ratio rounds
  // half-up to 0.400 even though the exact ratio is below the band.
  assert.deepEqual(run({ heightCm: "200", inseamCm: "79.9", bikeType: "road" }).result.warning, {
    code: "INSEAM_RATIO",
    ratio: 0.4,
  });
  // 100.1/200 = 0.5005 exactly: warns, displayed ratio 0.501.
  assert.deepEqual(run({ heightCm: "200", inseamCm: "100.1", bikeType: "road" }).result.warning, {
    code: "INSEAM_RATIO",
    ratio: 0.501,
  });
});

test("rounding is half-up on exact integers, never on floats", () => {
  // Saddle tie: 50 x 0.883 = 44.15 exactly -> 44.2 (fixture road-min-inseam).
  assert.equal(run({ heightCm: "170", inseamCm: "50", bikeType: "road" }).result.saddleHeightCm, 44.2);
  // Centre tie boundary: 88 x 0.67 - 11 = 47.96 -> 48.0 (fixture mtb-tall).
  assert.equal(run({ heightCm: "190", inseamCm: "88", bikeType: "mountain" }).result.centreCm, 48);
  // Centre inch tie: 79.9 x 0.67 = 53.533; /2.54 = 21.076... -> 21.1.
  assert.equal(run({ heightCm: "200", inseamCm: "79.9", bikeType: "road" }).result.centreIn, 21.1);
});

test("capacity and empty: INPUT_LIMIT beats everything, EMPTY on blank fields", () => {
  assert.deepEqual(run({ heightCm: "1".repeat(7), inseamCm: "80", bikeType: "road" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "heightCm", row: null },
  });
  assert.deepEqual(run({ heightCm: "175", inseamCm: "1".repeat(7), bikeType: "road" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "inseamCm", row: null },
  });
  assert.deepEqual(run({ heightCm: "", inseamCm: "80", bikeType: "road" }), {
    ok: false,
    error: { code: "EMPTY", field: "heightCm", row: null },
  });
  assert.deepEqual(run({ heightCm: "175", inseamCm: "", bikeType: "road" }), {
    ok: false,
    error: { code: "EMPTY", field: "inseamCm", row: null },
  });
  // Exactly 6 characters is legal capacity-wise (value still range-checked).
  assert.equal(run({ heightCm: "123456", inseamCm: "80", bikeType: "road" }).error.code, "RANGE");
});

test("first error wins, height before inseam before bike type", () => {
  assert.deepEqual(run({ heightCm: "abc", inseamCm: "xyz", bikeType: "gravel" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "heightCm", row: null },
  });
  assert.deepEqual(run({ heightCm: "175", inseamCm: "xyz", bikeType: "gravel" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "inseamCm", row: null },
  });
  assert.deepEqual(run({ heightCm: "175", inseamCm: "80", bikeType: "gravel" }), {
    ok: false,
    error: { code: "ENUM", field: "bikeType", row: null },
  });
});

test("schema: wrong types, missing/extra fields, accessors", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run("175"), schema);
  assert.deepEqual(run({ heightCm: "175", inseamCm: "80" }), schema);
  assert.deepEqual(run({ heightCm: 175, inseamCm: "80", bikeType: "road" }), schema);
  assert.deepEqual(run({ heightCm: "175", inseamCm: "80", bikeType: 1 }), schema);
  assert.deepEqual(run({ heightCm: "175", inseamCm: "80", bikeType: "road", extra: "1" }), schema);
  const withGetter = { heightCm: "175", inseamCm: "80" };
  Object.defineProperty(withGetter, "bikeType", {
    enumerable: true,
    get() {
      return "road";
    },
  });
  assert.deepEqual(run(withGetter), schema);
});

test("unicode: lone surrogate is UNICODE, after INPUT_LIMIT order", () => {
  assert.deepEqual(run({ heightCm: "\uD800", inseamCm: "80", bikeType: "road" }), {
    ok: false,
    error: { code: "UNICODE", field: "heightCm", row: null },
  });
  assert.deepEqual(run({ heightCm: "175", inseamCm: "80", bikeType: "ro\uDC00ad" }), {
    ok: false,
    error: { code: "UNICODE", field: "bikeType", row: null },
  });
  assert.deepEqual(run({ heightCm: "\uD800" + "1".repeat(6), inseamCm: "80", bikeType: "road" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "heightCm", row: null },
  });
});

test("invariants: range ordered, warning null or INSEAM_RATIO", () => {
  for (const [heightCm, inseamCm, bikeType] of [
    ["120", "50", "road"], ["120", "110", "road"], ["175", "80", "road"],
    ["175", "80", "mountain"], ["175", "80", "hybrid"], ["220", "50", "road"],
    ["220", "110", "road"], ["200", "79.9", "road"], ["200", "100.1", "road"],
    ["149.9", "70", "road"], ["193", "88", "road"],
  ]) {
    const { result } = run({ heightCm, inseamCm, bikeType });
    assert.ok(result.rangeCm.low < result.rangeCm.high);
    assert.ok(result.rangeIn.low < result.rangeIn.high);
    assert.ok(result.warning === null || result.warning.code === "INSEAM_RATIO");
  }
});

test("normalizeEcho trims and normalizes per the grammar rules", () => {
  assert.equal(normalizeEcho("175"), "175");
  assert.equal(normalizeEcho("80.0"), "80");
  assert.equal(normalizeEcho("007"), "7");
  assert.equal(normalizeEcho("00.5"), "0.5");
  assert.equal(normalizeEcho("0.0"), "0");
  assert.equal(normalizeEcho("175.50"), null);
  assert.equal(normalizeEcho("abc"), null);
  assert.equal(normalizeEcho(".5"), null);
  assert.equal(normalizeEcho("12.34"), null);
});
