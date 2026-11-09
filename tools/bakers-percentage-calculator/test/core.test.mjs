// Core behaviour tests: parsing strictness, bounds, the exact basis
// invariant, flag rules, rounding, and the SPEC section 7b round-trip
// properties. Expectations are hand-derived from SPEC sections 3–4.

import test from "node:test";
import assert from "node:assert/strict";

import {
  computeModeA,
  computeModeB,
  computeModeC,
  formatRational,
  parsePercent,
  parseWeight,
  percentagesFromWeights,
  rationalEquals,
  roundHalfUpTenths,
  validatePercentageFormula,
  validateWeightFormula,
} from "../public/js/core/bakers.mjs";

const prow = (percentTenths, flags = {}) => ({
  name: "x",
  percentTenths: percentTenths === null ? null : BigInt(percentTenths),
  flour: Boolean(flags.flour),
  water: Boolean(flags.water),
});
const wrow = (weightTenths, flags = {}) => ({
  name: "x",
  weightTenths: weightTenths === null ? null : BigInt(weightTenths),
  flour: Boolean(flags.flour),
  water: Boolean(flags.water),
});

// --- strict parsing --------------------------------------------------------

test("percent parsing: 0, 65, 65.5, 1000, 1000.0 accepted", () => {
  assert.equal(parsePercent("0").tenths, 0n);
  assert.equal(parsePercent("65").tenths, 650n);
  assert.equal(parsePercent("65.5").tenths, 655n);
  assert.equal(parsePercent("1000").tenths, 10000n);
  assert.equal(parsePercent("1000.0").tenths, 10000n);
});

test("percent parsing: 1000.1, two decimals, comma, sign, empty refused", () => {
  for (const bad of ["1000.1", "65.55", "65,5", "-5", "+5", "", " ", "1e3", "abc", ".5"]) {
    assert.equal(parsePercent(bad).ok, false, `expected refusal: ${JSON.stringify(bad)}`);
  }
});

test("weight parsing: targets 1 and 100000 accepted; 0 and 100000.1 refused", () => {
  assert.equal(parseWeight("1").tenths, 10n);
  assert.equal(parseWeight("100000").tenths, 1000000n);
  assert.equal(parseWeight("0").ok, false);
  assert.equal(parseWeight("100000.1").ok, false);
  assert.equal(parseWeight("840.5").tenths, 8405n);
});

test("weight parsing: zero allowed only in allowZero mode (Mode C rows)", () => {
  assert.equal(parseWeight("0", { allowZero: true }).tenths, 0n);
  assert.equal(parseWeight("0.0", { allowZero: true }).tenths, 0n);
});

// --- basis invariant (exact comparison, SPEC 7c) ---------------------------

test("invariant: flour sum 99.9 freezes, 100.1 freezes, 100.0 passes", () => {
  const mk = (flourTenths) => [prow(flourTenths, { flour: true }), prow(650, { water: true })];
  assert.equal(validatePercentageFormula(mk(999)).ok, false);
  assert.equal(validatePercentageFormula(mk(1001)).ok, false);
  assert.equal(validatePercentageFormula(mk(1000)).ok, true);
});

test("invariant: no flour row at all is invalid in percentage modes", () => {
  const v = validatePercentageFormula([prow(650, { water: true })]);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.code === "basis"));
});

// --- flags (SPEC 7d) --------------------------------------------------------

test("flags: a flour+water row is refused as a flag error", () => {
  const v = validatePercentageFormula([
    prow(1000, { flour: true, water: true }),
    prow(650, { water: true }),
  ]);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.code === "flag-conflict"));
});

test("flags: water flag on a non-flour row (milk) counts toward hydration", () => {
  const rows = [prow(1000, { flour: true }), prow(200, { water: true })];
  const out = computeModeA(rows, 1200n);
  assert.equal(out.hydrationText, "20.0");
  assert.deepEqual(out.weightTexts, ["100.0", "20.0"]);
});

test("a non-flour non-water row at 0% is legal and weighs 0.0 g", () => {
  const rows = [prow(1000, { flour: true }), prow(0)];
  const out = computeModeB(rows, 5000n);
  assert.deepEqual(out.weightTexts, ["500.0", "0.0"]);
});

// --- row bounds --------------------------------------------------------------

test("rows: 30 accepted, 31 refused", () => {
  const mk = (n) => [
    prow(1000, { flour: true }),
    ...Array.from({ length: n - 1 }, () => prow(0)),
  ];
  assert.equal(validatePercentageFormula(mk(30)).ok, true);
  const v31 = validatePercentageFormula(mk(31));
  assert.equal(v31.ok, false);
  assert.ok(v31.errors.some((e) => e.code === "too-many-rows"));
});

// --- rounding (SPEC 7f): half-up at the 0.05 boundary ------------------------

test("rounding: exact 0.05 rounds up to 0.1; 0.25 -> 0.3; 0.249 -> 0.2", () => {
  assert.equal(roundHalfUpTenths(5n, 100n), 1n);
  assert.equal(roundHalfUpTenths(25n, 100n), 3n);
  assert.equal(roundHalfUpTenths(249n, 1000n), 2n);
  assert.equal(formatRational(306748n, 1000n), "306.7");
});

test("rounding: Mode B flour 1 g at 5% gives exactly 0.05 g -> displayed 0.1", () => {
  const rows = [prow(1000, { flour: true }), prow(50, { water: true })];
  const out = computeModeB(rows, 10n);
  assert.equal(out.weightTexts[1], "0.1");
});

// --- Mode C validation --------------------------------------------------------

test("mode C: zero flour weight is a field error, not NaN", () => {
  const v = validateWeightFormula([wrow(0, { flour: true }), wrow(100, { water: true })]);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.code === "flour-weight-zero"));
});

test("mode C: no flour row is an error", () => {
  const v = validateWeightFormula([wrow(100, { water: true })]);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.code === "no-flour-row"));
});

test("mode C: a row with weight 0 shows 0.0 percent", () => {
  const rows = [wrow(5000, { flour: true }), wrow(0)];
  const out = computeModeC(rows);
  assert.deepEqual(out.percentTexts, ["100.0", "0.0"]);
  assert.equal(out.totalText, "500.0");
});

// --- round-trip properties (SPEC 7b) ------------------------------------------

const FORMULAS = [
  [prow(1000, { flour: true }), prow(650, { water: true }), prow(20), prow(10)],
  [prow(800, { flour: true }), prow(200, { flour: true }), prow(700, { water: true }), prow(20)],
  [prow(1000, { flour: true }), prow(630, { water: true })],
  [prow(600, { flour: true }), prow(400, { flour: true }), prow(755, { water: true }), prow(21), prow(15)],
];

test("round-trip: Mode C on Mode A's exact weights returns the original percentages exactly", () => {
  for (const rows of FORMULAS) {
    const a = computeModeA(rows, 7777n);
    const { percentages } = percentagesFromWeights(
      a.weights,
      rows.map((r) => r.flour),
    );
    rows.forEach((row, i) => {
      const original = { n: row.percentTenths, d: 10n }; // percent value
      assert.ok(
        rationalEquals(percentages[i], original),
        `row ${i}: ${percentages[i].n}/${percentages[i].d} != ${original.n}/${original.d}`,
      );
    });
  }
});

test("agreement: Mode B's implied total, fed to Mode A, reproduces Mode B's weights", () => {
  const rows = FORMULAS[0];
  const b = computeModeB(rows, 6000n);
  assert.equal(b.totalText, "1,008.0");
  const a = computeModeA(rows, 10080n); // 1,008.0 g in tenths
  assert.deepEqual(a.weightTexts, b.weightTexts);
});
