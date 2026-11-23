// Fixed-report tests for home-affordability-report.json.
//
// The expected literals below were derived from the SPEC
// independently of this implementation: the typical-taipei and
// debts-exceed-back-cap result objects (the SPEC's literal fixtures)
// serialized with a separate canonicalizer (Python json, sorted keys,
// compact separators) applying the SPEC's rule — keys sorted
// recursively by UTF-16 code units, compact separators, exactly one
// trailing LF. Integral 1-decimal percentages serialize as plain
// integers (28, not 28.0), because JSON numbers carry no scale. The
// test fails if the implementation's serializer, key order, or result
// shape drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/home-affordability.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const typical = fixtures.cases.find((entry) => entry.id === "typical-taipei");
assert.equal(typical.expected.ok, true);
const noRoom = fixtures.cases.find((entry) => entry.id === "debts-exceed-back-cap");
assert.equal(noRoom.expected.ok, true);

const EXPECTED_TYPICAL_TEXT =
  `{"affordable":true,"backEndLimit":36000,"backEndPctAtMax":28,"bindingCap":"front","frontEndLimit":28000,"frontEndPctAtMax":28,"maxHomePrice":9575358,"maxLoanAmount":7575358,"maxMonthlyPayment":28000,"monthlyGrossIncome":100000}` +
  "\n";

const EXPECTED_NO_ROOM_TEXT =
  `{"affordable":false,"backEndLimit":-2000,"backEndPctAtMax":40,"bindingCap":"back","frontEndLimit":14000,"frontEndPctAtMax":0,"maxHomePrice":500000,"maxLoanAmount":0,"maxMonthlyPayment":0,"monthlyGrossIncome":50000}` +
  "\n";

test("typical-taipei report matches the independently derived literal byte for byte", () => {
  const report = buildReport(typical.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "home-affordability-report.json");
  assert.equal(REPORT_FILENAME, "home-affordability-report.json");
  assert.equal(report.text, EXPECTED_TYPICAL_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TYPICAL_TEXT, "utf8"));
  assert.equal(report.byteLength, 228);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(typical.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TYPICAL_TEXT);
});

test("a no-loan-room result serializes with the same canonical key order", () => {
  const outcome = run(noRoom.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_NO_ROOM_TEXT);
  assert.equal(report.byteLength, 215);
});

test("a fractional percentage serializes as a JSON number", () => {
  // zero-rate has backEndPctAtMax 34.7: the canonical text keeps the
  // one decimal the value actually carries.
  const zeroRate = fixtures.cases.find((entry) => entry.id === "zero-rate");
  const report = buildReport(zeroRate.expected.result);
  assert.equal(report.ok, true);
  assert.ok(report.text.includes(`"backEndPctAtMax":34.7`));
  assert.ok(report.text.includes(`"frontEndPctAtMax":28`));
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
  Object.defineProperty(withAccessor, "monthlyGrossIncome", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    monthlyGrossIncome: 100000,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
