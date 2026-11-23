// Fixed-report tests for barbell-plate-calculator-report.json.
//
// The expected literals below were derived from the SPEC
// independently of this implementation: the exact-100kg and
// exact-87p5kg result objects (the SPEC's literal fixtures)
// serialized with a separate canonicalizer (Python json, sorted keys,
// compact separators) applying the SPEC's rule — keys sorted
// recursively by UTF-16 code units, compact separators, exactly one
// trailing LF. The test fails if the implementation's serializer, key
// order, or result shape drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/barbell-plate-calculator.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const exact100 = fixtures.cases.find((entry) => entry.id === "exact-100kg");
assert.equal(exact100.expected.ok, true);
const exact87p5 = fixtures.cases.find((entry) => entry.id === "exact-87p5kg");
assert.equal(exact87p5.expected.ok, true);

const EXPECTED_TEXT_100 =
  `{"achievedKg":100,"barKg":20,"loadedPerSideKg":40,"nextUpKg":null,"perSideKg":40,"platesPerSide":[{"count":1,"plateKg":25},{"count":1,"plateKg":15}],"platesPerSideCount":2,"reachable":true,"remainderPerSideKg":0,"targetKg":100}` +
  "\n";

const EXPECTED_TEXT_87P5 =
  `{"achievedKg":87.5,"barKg":20,"loadedPerSideKg":33.75,"nextUpKg":null,"perSideKg":33.75,"platesPerSide":[{"count":1,"plateKg":25},{"count":1,"plateKg":5},{"count":1,"plateKg":2.5},{"count":1,"plateKg":1.25}],"platesPerSideCount":4,"reachable":true,"remainderPerSideKg":0,"targetKg":87.5}` +
  "\n";

test("exact-100kg report matches the independently derived literal byte for byte", () => {
  const report = buildReport(exact100.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "barbell-plate-calculator-report.json");
  assert.equal(REPORT_FILENAME, "barbell-plate-calculator-report.json");
  assert.equal(report.text, EXPECTED_TEXT_100);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT_100, "utf8"));
  assert.equal(report.byteLength, 228);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(exact100.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT_100);
});

test("an 87.5 kg result with fractional plates serializes with the same canonical key order", () => {
  const outcome = run(exact87p5.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT_87P5);
  assert.equal(report.byteLength, 288);
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
  Object.defineProperty(withAccessor, "targetKg", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    targetKg: 100,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
