// Fixed-report tests for hsr-fare-calculator-report.json.
//
// The expected literals below were derived from the SPEC independently
// of this implementation: the taipei-zuoying-standard-full and
// taipei-taichung-concession-x2 result objects (the SPEC's literal
// fixtures) serialized with a separate canonicalizer (Python json,
// sorted keys, compact separators) applying the SPEC's rule — keys
// sorted recursively by UTF-16 code units, compact separators,
// exactly one trailing LF. The test fails if the implementation's
// serializer, key order, or result shape drifts in any byte. The
// one-decimal distanceKm (339.3, 159.8) is part of both literals, so
// the serializer's non-integer handling is pinned too.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/hsr-fare.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const first = fixtures.cases.find((entry) => entry.id === "taipei-zuoying-standard-full");
assert.equal(first.expected.ok, true);
const concession = fixtures.cases.find(
  (entry) => entry.id === "taipei-taichung-concession-x2",
);
assert.equal(concession.expected.ok, true);

const EXPECTED_TEXT =
  `{"baseFare":1490,"cabin":"standard","destination":"ZUY","direction":"southbound","distanceKm":339.3,"fareKind":"full","origin":"TPE","quantity":1,"singleFare":1490,"totalFare":1490}` +
  "\n";
const EXPECTED_CONCESSION_TEXT =
  `{"baseFare":700,"cabin":"standard","destination":"TAC","direction":"southbound","distanceKm":159.8,"fareKind":"concession","origin":"TPE","quantity":2,"singleFare":350,"totalFare":700}` +
  "\n";

test("taipei-zuoying-standard-full report matches the independently derived literal byte for byte", () => {
  const report = buildReport(first.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "hsr-fare-calculator-report.json");
  assert.equal(REPORT_FILENAME, "hsr-fare-calculator-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 182);
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

test("a concession result serializes with the same canonical key order", () => {
  const outcome = run(concession.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_CONCESSION_TEXT);
  assert.equal(report.byteLength, 185);
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
  Object.defineProperty(withAccessor, "origin", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    origin: "TPE",
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
