// SPEC section 4 fixtures P1-P7, expected values taken literally from the SPEC.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotals, solveTarget } from "../public/js/core/calc.mjs";

const row = (grade, creditsRaw, extra = {}) => ({ label: "", grade, creditsRaw: String(creditsRaw), excluded: false, ...extra });

test("P1: A(3), B+(4), C(2) on 4.0 -> 29.2 points / 9 credits / 3.24", () => {
  const t = computeTotals([row("A", 3), row("B+", 4), row("C", 2)], "4.0");
  assert.equal(t.totalPointsText, "29.2");
  assert.equal(t.totalCreditsText, "9");
  assert.equal(t.gpaText, "3.24");
});

test("P2: A+(3), A-(3) on 4.3 -> 24.0 / 6 / 4.00", () => {
  const t = computeTotals([row("A+", 3), row("A\u2212", 3)], "4.3");
  assert.equal(t.totalPointsText, "24");
  assert.equal(t.totalCreditsText, "6");
  assert.equal(t.gpaText, "4.00");
});

test("P3: A(3), F(3) on 4.0 -> 2.00 (F credits count)", () => {
  const t = computeTotals([row("A", 3), row("F", 3)], "4.0");
  assert.equal(t.totalCreditsText, "6");
  assert.equal(t.gpaText, "2.00");
});

test("P4: A+(1), B(3) on 4.3 -> exactly 3.325 -> half-up 3.33", () => {
  const t = computeTotals([row("A+", 1), row("B", 3)], "4.3");
  assert.equal(t.gpaText, "3.33");
});

test("P5 solver feasible: 60 @ 3.00, +30, target 3.20 on 4.0 -> 3.60", () => {
  const r = solveTarget({ completedCredits: "60", currentGpa: "3.00", plannedCredits: "30", targetGpa: "3.20" }, "4.0");
  assert.equal(r.status, "feasible");
  assert.equal(r.requiredText, "3.60");
});

test("P6 solver unreachable: 90 @ 2.50, +15, target 3.00 on 4.3 -> R 6.00, max 2.76", () => {
  const r = solveTarget({ completedCredits: "90", currentGpa: "2.50", plannedCredits: "15", targetGpa: "3.00" }, "4.3");
  assert.equal(r.status, "unreachable");
  assert.equal(r.requiredText, "6.00");
  assert.equal(r.maxAttainableText, "2.76");
});

test("P7 solver guaranteed: 90 @ 3.50, +15, target 2.80 -> zero-final 3.00", () => {
  const r = solveTarget({ completedCredits: "90", currentGpa: "3.50", plannedCredits: "15", targetGpa: "2.80" }, "4.0");
  assert.equal(r.status, "guaranteed");
  assert.equal(r.zeroFinalGpaText, "3.00");
});
