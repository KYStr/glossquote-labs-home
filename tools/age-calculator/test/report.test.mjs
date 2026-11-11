// Fixed-report tests for age-report.json.
//
// The expected literal below was derived from the SPEC independently
// of this implementation: the borrow-days-months result object (the
// SPEC's literal fixture) serialized with a separate canonicalizer
// (Python json, sorted keys, compact separators) applying the SPEC's
// rule — keys sorted recursively by UTF-16 code units, compact
// separators, exactly one trailing LF. The test fails if the
// implementation's serializer, key order, or result shape drifts in
// any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/age.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const borrow = fixtures.cases.find((entry) => entry.id === "borrow-days-months");
assert.equal(borrow.expected.ok, true);

const EXPECTED_TEXT =
  `{"ageDays":25,"ageMonths":5,"ageYears":36,"birthWeekdayEn":"Tuesday","birthWeekdayIndex":2,"birthWeekdayZh":"星期二","daysUntilNextBirthday":187,"isBirthdayToday":false,"nextBirthday":"2027-05-15","totalDays":13327,"turningAge":37}` +
  "\n";

test("borrow-days-months report matches the independently derived literal byte for byte", () => {
  const report = buildReport(borrow.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "age-report.json");
  assert.equal(REPORT_FILENAME, "age-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 235);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(borrow.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
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
  Object.defineProperty(withAccessor, "ageYears", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    ageYears: 1,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
