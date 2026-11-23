// Fixed-report tests for carbon-footprint-report.json.
//
// The expected literals below were derived from the SPEC independently
// of this implementation: the typical-household result object (the
// SPEC's literal fixture) serialized with the SPEC's rule — keys
// sorted recursively by UTF-16 code units, compact separators,
// numbers in JSON's shortest round-trip form (so a 1-decimal value
// writes as e.g. 9076.4, 102, or 0), exactly one trailing LF. The
// byte counts (301 and 259) were counted independently from the
// literal strings. The test fails if the implementation's serializer,
// key order, or result shape drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/carbon-footprint.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const typical = fixtures.cases.find((entry) => entry.id === "typical-household");
assert.equal(typical.expected.ok, true);
const allZero = fixtures.cases.find((entry) => entry.id === "all-zero");
assert.equal(allZero.expected.ok, true);

const EXPECTED_TEXT =
  `{"categories":{"bus":{"kgCo2e":102,"sharePct":1.1},"car":{"kgCo2e":2217.6,"sharePct":24.4},"diet":{"kgCo2e":4685.2,"sharePct":51.6},"electricity":{"kgCo2e":1695.6,"sharePct":18.7},"flights":{"kgCo2e":306,"sharePct":3.4},"rail":{"kgCo2e":70,"sharePct":0.8}},"totalKgCo2e":9076.4,"totalTonnesCo2e":9.1}` +
  "\n";

const EXPECTED_ALL_ZERO_TEXT =
  `{"categories":{"bus":{"kgCo2e":0,"sharePct":0},"car":{"kgCo2e":0,"sharePct":0},"diet":{"kgCo2e":0,"sharePct":0},"electricity":{"kgCo2e":0,"sharePct":0},"flights":{"kgCo2e":0,"sharePct":0},"rail":{"kgCo2e":0,"sharePct":0}},"totalKgCo2e":0,"totalTonnesCo2e":0}` +
  "\n";

test("typical-household report matches the independently derived literal byte for byte", () => {
  const report = buildReport(typical.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "carbon-footprint-report.json");
  assert.equal(REPORT_FILENAME, "carbon-footprint-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 301);
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
  assert.equal(report.text, EXPECTED_TEXT);
});

test("an all-zero result serializes with the same canonical key order", () => {
  const outcome = run(allZero.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_ALL_ZERO_TEXT);
  assert.equal(report.byteLength, 259);
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
  Object.defineProperty(withAccessor, "totalKgCo2e", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    totalKgCo2e: 9076.4,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
