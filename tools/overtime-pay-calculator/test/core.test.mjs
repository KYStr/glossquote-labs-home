// Core tests: every literal core fixture from the SPEC's fixtures.json,
// vendored verbatim at test/fixtures.json (spec candidate commit
// eb7950f87f826a1758d430e7ba7c822d44dc64f8, spec
// spec-overtime-pay-calculator-20261109). Expected values come from the
// fixture file only; they are never derived from the implementation.
// Plus boundary and validation-order cases the SPEC calls out.

import assert from "node:assert/strict";
import test from "node:test";
import { run } from "../public/js/core/overtime.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(coreCases.length, 13, "fixture file must carry 13 core cases");

for (const entry of coreCases) {
  test(`fixture ${entry.id}`, () => {
    assert.deepEqual(run(entry.input), entry.expected);
  });
}

test("total is always the sum of the three rounded subtotals", () => {
  for (const entry of coreCases) {
    const outcome = run(entry.input);
    if (!outcome.ok) continue;
    const { weekday, restDay, holiday, totalPayTwd } = outcome.result;
    assert.equal(totalPayTwd, weekday.payTwd + restDay.payTwd + holiday.payTwd, entry.id);
    for (const pay of [weekday.payTwd, restDay.payTwd, holiday.payTwd, totalPayTwd]) {
      assert.ok(Number.isInteger(pay) && pay >= 0, entry.id);
    }
  }
});

test("salary lower bound 1 is valid; 0 is RANGE (fixture salary-zero covers 0)", () => {
  const outcome = run({ monthlySalary: "1", weekdayOtHours: "0", restDayHours: "0", holidayHours: "0" });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.hourlyRateTwd, "0.00");
  assert.equal(outcome.result.dailyWageTwd, "0.03");
  assert.equal(outcome.result.totalPayTwd, 0);
});

test('"2.25" is DECIMAL_FORMAT while "2.3" is HOURS_STEP', () => {
  const base = { monthlySalary: "36000", weekdayOtHours: "0", restDayHours: "0", holidayHours: "0" };
  assert.deepEqual(run({ ...base, restDayHours: "2.25" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "restDayHours", row: null },
  });
  assert.deepEqual(run({ ...base, restDayHours: "2.3" }), {
    ok: false,
    error: { code: "HOURS_STEP", field: "restDayHours", row: null },
  });
});

test("upper bounds: rest-day and holiday 12 are valid, 12.5 is RANGE", () => {
  const base = { monthlySalary: "36000", weekdayOtHours: "0", restDayHours: "0", holidayHours: "0" };
  const atMax = run({ ...base, restDayHours: "12", holidayHours: "12" });
  assert.equal(atMax.ok, true);
  assert.equal(atMax.result.countedOtHours, 16);
  assert.deepEqual(run({ ...base, restDayHours: "12.5" }), {
    ok: false,
    error: { code: "RANGE", field: "restDayHours", row: null },
  });
  const rawTooLong = run({ ...base, restDayHours: "12.55" });
  assert.deepEqual(rawTooLong, {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "restDayHours", row: null },
  });
});

test("first error wins in the fixed field order", () => {
  const outcome = run({
    monthlySalary: "36,000",
    weekdayOtHours: "9",
    restDayHours: "2.3",
    holidayHours: "0",
  });
  assert.deepEqual(outcome, {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "monthlySalary", row: null },
  });
  const second = run({
    monthlySalary: "36000",
    weekdayOtHours: "9",
    restDayHours: "2.3",
    holidayHours: "0",
  });
  assert.deepEqual(second, {
    ok: false,
    error: { code: "RANGE", field: "weekdayOtHours", row: null },
  });
});

test("schema failures: missing, extra, wrongly typed, and non-object inputs", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run("36000"), schema);
  assert.deepEqual(run({ monthlySalary: "36000" }), schema);
  assert.deepEqual(
    run({ monthlySalary: "36000", weekdayOtHours: "0", restDayHours: "0", holidayHours: "0", extra: "1" }),
    schema,
  );
  assert.deepEqual(
    run({ monthlySalary: 36000, weekdayOtHours: "0", restDayHours: "0", holidayHours: "0" }),
    schema,
  );
});

test("hostile strings fail grammar checks, never execute", () => {
  const base = { monthlySalary: "36000", weekdayOtHours: "0", restDayHours: "0", holidayHours: "0" };
  assert.deepEqual(run({ ...base, monthlySalary: "<script>" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "monthlySalary", row: null },
  });
  assert.deepEqual(run({ ...base, monthlySalary: "１２３" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "monthlySalary", row: null },
  });
  assert.deepEqual(run({ ...base, weekdayOtHours: "\uD800" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "weekdayOtHours", row: null },
  });
  assert.deepEqual(run({ ...base, weekdayOtHours: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "weekdayOtHours", row: null },
  });
});

test("cap note boundary inside the reachable range stays false at the maximum counted hours", () => {
  // With the SPEC's pinned field caps the counted hours max out at
  // 4 + 12 + 4 = 20, so countedOtHours can never reach the 46-hour note
  // threshold through valid input; the rule itself (counted > 46) is
  // implemented as pinned. See VERIFICATION.md, spec-errata candidate 1.
  const outcome = run({
    monthlySalary: "36000",
    weekdayOtHours: "4",
    restDayHours: "12",
    holidayHours: "12",
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.countedOtHours, 20);
  assert.equal(outcome.result.capNote, false);
});

test("holiday under 8 hours still earns the full extra day wage", () => {
  const outcome = run({
    monthlySalary: "36000",
    weekdayOtHours: "0",
    restDayHours: "0",
    holidayHours: "0.5",
  });
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.result.holiday, {
    hours: 0.5,
    dayPayApplied: true,
    extraHours: 0,
    bands: [],
    payTwd: 1200,
  });
  assert.equal(outcome.result.countedOtHours, 0);
});
