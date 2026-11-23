// Core tests. Expected values come from the fixed SPEC fixtures
// (test/fixtures.json, copied verbatim from docs/specs/waist-height-ratio-calculator)
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
  assert.deepEqual(run({ waistCm: "20", heightCm: "50" }), {
    ok: true,
    result: {
      whtr: "0.40",
      category: "healthy",
      healthyWaistMinCm: "20.0",
      healthyWaistMaxCm: "25.0",
      waistToLoseCm: null,
    },
  });
  assert.deepEqual(run({ waistCm: "300", heightCm: "300" }), {
    ok: true,
    result: {
      whtr: "1.00",
      category: "high",
      healthyWaistMinCm: "120.0",
      healthyWaistMaxCm: "150.0",
      waistToLoseCm: "150.0",
    },
  });
});

test("boundary: just outside the range is RANGE on the right field", () => {
  for (const bad of ["19.99", "300.01"]) {
    assert.deepEqual(run({ waistCm: bad, heightCm: "170" }), {
      ok: false,
      error: { code: "RANGE", field: "waistCm", row: null },
    });
  }
  for (const bad of ["49.99", "300.01"]) {
    assert.deepEqual(run({ waistCm: "76", heightCm: bad }), {
      ok: false,
      error: { code: "RANGE", field: "heightCm", row: null },
    });
  }
});

test("grammar: valid and invalid shapes", () => {
  assert.equal(run({ waistCm: "84.9", heightCm: "170" }).ok, true);
  assert.equal(run({ waistCm: "76", heightCm: "170.5" }).ok, true);
  for (const bad of [".5", "5.", "+5", "1e3", " 5", "5 ", "50%", "1,000", "--5", "0x10", "12.345"]) {
    assert.deepEqual(
      run({ waistCm: bad, heightCm: "170" }),
      { ok: false, error: { code: "DECIMAL_FORMAT", field: "waistCm", row: null } },
      `expected DECIMAL_FORMAT for ${JSON.stringify(bad)}`
    );
  }
});

test("grammar: leading zeros are allowed, so 007 is a value (7), not a format error", () => {
  assert.deepEqual(run({ waistCm: "007", heightCm: "170" }), {
    ok: false,
    error: { code: "RANGE", field: "waistCm", row: null },
  });
});

test("category flips on the exact ratio, not the displayed value", () => {
  // Both display 0.50; 84.99/170 is just under half, 85.01/170 just over.
  assert.deepEqual(run({ waistCm: "84.99", heightCm: "170" }), {
    ok: true,
    result: {
      whtr: "0.50",
      category: "healthy",
      healthyWaistMinCm: "68.0",
      healthyWaistMaxCm: "85.0",
      waistToLoseCm: null,
    },
  });
  assert.deepEqual(run({ waistCm: "85.01", heightCm: "170" }), {
    ok: true,
    result: {
      whtr: "0.50",
      category: "increased",
      healthyWaistMinCm: "68.0",
      healthyWaistMaxCm: "85.0",
      waistToLoseCm: "0.0",
    },
  });
  // 0.40 boundary: 67.99/170 below-healthy, 68.01/170 healthy; both show 0.40.
  assert.equal(run({ waistCm: "67.99", heightCm: "170" }).result.category, "below-healthy");
  assert.equal(run({ waistCm: "67.99", heightCm: "170" }).result.whtr, "0.40");
  assert.equal(run({ waistCm: "68.01", heightCm: "170" }).result.category, "healthy");
  assert.equal(run({ waistCm: "68.01", heightCm: "170" }).result.whtr, "0.40");
});

test("rounding is half-up on exact integers, never on floats", () => {
  // 20.04/160 = 0.12525 exactly: x100 = 12.525, half-up tie -> "0.13".
  assert.deepEqual(run({ waistCm: "20.04", heightCm: "160" }), {
    ok: true,
    result: {
      whtr: "0.13",
      category: "below-healthy",
      healthyWaistMinCm: "64.0",
      healthyWaistMaxCm: "80.0",
      waistToLoseCm: null,
    },
  });
  // 0.5 x 160.1 = 80.05 exactly: 1-decimal half-up tie -> "80.1".
  assert.deepEqual(run({ waistCm: "80", heightCm: "160.1" }), {
    ok: true,
    result: {
      whtr: "0.50",
      category: "healthy",
      healthyWaistMinCm: "64.0",
      healthyWaistMaxCm: "80.1",
      waistToLoseCm: null,
    },
  });
});

test("waist above height is still high, not an error", () => {
  assert.deepEqual(run({ waistCm: "300", heightCm: "50" }), {
    ok: true,
    result: {
      whtr: "6.00",
      category: "high",
      healthyWaistMinCm: "20.0",
      healthyWaistMaxCm: "25.0",
      waistToLoseCm: "275.0",
    },
  });
});

test("capacity and empty: INPUT_LIMIT beats everything, EMPTY on blank fields", () => {
  assert.deepEqual(run({ waistCm: "1".repeat(17), heightCm: "170" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "waistCm", row: null },
  });
  assert.deepEqual(run({ waistCm: "", heightCm: "170" }), {
    ok: false,
    error: { code: "EMPTY", field: "waistCm", row: null },
  });
  assert.deepEqual(run({ waistCm: "76", heightCm: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "heightCm", row: null },
  });
  // Exactly 16 characters is legal capacity-wise (value still range-checked).
  assert.equal(run({ waistCm: "1234567890123456", heightCm: "170" }).error.code, "RANGE");
});

test("first error wins, waist before height", () => {
  assert.deepEqual(run({ waistCm: "abc", heightCm: "xyz" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "waistCm", row: null },
  });
  assert.deepEqual(run({ waistCm: "76", heightCm: "xyz" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "heightCm", row: null },
  });
});

test("schema: wrong types, missing/extra fields, accessors", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run("76"), schema);
  assert.deepEqual(run({ waistCm: "76" }), schema);
  assert.deepEqual(run({ waistCm: 76, heightCm: "170" }), schema);
  assert.deepEqual(run({ waistCm: "76", heightCm: "170", extra: "1" }), schema);
  const withGetter = { heightCm: "170" };
  Object.defineProperty(withGetter, "waistCm", {
    enumerable: true,
    get() {
      return "76";
    },
  });
  assert.deepEqual(run(withGetter), schema);
});

test("unicode: lone surrogate is UNICODE, after INPUT_LIMIT order", () => {
  assert.deepEqual(run({ waistCm: "\uD800", heightCm: "170" }), {
    ok: false,
    error: { code: "UNICODE", field: "waistCm", row: null },
  });
  assert.deepEqual(run({ waistCm: "76", heightCm: "1\uDC00" }), {
    ok: false,
    error: { code: "UNICODE", field: "heightCm", row: null },
  });
  assert.deepEqual(run({ waistCm: "\uD800" + "1".repeat(16), heightCm: "170" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "waistCm", row: null },
  });
});

test("invariants: healthy range ordered, distance null or non-negative", () => {
  for (const [waistCm, heightCm] of [
    ["20", "50"], ["76", "170"], ["84.9", "170"], ["85", "170"], ["95", "170"],
    ["105", "170"], ["130", "120"], ["300", "50"], ["20.04", "160"], ["80", "160.1"],
  ]) {
    const { result } = run({ waistCm, heightCm });
    assert.ok(result.healthyWaistMinCm <= result.healthyWaistMaxCm);
    assert.ok(result.waistToLoseCm === null || !result.waistToLoseCm.startsWith("-"));
  }
});

test("normalizeEcho trims and normalizes per the grammar rules", () => {
  assert.equal(normalizeEcho("76"), "76");
  assert.equal(normalizeEcho("84.90"), "84.9");
  assert.equal(normalizeEcho("007"), "7");
  assert.equal(normalizeEcho("00.50"), "0.5");
  assert.equal(normalizeEcho("0.00"), "0");
  assert.equal(normalizeEcho("170.00"), "170");
  assert.equal(normalizeEcho("abc"), null);
  assert.equal(normalizeEcho(".5"), null);
  assert.equal(normalizeEcho("12.345"), null);
});
