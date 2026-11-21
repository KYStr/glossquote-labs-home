// Core tests: all 21 core fixtures from fixtures.json verbatim
// (deep-equal on the literal expected values), plus hand-derived /
// independently recalculated boundary, validation and invariant tests.
// Expected values were never taken from the implementation's own
// output: the 13 success fixtures were independently recomputed with
// a separate Python double-precision script following the SPEC's
// pinned operation order, and the boundary expectations below were
// derived the same way.

import assert from "node:assert/strict";
import test from "node:test";
import { MULTIPLIERS, run } from "../public/js/core/pet-feeding.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
const successCases = coreCases.filter((entry) => entry.expected.ok);

for (const entry of coreCases) {
  test(`fixture ${entry.id}`, () => {
    assert.deepEqual(run(entry.input), entry.expected);
  });
}

test("invariants hold for every success fixture", () => {
  for (const entry of successCases) {
    const result = entry.expected.result;
    assert.equal(
      result.perMealKcal.reduce((a, b) => a + b, 0),
      result.derKcal,
      `${entry.id}: perMealKcal must sum to derKcal`,
    );
    assert.equal(
      result.perMealGrams.reduce((a, b) => a + b, 0),
      result.gramsPerDay,
      `${entry.id}: perMealGrams must sum to gramsPerDay`,
    );
    assert.equal(result.perMealKcal.length, result.mealsPerDay);
    assert.equal(result.perMealGrams.length, result.mealsPerDay);
    assert.equal(
      result.cupsPerDay === null,
      entry.input.foodKcalPerCup === "",
      `${entry.id}: cupsPerDay is null exactly when no cup density is given`,
    );
    if (result.perMealCups !== null) {
      assert.equal(result.perMealCups.length, result.mealsPerDay);
      assert.ok(result.perMealCups.every((cups) => cups === result.perMealCups[0]));
    } else {
      assert.equal(result.perMealCups, null);
    }
    assert.equal(
      result.multiplier,
      MULTIPLIERS[entry.input.species][entry.input.lifeStage],
      `${entry.id}: multiplier must be the pinned table value`,
    );
  }
});

test("cat weight-loss uses 0.8, dog weight-loss uses 1.0", () => {
  const cat = run({
    species: "cat",
    lifeStage: "weight-loss",
    weightKg: "6",
    foodKcalPer100g: "330",
    foodKcalPerCup: "",
    mealsPerDay: "2",
  });
  assert.equal(cat.result.multiplier, 0.8);
  const dog = run({
    species: "dog",
    lifeStage: "weight-loss",
    weightKg: "12",
    foodKcalPer100g: "320",
    foodKcalPerCup: "",
    mealsPerDay: "1",
  });
  assert.equal(dog.result.multiplier, 1.0);
});

function base(overrides = {}) {
  return {
    species: "dog",
    lifeStage: "adult-neutered",
    weightKg: "10",
    foodKcalPer100g: "360",
    foodKcalPerCup: "",
    mealsPerDay: "2",
    ...overrides,
  };
}

function expectError(input, code, field) {
  assert.deepEqual(run(input), { ok: false, error: { code, field, row: null } });
}

test("boundaries: dog weight 100 kg is legal (independently recalculated)", () => {
  assert.deepEqual(run(base({ weightKg: "100" })).result, {
    species: "dog",
    lifeStage: "adult-neutered",
    multiplier: 1.6,
    rerKcal: 2214,
    derKcal: 3542,
    gramsPerDay: 984,
    cupsPerDay: null,
    mealsPerDay: 2,
    perMealKcal: [1771, 1771],
    perMealGrams: [492, 492],
    perMealCups: null,
  });
});

test("boundaries: cat weight 0.5 kg kitten is legal (independently recalculated)", () => {
  assert.deepEqual(
    run(base({ species: "cat", lifeStage: "kitten", weightKg: "0.5", foodKcalPer100g: "420", mealsPerDay: "1" })).result,
    {
      species: "cat",
      lifeStage: "kitten",
      multiplier: 2.5,
      rerKcal: 42,
      derKcal: 104,
      gramsPerDay: 25,
      cupsPerDay: null,
      mealsPerDay: 1,
      perMealKcal: [104],
      perMealGrams: [25],
      perMealCups: null,
    },
  );
});

test("boundaries: just outside the weight, density, cup and meals ranges", () => {
  expectError(base({ weightKg: "0.49" }), "RANGE", "weightKg");
  expectError(base({ weightKg: "100.01" }), "RANGE", "weightKg");
  expectError(base({ species: "cat", weightKg: "20.01" }), "RANGE", "weightKg");
  expectError(base({ foodKcalPer100g: "19.99" }), "RANGE", "foodKcalPer100g");
  expectError(base({ foodKcalPer100g: "900.01" }), "RANGE", "foodKcalPer100g");
  expectError(base({ foodKcalPerCup: "49.99" }), "RANGE", "foodKcalPerCup");
  expectError(base({ foodKcalPerCup: "1500.01" }), "RANGE", "foodKcalPerCup");
  expectError(base({ mealsPerDay: "0" }), "RANGE", "mealsPerDay");
  expectError(base({ mealsPerDay: "7" }), "RANGE", "mealsPerDay");
});

test("boundaries: the range edges themselves are legal", () => {
  assert.equal(run(base({ foodKcalPer100g: "20" })).ok, true);
  assert.equal(run(base({ foodKcalPer100g: "900" })).ok, true);
  assert.equal(run(base({ foodKcalPerCup: "50" })).ok, true);
  assert.equal(run(base({ foodKcalPerCup: "1500" })).ok, true);
  assert.equal(run(base({ mealsPerDay: "1" })).ok, true);
  assert.equal(run(base({ mealsPerDay: "6" })).ok, true);
  assert.equal(run(base({ weightKg: "0.5" })).ok, true);
  assert.equal(run(base({ species: "cat", weightKg: "20" })).ok, true);
});

test("grammar: leading zeros, signs, spaces, exponents and three decimals are rejected", () => {
  expectError(base({ weightKg: "010" }), "DECIMAL_FORMAT", "weightKg");
  expectError(base({ weightKg: "+10" }), "DECIMAL_FORMAT", "weightKg");
  expectError(base({ weightKg: "-10" }), "DECIMAL_FORMAT", "weightKg");
  expectError(base({ weightKg: " 10" }), "DECIMAL_FORMAT", "weightKg");
  expectError(base({ weightKg: "1e2" }), "DECIMAL_FORMAT", "weightKg");
  expectError(base({ weightKg: "10.123" }), "DECIMAL_FORMAT", "weightKg");
  expectError(base({ weightKg: "10." }), "DECIMAL_FORMAT", "weightKg");
  expectError(base({ weightKg: ".5" }), "DECIMAL_FORMAT", "weightKg");
  expectError(base({ mealsPerDay: "2.5" }), "INTEGER_FORMAT", "mealsPerDay");
  expectError(base({ mealsPerDay: "02" }), "INTEGER_FORMAT", "mealsPerDay");
});

test("grammar: zero and two-decimal values are legal", () => {
  assert.equal(run(base({ weightKg: "0.5" })).ok, true);
  assert.equal(run(base({ weightKg: "10.25" })).ok, true);
  assert.equal(run(base({ foodKcalPer100g: "360.50" })).ok, true);
});

test("validation order: the first field in order wins", () => {
  // Both species and weight are wrong: species is checked first.
  expectError(base({ species: "bird", weightKg: "0.1" }), "ENUM", "species");
  // Both weight and density are wrong: weight is checked first.
  expectError(base({ weightKg: "0.1", foodKcalPer100g: "10" }), "RANGE", "weightKg");
  // Empty density beats a bad cup value.
  expectError(base({ foodKcalPer100g: "", foodKcalPerCup: "12.345" }), "EMPTY", "foodKcalPer100g");
  // Within one field, format beats range.
  expectError(base({ weightKg: "1000.123" }), "DECIMAL_FORMAT", "weightKg");
});

test("schema: missing field, extra field, wrong type, accessor, array and null are SCHEMA", () => {
  const missing = base();
  delete missing.mealsPerDay;
  expectError(missing, "SCHEMA", null);
  expectError(base({ treatsKcal: "50" }), "SCHEMA", null);
  expectError(base({ weightKg: 10 }), "SCHEMA", null);
  const withAccessor = base();
  Object.defineProperty(withAccessor, "weightKg", { get: () => "10", enumerable: true });
  expectError(withAccessor, "SCHEMA", null);
  expectError([], "SCHEMA", null);
  expectError(null, "SCHEMA", null);
  expectError("dog", "SCHEMA", null);
  const withSymbol = base();
  withSymbol[Symbol("x")] = "1";
  expectError(withSymbol, "SCHEMA", null);
});

test("capacity and unicode: over-limit and lone surrogate are rejected first", () => {
  expectError(base({ weightKg: "123456789" }), "INPUT_LIMIT", "weightKg");
  expectError(base({ lifeStage: "a".repeat(33) }), "INPUT_LIMIT", "lifeStage");
  expectError(base({ weightKg: "1\uD8000" }), "UNICODE", "weightKg");
  expectError(base({ weightKg: "10\uDC00" }), "UNICODE", "weightKg");
  // A paired surrogate is not UNICODE (it fails the grammar instead).
  expectError(base({ weightKg: "\uD83D\uDE00" }), "DECIMAL_FORMAT", "weightKg");
});

test("optional cup density: empty skips its checks, a bad value does not", () => {
  assert.equal(run(base({ foodKcalPerCup: "" })).ok, true);
  expectError(base({ foodKcalPerCup: "abc" }), "DECIMAL_FORMAT", "foodKcalPerCup");
  expectError(base({ foodKcalPerCup: "123456789" }), "INPUT_LIMIT", "foodKcalPerCup");
  expectError(base({ foodKcalPerCup: "\uD800" }), "UNICODE", "foodKcalPerCup");
});

test("empty and enum: every required field reports EMPTY, unknown species is ENUM", () => {
  expectError(base({ species: "" }), "EMPTY", "species");
  expectError(base({ lifeStage: "" }), "EMPTY", "lifeStage");
  expectError(base({ weightKg: "" }), "EMPTY", "weightKg");
  expectError(base({ mealsPerDay: "" }), "EMPTY", "mealsPerDay");
  expectError(base({ species: "bird" }), "ENUM", "species");
  // A stage that exists only for the other species is ENUM on lifeStage.
  expectError(base({ species: "dog", lifeStage: "kitten" }), "ENUM", "lifeStage");
});
