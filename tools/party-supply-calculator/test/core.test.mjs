// Core tests. Expected values come from the fixed SPEC fixtures
// (test/fixtures.json, copied verbatim from docs/specs/party-supply-calculator)
// plus cases derived by hand from the SPEC rules and checked against the
// independent hand computation in VERIFICATION.md — never from the core's
// own output.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizeEcho, run } from "../public/js/core/core.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8")
);
const coreCases = fixtures.cases.filter((c) => c.kind === "core");
const errorCases = fixtures.cases.filter((c) => c.kind === "error");

for (const c of [...coreCases, ...errorCases]) {
  test(`fixture ${c.id}`, () => {
    assert.deepEqual(run(c.input), c.expected);
  });
}

test("boundary: hand-computed extra cases", () => {
  // 1 guest, 12 h, full meal: f = 3/2, drinks per person 4550 ml.
  assert.deepEqual(run({ guests: "1", durationHours: "12", mealType: "full" }), {
    ok: true,
    result: {
      mealType: "full",
      durationHours: 12,
      durationFactor: 1.5,
      perPerson: { foodG: 750, drinksMl: 4550, cups: 3, plates: 2, iceKg: 0.75 },
      totals: { foodG: 800, drinksMl: 5000, drinksBottles2L: 3, cups: 3, plates: 3, iceKg: 1 },
    },
  });
  // 500 guests, 0.5 h, snacks: drinks 500 x 525 = 262500 ml, 132 bottles.
  assert.deepEqual(run({ guests: "500", durationHours: "0.5", mealType: "snacks" }), {
    ok: true,
    result: {
      mealType: "snacks",
      durationHours: 0.5,
      durationFactor: 1,
      perPerson: { foodG: 200, drinksMl: 525, cups: 2, plates: 1, iceKg: 0.5 },
      totals: { foodG: 100000, drinksMl: 262500, drinksBottles2L: 132, cups: 1000, plates: 600, iceKg: 250 },
    },
  });
  // 3 guests, 3.5 h, light: f = 6/5; food 3 x 420 = 1260 -> 1300 g.
  assert.deepEqual(run({ guests: "3", durationHours: "3.5", mealType: "light" }), {
    ok: true,
    result: {
      mealType: "light",
      durationHours: 3.5,
      durationFactor: 1.2,
      perPerson: { foodG: 420, drinksMl: 1575, cups: 3, plates: 1, iceKg: 0.6 },
      totals: { foodG: 1300, drinksMl: 5000, drinksBottles2L: 3, cups: 9, plates: 4, iceKg: 2 },
    },
  });
  // 2 guests, 1 h, full: plates ceil(2 x 2 x 6/5) = ceil(4.8) = 5.
  assert.deepEqual(run({ guests: "2", durationHours: "1", mealType: "full" }), {
    ok: true,
    result: {
      mealType: "full",
      durationHours: 1,
      durationFactor: 1,
      perPerson: { foodG: 500, drinksMl: 700, cups: 2, plates: 2, iceKg: 0.5 },
      totals: { foodG: 1000, drinksMl: 1500, drinksBottles2L: 1, cups: 4, plates: 5, iceKg: 1 },
    },
  });
});

test("boundary: cups switch at h2 = 6 / 7 (3 h vs 3.5 h)", () => {
  assert.equal(run({ guests: "1", durationHours: "3", mealType: "snacks" }).result.perPerson.cups, 2);
  assert.equal(run({ guests: "1", durationHours: "3.5", mealType: "snacks" }).result.perPerson.cups, 3);
});

test("boundary: factor switches at h2 = 4 / 5 and 8 / 9", () => {
  assert.equal(run({ guests: "1", durationHours: "2", mealType: "light" }).result.durationFactor, 1);
  assert.equal(run({ guests: "1", durationHours: "2.5", mealType: "light" }).result.durationFactor, 1.2);
  assert.equal(run({ guests: "1", durationHours: "4", mealType: "full" }).result.durationFactor, 1.2);
  assert.equal(run({ guests: "1", durationHours: "4.5", mealType: "full" }).result.durationFactor, 1.5);
});

test("grammar: guests integer shapes", () => {
  const fmt = { ok: false, error: { code: "INTEGER_FORMAT", field: "guests", row: null } };
  for (const bad of ["007", "00", "1.5", " 20", "20 ", "+20", "-20", "1e2", "20,000"]) {
    assert.deepEqual(run({ guests: bad, durationHours: "3", mealType: "full" }), fmt, bad);
  }
  assert.equal(run({ guests: "0", durationHours: "3", mealType: "full" }).error.code, "RANGE");
  assert.equal(run({ guests: "501", durationHours: "3", mealType: "full" }).error.code, "RANGE");
  assert.equal(run({ guests: "500", durationHours: "3", mealType: "full" }).ok, true);
});

test("grammar: duration shapes, STEP, and range", () => {
  const step = { ok: false, error: { code: "STEP", field: "durationHours", row: null } };
  for (const bad of ["2.3", "1.1", "11.9"]) {
    assert.deepEqual(run({ guests: "10", durationHours: bad, mealType: "snacks" }), step, bad);
  }
  const dec = { ok: false, error: { code: "DECIMAL_FORMAT", field: "durationHours", row: null } };
  for (const bad of ["2.35", "2.55", "0.25", ".5", "3.", " 3", "3 ", "+3", "1e1"]) {
    assert.deepEqual(run({ guests: "10", durationHours: bad, mealType: "snacks" }), dec, bad);
  }
  assert.equal(run({ guests: "10", durationHours: "12.5", mealType: "snacks" }).error.code, "RANGE");
  assert.equal(run({ guests: "10", durationHours: "0", mealType: "snacks" }).error.code, "RANGE");
  assert.equal(run({ guests: "10", durationHours: "0.0", mealType: "snacks" }).error.code, "RANGE");
  assert.equal(run({ guests: "10", durationHours: "12", mealType: "snacks" }).ok, true);
  // Leading zeros in the integer part are not forbidden by the SPEC grammar.
  assert.equal(run({ guests: "10", durationHours: "00.5", mealType: "snacks" }).ok, true);
  assert.equal(run({ guests: "10", durationHours: "2.0", mealType: "snacks" }).result.durationHours, 2);
});

test("enum: mealType values", () => {
  const enm = { ok: false, error: { code: "ENUM", field: "mealType", row: null } };
  for (const bad of ["feast", "", "FULL", "snacks ", "snacks12", "Light"]) {
    assert.deepEqual(run({ guests: "10", durationHours: "2", mealType: bad }), enm, bad);
  }
  for (const good of ["snacks", "light", "full"]) {
    assert.equal(run({ guests: "10", durationHours: "2", mealType: good }).ok, true, good);
  }
});

test("capacity and empty: INPUT_LIMIT beats everything, EMPTY on blank fields", () => {
  assert.deepEqual(run({ guests: "1".repeat(9), durationHours: "3", mealType: "full" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "guests", row: null },
  });
  assert.deepEqual(run({ guests: "10", durationHours: "1".repeat(9), mealType: "full" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "durationHours", row: null },
  });
  assert.deepEqual(run({ guests: "10", durationHours: "2", mealType: "snacks123" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "mealType", row: null },
  });
  assert.deepEqual(run({ guests: "", durationHours: "3", mealType: "full" }), {
    ok: false,
    error: { code: "EMPTY", field: "guests", row: null },
  });
  assert.deepEqual(run({ guests: "10", durationHours: "", mealType: "full" }), {
    ok: false,
    error: { code: "EMPTY", field: "durationHours", row: null },
  });
  // Exactly 8 characters is legal capacity-wise (value still range-checked).
  assert.equal(run({ guests: "12345678", durationHours: "3", mealType: "full" }).error.code, "RANGE");
});

test("first error wins, in guests / durationHours / mealType order", () => {
  assert.deepEqual(run({ guests: "abc", durationHours: "xyz", mealType: "nope" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "guests", row: null },
  });
  assert.deepEqual(run({ guests: "10", durationHours: "xyz", mealType: "nope" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "durationHours", row: null },
  });
  assert.deepEqual(run({ guests: "10", durationHours: "2", mealType: "nope" }), {
    ok: false,
    error: { code: "ENUM", field: "mealType", row: null },
  });
});

test("schema: wrong types, missing/extra fields, accessors", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run("20"), schema);
  assert.deepEqual(run({ guests: "20", durationHours: "3" }), schema);
  assert.deepEqual(run({ guests: 20, durationHours: "3", mealType: "full" }), schema);
  assert.deepEqual(
    run({ guests: "20", durationHours: "3", mealType: "full", extra: "1" }),
    schema
  );
  const withGetter = { durationHours: "3", mealType: "full" };
  Object.defineProperty(withGetter, "guests", {
    enumerable: true,
    get() {
      return "20";
    },
  });
  assert.deepEqual(run(withGetter), schema);
});

test("unicode: lone surrogate is UNICODE, after INPUT_LIMIT order", () => {
  assert.deepEqual(run({ guests: "\uD800", durationHours: "3", mealType: "full" }), {
    ok: false,
    error: { code: "UNICODE", field: "guests", row: null },
  });
  assert.deepEqual(run({ guests: "10", durationHours: "3", mealType: "snacks\uDC00" }), {
    ok: false,
    error: { code: "UNICODE", field: "mealType", row: null },
  });
  assert.deepEqual(
    run({ guests: "\uD800" + "1".repeat(16), durationHours: "3", mealType: "full" }),
    { ok: false, error: { code: "INPUT_LIMIT", field: "guests", row: null } }
  );
});

test("invariants: totals are rounded up to buyable units", () => {
  const inputs = [
    ["1", "0.5", "snacks"], ["7", "3", "snacks"], ["12", "2.5", "light"],
    ["30", "6", "light"], ["500", "12", "full"], ["3", "3.5", "light"],
    ["2", "1", "full"], ["13", "7.5", "full"], ["99", "11.5", "snacks"],
  ];
  for (const [guests, durationHours, mealType] of inputs) {
    const { result } = run({ guests, durationHours, mealType });
    assert.equal(result.totals.foodG % 100, 0);
    assert.equal(result.totals.drinksMl % 500, 0);
    assert.ok(result.totals.drinksBottles2L * 2000 >= result.totals.drinksMl);
    assert.ok(result.totals.iceKg * 2 === Math.floor(result.totals.iceKg * 2));
    assert.ok(result.totals.plates >= Number(guests) * result.perPerson.plates);
    // Removing the 20% spare never increases the plate count.
    assert.ok(
      Math.ceil((Number(guests) * result.perPerson.plates * 6) / 5) >=
        Number(guests) * result.perPerson.plates
    );
  }
});

test("normalizeEcho trims and normalizes per the grammar rules", () => {
  assert.equal(normalizeEcho("20"), "20");
  assert.equal(normalizeEcho("007"), "7");
  assert.equal(normalizeEcho("2.0"), "2");
  assert.equal(normalizeEcho("2.5"), "2.5");
  assert.equal(normalizeEcho("00.5"), "0.5");
  assert.equal(normalizeEcho("0"), "0");
  assert.equal(normalizeEcho("abc"), null);
  assert.equal(normalizeEcho("2.35"), null);
  assert.equal(normalizeEcho("2.3"), "2.3");
});
