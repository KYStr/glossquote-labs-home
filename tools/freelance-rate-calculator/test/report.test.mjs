// Fixed-report tests for freelance-rate-calculator-report.json.
//
// The expected literals below were derived from the SPEC independently
// of this implementation: the literal fixture result objects
// serialized with the SPEC's rule — keys sorted recursively by UTF-16
// code units, compact separators, exactly one trailing LF. The test
// fails if the implementation's serializer, key order, or result
// shape drifts in any byte. (The standard-rate literal was also
// cross-checked against the independent Python re-derivation of the
// same result.)

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/freelance-rate.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const standard = fixtures.cases.find((entry) => entry.id === "standard-rate");
assert.equal(standard.expected.ok, true);
const minimum = fixtures.cases.find((entry) => entry.id === "min-values");
assert.equal(minimum.expected.ok, true);
const fractional = fixtures.cases.find((entry) => entry.id === "fractional-billable-days");
assert.equal(fractional.expected.ok, true);

const EXPECTED_STANDARD_TEXT =
  `{"billableDays":154,"billableHours":1232,"dayRate":9351,"grossTarget":1440000,"hourlyRate":1169,"monthlyTarget":100000}` +
  "\n";

const EXPECTED_MINIMUM_TEXT =
  `{"billableDays":0,"billableHours":0,"dayRate":100,"grossTarget":1,"hourlyRate":200,"monthlyTarget":0}` +
  "\n";

const EXPECTED_FRACTIONAL_TEXT =
  `{"billableDays":149.5,"billableHours":1196,"dayRate":8361,"grossTarget":1250000,"hourlyRate":1045,"monthlyTarget":83333}` +
  "\n";

test("standard-rate report matches the independently derived literal byte for byte", () => {
  const report = buildReport(standard.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "freelance-rate-calculator-report.json");
  assert.equal(REPORT_FILENAME, "freelance-rate-calculator-report.json");
  assert.equal(report.text, EXPECTED_STANDARD_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_STANDARD_TEXT, "utf8"));
  assert.equal(report.byteLength, 120);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("min-values report matches the independently derived literal byte for byte", () => {
  const report = buildReport(minimum.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_MINIMUM_TEXT);
  assert.equal(report.byteLength, 102);
});

test("fractional billable days serialize the one-decimal number as 149.5", () => {
  const report = buildReport(fractional.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_FRACTIONAL_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_FRACTIONAL_TEXT, "utf8"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(standard.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_STANDARD_TEXT);
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
  Object.defineProperty(withAccessor, "grossTarget", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    grossTarget: 1440000,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
