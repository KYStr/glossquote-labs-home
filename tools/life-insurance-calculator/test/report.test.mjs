// Fixed-report tests for life-insurance-calculator-report.json.
//
// The expected literals below were derived from the SPEC
// independently of this implementation: the typical-family result
// object (the SPEC's literal fixture) serialized with a separate
// canonicalizer (Python json, sorted keys, compact separators)
// applying the SPEC's rule — keys sorted recursively by UTF-16 code
// units, compact separators, exactly one trailing LF. The test fails
// if the implementation's serializer, key order, or result shape
// drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/life-insurance.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const typical = fixtures.cases.find((entry) => entry.id === "typical-family");
assert.equal(typical.expected.ok, true);

const EXPECTED_TEXT =
  `{"breakdown":{"educationTotal":1000000,"finalExpenses":350000,"incomeReplacement":12000000,"mortgageBalance":3000000,"otherDebts":200000},"differenceVsBenchmark":3050000,"multipleBenchmark":12000000,"needsTotal":16550000,"offsets":{"existingCoverage":1000000,"liquidAssets":500000,"totalOffsets":1500000},"recommendedCoverage":15050000,"status":"shortfall"}` +
  "\n";

test("typical-family report matches the independently derived literal byte for byte", () => {
  const report = buildReport(typical.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "life-insurance-calculator-report.json");
  assert.equal(REPORT_FILENAME, "life-insurance-calculator-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 358);
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

test("an all-zero covered result serializes with the same canonical key order", () => {
  const outcome = run({
    annualIncome: "0",
    supportYears: "0",
    dependents: "0",
    educationPerChild: "0",
    mortgageBalance: "0",
    otherDebts: "0",
    finalExpenses: "0",
    existingCoverage: "0",
    liquidAssets: "0",
  });
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(
    report.text,
    `{"breakdown":{"educationTotal":0,"finalExpenses":0,"incomeReplacement":0,"mortgageBalance":0,"otherDebts":0},"differenceVsBenchmark":0,"multipleBenchmark":0,"needsTotal":0,"offsets":{"existingCoverage":0,"liquidAssets":0,"totalOffsets":0},"recommendedCoverage":0,"status":"covered"}\n`,
  );
  assert.equal(report.byteLength, 283);
});

test("a negative differenceVsBenchmark serializes as a plain negative integer", () => {
  const outcome = run({
    annualIncome: "600000",
    supportYears: "5",
    dependents: "0",
    educationPerChild: "0",
    mortgageBalance: "0",
    otherDebts: "100000",
    finalExpenses: "350000",
    existingCoverage: "0",
    liquidAssets: "0",
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.differenceVsBenchmark, -2550000);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.ok(report.text.includes('"differenceVsBenchmark":-2550000'));
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
  Object.defineProperty(withAccessor, "recommendedCoverage", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    recommendedCoverage: 15050000,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
