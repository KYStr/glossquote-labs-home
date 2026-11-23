// Fixed-report tests for brick-calculator-report.json.
//
// The expected literals below were derived from the SPEC independently
// of this implementation: the standard-wall result object (the SPEC's
// literal fixture) serialized with a separate canonicalizer (Python
// json, sorted keys, compact separators) applying the SPEC's rule —
// keys sorted recursively by UTF-16 code units, compact separators,
// exactly one trailing LF. The test fails if the implementation's
// serializer, key order, or result shape drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/brick-calculator.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const standard = fixtures.cases.find((entry) => entry.id === "standard-wall");
assert.equal(standard.expected.ok, true);

const EXPECTED_TEXT =
  `{"bricksNet":596,"bricksPerM2":59.52,"bricksToBuy":625,"grossAreaM2":10,"mortarVolumeL":196.4,"mortarVolumeM3":0.196,"netAreaM2":10,"openingAreaM2":0,"wastePct":5}` +
  "\n";

test("standard-wall report matches the independently derived literal byte for byte", () => {
  const report = buildReport(standard.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "brick-calculator-report.json");
  assert.equal(REPORT_FILENAME, "brick-calculator-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 164);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(standard.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
});

test("a zero-joint result serializes with the same canonical key order", () => {
  const outcome = run({
    brickPreset: "taiwan-red",
    jointMm: "0",
    openings: [],
    wallHeightM: "2",
    wallLengthM: "3",
    wastePct: "5",
  });
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(
    report.text,
    `{"bricksNet":435,"bricksPerM2":72.46,"bricksToBuy":457,"grossAreaM2":6,"mortarVolumeL":0,"mortarVolumeM3":0,"netAreaM2":6,"openingAreaM2":0,"wastePct":5}\n`,
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
  Object.defineProperty(withAccessor, "bricksNet", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    bricksNet: 596,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
