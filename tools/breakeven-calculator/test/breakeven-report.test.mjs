// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/breakeven.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const ceilRoundsUp = fixtures.cases.find((entry) => entry.id === "ceil-rounds-up");
const withMargin = fixtures.cases.find((entry) => entry.id === "with-margin-of-safety");

const EXPECTED_CEIL =
  '{"breakevenRevenue":"197600.00","breakevenRevenueExact":"197529.60",' +
  '"breakevenUnits":494,"breakevenUnitsExact":"493.8240",' +
  '"contributionMarginPerUnit":"250.00","contributionMarginRatioPercent":"62.50",' +
  '"marginOfSafety":null}\n';
const EXPECTED_WITH_MARGIN =
  '{"breakevenRevenue":"192000.00","breakevenRevenueExact":"192000.00",' +
  '"breakevenUnits":480,"breakevenUnitsExact":"480.0000",' +
  '"contributionMarginPerUnit":"250.00","contributionMarginRatioPercent":"62.50",' +
  '"marginOfSafety":{"belowBreakeven":false,"expectedProfit":"80000.00",' +
  '"expectedUnits":800,"percent":"40.00","units":320}}\n';

test("the ceil-rounds-up report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(ceilRoundsUp.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_CEIL);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixtures' literal result objects gives the same bytes", () => {
  assert.equal(serializeReport(ceilRoundsUp.expected.result).text, EXPECTED_CEIL);
  assert.equal(serializeReport(withMargin.expected.result).text, EXPECTED_WITH_MARGIN);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    marginOfSafety: null,
    contributionMarginRatioPercent: "62.50",
    breakevenRevenue: "197600.00",
    breakevenUnitsExact: "493.8240",
    contributionMarginPerUnit: "250.00",
    breakevenUnits: 494,
    breakevenRevenueExact: "197529.60",
  };
  assert.equal(serializeReport(shuffled).text, EXPECTED_CEIL);
  const shuffledMargin = {
    marginOfSafety: {
      units: 320,
      percent: "40.00",
      expectedUnits: 800,
      expectedProfit: "80000.00",
      belowBreakeven: false,
    },
    breakevenRevenue: "192000.00",
    breakevenRevenueExact: "192000.00",
    breakevenUnits: 480,
    breakevenUnitsExact: "480.0000",
    contributionMarginPerUnit: "250.00",
    contributionMarginRatioPercent: "62.50",
  };
  assert.equal(serializeReport(shuffledMargin).text, EXPECTED_WITH_MARGIN);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const huge = {
    contributionMarginPerUnit: "250.00",
    contributionMarginRatioPercent: "62.50",
    breakevenUnitsExact: "493.8240",
    breakevenUnits: 494,
    breakevenRevenueExact: "197529.60",
    breakevenRevenue: "197600.00",
    marginOfSafety: null,
    padding: "x".repeat(2097152),
  };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
