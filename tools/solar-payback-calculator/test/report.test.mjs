// Fixed-report tests for solar-payback-calculator-report.json.
//
// The expected literals below were derived from the SPEC independently
// of this implementation: the typical-rooftop-9kw and
// never-pays-back-in-20y result objects (the SPEC's literal fixtures)
// serialized with a separate canonicalizer applying the SPEC's rule —
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
} from "../public/js/core/solar-payback.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const typical = fixtures.cases.find((entry) => entry.id === "typical-rooftop-9kw");
assert.equal(typical.expected.ok, true);
const neverPaysBack = fixtures.cases.find((entry) => entry.id === "never-pays-back-in-20y");
assert.equal(neverPaysBack.expected.ok, true);

const EXPECTED_TYPICAL_TEXT =
  `{"annualBenefitTwd":54445,"annualGenerationKwh":11250,"beyondContract":false,"exportRevenueTwd":44320,"exportedKwh":7875,"fitRateApplied":5.6279,"fitSource":"table","maxFeasibleKwp":10,"net20Twd":548894,"paybackYears":9.9,"requiredRoofAreaM2":72,"roofWarning":null,"selfUseSavingTwd":10125,"selfUsedKwh":3375,"total20BenefitTwd":1088894}` +
  "\n";

const EXPECTED_NEVER_TEXT =
  `{"annualBenefitTwd":13507,"annualGenerationKwh":2400,"beyondContract":true,"exportRevenueTwd":13507,"exportedKwh":2400,"fitRateApplied":5.6279,"fitSource":"table","maxFeasibleKwp":5,"net20Twd":-229861,"paybackYears":37,"requiredRoofAreaM2":24,"roofWarning":null,"selfUseSavingTwd":0,"selfUsedKwh":0,"total20BenefitTwd":270139}` +
  "\n";

test("typical-rooftop-9kw report matches the independently derived literal byte for byte", () => {
  const report = buildReport(typical.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "solar-payback-calculator-report.json");
  assert.equal(REPORT_FILENAME, "solar-payback-calculator-report.json");
  assert.equal(report.text, EXPECTED_TYPICAL_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TYPICAL_TEXT, "utf8"));
  assert.equal(report.byteLength, 338);
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

test("a beyond-contract result serializes with the same canonical key order", () => {
  const outcome = run(neverPaysBack.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_NEVER_TEXT);
  assert.equal(report.byteLength, 327);
});

test("a roof-warning result serializes its warning string", () => {
  const outcome = run({
    systemKwp: "10",
    roofAreaM2: "60",
    sunHours: "1250",
    installCost: "600000",
    fitRate: "5.3819",
    selfUsePct: "30",
    retailPrice: "3.00",
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.roofWarning, "ROOF_TIGHT");
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.ok(report.text.includes('"roofWarning":"ROOF_TIGHT"'));
  assert.ok(report.text.includes('"fitSource":"table"'));
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
  Object.defineProperty(withAccessor, "annualBenefitTwd", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    annualBenefitTwd: 54445,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
