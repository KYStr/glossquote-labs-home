// Fixture tests: every expected figure below is taken from, or hand-derived
// from, SPEC section 4 of docs/specs/meeting-cost-calculator/SPEC.md
// (fixtures M1, M2, M4 and the section 3 initial state) — never from the
// implementation's own output.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  burnCents,
  computeForMinutes,
  formatCentsPlain,
  presetRateCents,
  validateRoster,
} from "../public/js/core/calculator.mjs";

const M1 = [
  { headcount: 3, rateCents: 6000 },
  { headcount: 2, rateCents: 4500 },
];

test("M1: burn, cost per minute, total and breakdown for 45 minutes", () => {
  const result = computeForMinutes(M1, 45, "US$");
  assert.equal(result.burnText, "US$270.00");
  assert.equal(result.costPerMinuteText, "US$4.50");
  assert.equal(result.totalText, "US$202.50");
  assert.equal(result.rows[0].perPersonText, "US$45.00");
  assert.equal(result.rows[0].subtotalText, "US$135.00");
  assert.equal(result.rows[1].perPersonText, "US$33.75");
  assert.equal(result.rows[1].subtotalText, "US$67.50");
});

test("burn is the exact sum of headcount x rate", () => {
  assert.equal(burnCents(M1), 27000n);
  assert.equal(burnCents([{ headcount: 5, rateCents: 4000 }]), 20000n);
});

test("initial state (SPEC section 3): 5 people at 40.00 for 1 hour is $200.00", () => {
  const result = computeForMinutes([{ headcount: 5, rateCents: 4000 }], 60, "US$");
  assert.equal(result.burnText, "US$200.00");
  assert.equal(result.totalText, "US$200.00");
});

test("preset fills: all four annual figures map to the SPEC section 4 rates", () => {
  assert.equal(presetRateCents(40000), 1923); // 19.23
  assert.equal(presetRateCents(70000), 3365); // 33.65
  assert.equal(presetRateCents(110000), 5288); // 52.88
  assert.equal(presetRateCents(180000), 8654); // 86.54
  assert.equal(formatCentsPlain(presetRateCents(70000)), "33.65");
});

test("M2: preset 70,000, four people, 30 minutes", () => {
  const groups = [{ headcount: 4, rateCents: presetRateCents(70000) }];
  const result = computeForMinutes(groups, 30, "US$");
  assert.equal(result.burnText, "US$134.60");
  assert.equal(result.totalText, "US$67.30");
});

test("a filled preset rate afterwards behaves as a plain typed rate", () => {
  const roster = validateRoster([{ headcount: "4", rate: "33.65" }]);
  assert.equal(roster.ok, true);
  assert.equal(roster.groups[0].rateCents, presetRateCents(70000));
});

test("M4: one person at 100.00 for 8 hours is $800.00", () => {
  const result = computeForMinutes([{ headcount: 1, rateCents: 10000 }], 480, "US$");
  assert.equal(result.totalText, "US$800.00");
});

test("currency changes the symbol only, never the figures", () => {
  const twd = computeForMinutes(M1, 45, "NT$");
  assert.equal(twd.totalText, "NT$202.50");
  const jpy = computeForMinutes(M1, 45, "¥");
  assert.equal(jpy.totalText, "¥202.50");
});

test("breakdown rounding: independently rounded subtotals can sit one cent off the total", () => {
  // Two groups of one person at 0.01 for 30 minutes: each per-person cost
  // is exactly half a cent, which displays as 0.01, so the two displayed
  // subtotals sum to 0.02 while the exact total is exactly one cent.
  const groups = [
    { headcount: 1, rateCents: 1 },
    { headcount: 1, rateCents: 1 },
  ];
  const result = computeForMinutes(groups, 30, "US$");
  assert.equal(result.rows[0].subtotalText, "US$0.01");
  assert.equal(result.rows[1].subtotalText, "US$0.01");
  assert.equal(result.totalText, "US$0.01");
});

test("large figures group thousands with commas", () => {
  // 100 people at 100,000.00 for 24 hours: burn 10,000,000.00, total x24.
  const groups = [{ headcount: 100, rateCents: 10000000 }];
  const result = computeForMinutes(groups, 1440, "US$");
  assert.equal(result.burnText, "US$10,000,000.00");
  assert.equal(result.totalText, "US$240,000,000.00");
});
