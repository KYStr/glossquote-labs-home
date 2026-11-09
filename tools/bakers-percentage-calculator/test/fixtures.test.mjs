// Fixture tests: SPEC section 4 fixtures K1–K6, reproduced exactly.
// Every expected figure below is copied from the SPEC's independently
// derived fixtures, not from the implementation's output.

import test from "node:test";
import assert from "node:assert/strict";

import {
  computeModeA,
  computeModeB,
  computeModeC,
  validatePercentageFormula,
} from "../public/js/core/bakers.mjs";

const row = (percentTenths, flags = {}) => ({
  name: "x",
  percentTenths: BigInt(percentTenths),
  flour: Boolean(flags.flour),
  water: Boolean(flags.water),
});

const K1_ROWS = [
  row(1000, { flour: true }),
  row(650, { water: true }),
  row(20),
  row(10),
];

test("K1 (Mode A): 100/65/2/1 at T=840 -> 500.0/325.0/10.0/5.0, hydration 65.0", () => {
  const out = computeModeA(K1_ROWS, 8400n);
  assert.deepEqual(out.weightTexts, ["500.0", "325.0", "10.0", "5.0"]);
  assert.equal(out.totalText, "840.0");
  assert.equal(out.hydrationText, "65.0");
});

test("K2 (Mode B): same formula at W=600 -> 600.0/390.0/12.0/6.0, total 1,008.0", () => {
  const out = computeModeB(K1_ROWS, 6000n);
  assert.deepEqual(out.weightTexts, ["600.0", "390.0", "12.0", "6.0"]);
  assert.equal(out.totalText, "1,008.0");
  assert.equal(out.hydrationText, "65.0");
});

test("K3 (Mode C): weights 500/325/10 -> 100.0/65.0/2.0, total 835.0, hydration 65.0", () => {
  const rows = [
    { name: "flour", weightTenths: 5000n, flour: true, water: false },
    { name: "water", weightTenths: 3250n, flour: false, water: true },
    { name: "salt", weightTenths: 100n, flour: false, water: false },
  ];
  const out = computeModeC(rows);
  assert.deepEqual(out.percentTexts, ["100.0", "65.0", "2.0"]);
  assert.equal(out.totalText, "835.0");
  assert.equal(out.hydrationText, "65.0");
});

const K4_ROWS = [
  row(800, { flour: true }),
  row(200, { flour: true }),
  row(700, { water: true }),
];

test("K4 (two flours, Mode A): 80+20 flour, water 70, T=850 -> 400.0/100.0/350.0", () => {
  const out = computeModeA(K4_ROWS, 8500n);
  assert.deepEqual(out.weightTexts, ["400.0", "100.0", "350.0"]);
  assert.equal(out.totalText, "850.0");
  assert.equal(out.hydrationText, "70.0");
});

test("K5 (rounding): flour 100, water 63, T=500 -> 306.7 / 193.3, displayed sum 500.0", () => {
  const rows = [row(1000, { flour: true }), row(630, { water: true })];
  const out = computeModeA(rows, 5000n);
  assert.deepEqual(out.weightTexts, ["306.7", "193.3"]);
  assert.equal(out.totalText, "500.0");
});

test("K6 (invariant): K4 with the second flour deleted -> flour sum 80, outputs invalid", () => {
  const rows = [K4_ROWS[0], K4_ROWS[2]];
  const validation = validatePercentageFormula(rows);
  assert.equal(validation.ok, false);
  assert.equal(validation.flourSumTenths, 800n);
  assert.ok(validation.errors.some((e) => e.code === "basis"));
});
