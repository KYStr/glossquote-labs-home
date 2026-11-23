// Fixed-report tests for grocery-budget-report.json.
//
// The expected literals below were derived from the SPEC independently
// of this implementation: the reference-family and seven-person
// result objects (the SPEC's literal fixtures) serialized with a
// separate canonicalizer (Python json, sorted keys, compact
// separators) applying the SPEC's rule — keys sorted recursively by
// UTF-16 code units, compact separators, exactly one trailing LF.
// The tests fail if the implementation's serializer, key order, or
// result shape drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/grocery-budget.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const reference = fixtures.cases.find((entry) => entry.id === "reference-family-thrifty");
assert.equal(reference.expected.ok, true);
const sevenPerson = fixtures.cases.find((entry) => entry.id === "seven-person-low-cost");
assert.equal(sevenPerson.expected.ok, true);

const EXPECTED_TEXT =
  `{"breakdown":[{"count":1,"group":"c6_8","monthlySubtotal":209.3,"weeklyPerPerson":48.3,"weeklySubtotal":48.3},{"count":1,"group":"c9_11","monthlySubtotal":241.8,"weeklyPerPerson":55.8,"weeklySubtotal":55.8},{"count":1,"group":"f20_50","monthlySubtotal":254.3,"weeklyPerPerson":58.7,"weeklySubtotal":58.7},{"count":1,"group":"m20_50","monthlySubtotal":319.3,"weeklyPerPerson":73.7,"weeklySubtotal":73.7}],"dailyAverage":33.79,"householdSize":4,"monthlyTotal":1024.8,"perPersonMonthly":256.2,"perPersonWeekly":59.13,"plan":"thrifty","sizeAdjustmentWeekly":0,"sizeFactor":1,"unadjustedWeekly":236.5,"weeklyTotal":236.5}` +
  "\n";

const EXPECTED_SEVEN_TEXT =
  `{"breakdown":[{"count":1,"group":"c2_3","monthlySubtotal":173.8,"weeklyPerPerson":40.1,"weeklySubtotal":40.1},{"count":1,"group":"c6_8","monthlySubtotal":262.1,"weeklyPerPerson":60.5,"weeklySubtotal":60.5},{"count":1,"group":"c9_11","monthlySubtotal":271.2,"weeklyPerPerson":62.6,"weeklySubtotal":62.6},{"count":1,"group":"f12_13","monthlySubtotal":269.9,"weeklyPerPerson":62.3,"weeklySubtotal":62.3},{"count":1,"group":"f20_50","monthlySubtotal":276.9,"weeklyPerPerson":63.9,"weeklySubtotal":63.9},{"count":1,"group":"m14_19","monthlySubtotal":322.8,"weeklyPerPerson":74.5,"weeklySubtotal":74.5},{"count":1,"group":"m20_50","monthlySubtotal":318.5,"weeklyPerPerson":73.5,"weeklySubtotal":73.5}],"dailyAverage":56.24,"householdSize":7,"monthlyTotal":1705.9,"perPersonMonthly":243.7,"perPersonWeekly":56.24,"plan":"low-cost","sizeAdjustmentWeekly":-43.7,"sizeFactor":0.9,"unadjustedWeekly":437.4,"weeklyTotal":393.7}` +
  "\n";

test("reference-family report matches the independently derived literal byte for byte", () => {
  const report = buildReport(reference.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "grocery-budget-report.json");
  assert.equal(REPORT_FILENAME, "grocery-budget-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 617);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(reference.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
});

test("a seven-person result serializes with the same canonical key order, including the negative adjustment", () => {
  const outcome = run(sevenPerson.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_SEVEN_TEXT);
  assert.equal(report.byteLength, 916);
});

test("the report limit constant is the SPEC's 2 MiB", () => {
  assert.equal(REPORT_LIMIT_BYTES, 2097152);
});

test("non-plain report inputs are refused", () => {
  // The SPEC pins the report bytes and the OUTPUT_LIMIT failure, not
  // an error code for a non-result input; the house pattern refuses
  // every non-plain input without serializing it (and never invokes
  // an accessor or the input's toJSON).
  for (const bad of [null, [], "x", 42]) {
    assert.equal(buildReport(bad).ok, false);
  }
  const withAccessor = {};
  Object.defineProperty(withAccessor, "plan", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    plan: "thrifty",
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});

test("a non-finite number inside a result is refused, not serialized", () => {
  assert.equal(buildReport({ weeklyTotal: Number.NaN }).ok, false);
  assert.equal(buildReport({ weeklyTotal: Number.POSITIVE_INFINITY }).ok, false);
});
