// Fixed-report tests for map-scale-report.json.
//
// The expected literals below were derived from the SPEC
// independently of this implementation: the forward-25000-basic and
// inverse-25000-km result objects (the SPEC's literal fixtures)
// serialized with sorted keys, compact separators, and exactly one
// trailing LF, applying the SPEC's rule — keys sorted recursively by
// UTF-16 code units. The test fails if the implementation's
// serializer, key order, or result shape drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/map-scale.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const forward = fixtures.cases.find((entry) => entry.id === "forward-25000-basic");
const inverse = fixtures.cases.find((entry) => entry.id === "inverse-25000-km");
assert.equal(forward.expected.ok, true);
assert.equal(inverse.expected.ok, true);

const EXPECTED_FORWARD_TEXT =
  `{"mapCentimeters":"4","mode":"map-to-real","primaryUnit":"km","realKilometers":"1","realMeters":"1000","scale":25000}` +
  "\n";
const EXPECTED_INVERSE_TEXT =
  `{"mapCentimeters":"14","mode":"real-to-map","primaryUnit":"cm","realKilometers":"3.5","realMeters":"3500","scale":25000}` +
  "\n";

test("forward-25000-basic report matches the independently derived literal byte for byte", () => {
  const report = buildReport(forward.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "map-scale-report.json");
  assert.equal(REPORT_FILENAME, "map-scale-report.json");
  assert.equal(report.text, EXPECTED_FORWARD_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_FORWARD_TEXT, "utf8"));
  assert.equal(report.byteLength, 118);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("inverse-25000-km report matches the independently derived literal byte for byte", () => {
  const report = buildReport(inverse.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "map-scale-report.json");
  assert.equal(report.text, EXPECTED_INVERSE_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_INVERSE_TEXT, "utf8"));
  assert.equal(report.byteLength, 121);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(forward.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_FORWARD_TEXT);
});

test("a live reverse run produces the identical inverse report", () => {
  const outcome = run(inverse.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_INVERSE_TEXT);
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
  Object.defineProperty(withAccessor, "scale", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    scale: 25000,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
