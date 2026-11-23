// Fixed-report tests for depth-of-field-report.json.
//
// The expected literals below were derived from the SPEC independently
// of this implementation: the full-frame-50mm-f8-3m result object (the
// SPEC's literal fixture) serialized with a separate canonicalizer
// (Python json, sorted keys, compact separators) applying the SPEC's
// rule — keys sorted recursively by UTF-16 code units, compact
// separators, exactly one trailing LF — and likewise for the
// far-limit-infinity result. The test fails if the implementation's
// serializer, key order, or result shape drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/depth-of-field.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const first = fixtures.cases.find((entry) => entry.id === "full-frame-50mm-f8-3m");
assert.equal(first.expected.ok, true);
const infinity = fixtures.cases.find((entry) => entry.id === "far-limit-infinity");
assert.equal(infinity.expected.ok, true);

const EXPECTED_TEXT =
  `{"aperture":8,"cocMm":0.029,"farLimitInfinite":false,"farLimitM":4.131,"focalLengthMm":50,"focusDistanceM":3,"hyperfocalM":10.826,"nearLimitM":2.355,"sensor":"full-frame","totalDofM":1.776}` +
  "\n";

const EXPECTED_INFINITY_TEXT =
  `{"aperture":11,"cocMm":0.029,"farLimitInfinite":true,"farLimitM":null,"focalLengthMm":24,"focusDistanceM":10,"hyperfocalM":1.83,"nearLimitM":1.533,"sensor":"full-frame","totalDofM":null}` +
  "\n";

test("full-frame report matches the independently derived literal byte for byte", () => {
  const report = buildReport(first.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "depth-of-field-report.json");
  assert.equal(REPORT_FILENAME, "depth-of-field-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 190);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(first.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
});

test("an infinite far limit serializes nulls with the same canonical key order", () => {
  const report = buildReport(infinity.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_INFINITY_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_INFINITY_TEXT, "utf8"));
  assert.equal(report.byteLength, 187);
});

test("a custom-CoC result serializes with the same canonical key order", () => {
  const outcome = run({
    focalLengthMm: "85",
    aperture: "1.8",
    focusDistanceM: "5",
    sensor: "custom",
    cocMm: "0.02",
  });
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(
    report.text,
    `{"aperture":1.8,"cocMm":0.02,"farLimitInfinite":false,"farLimitM":5.126,"focalLengthMm":85,"focusDistanceM":5,"hyperfocalM":200.779,"nearLimitM":4.88,"sensor":"custom","totalDofM":0.245}\n`,
  );
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
  Object.defineProperty(withAccessor, "focalLengthMm", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    focalLengthMm: 50,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
