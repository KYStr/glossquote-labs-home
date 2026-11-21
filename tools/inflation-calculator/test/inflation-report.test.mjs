// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/inflation.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const rateBasic = fixtures.cases.find((entry) => entry.id === "rate-basic");
const cpiBasic = fixtures.cases.find((entry) => entry.id === "cpi-basic");

const EXPECTED_RATE_BASIC =
  '{"cumulativePercent":21.9,"futureValue":121899.44,"purchasingPower":82034.83,"yearTable":[' +
  '{"nominalValue":100000,"purchasingPower":100000,"year":0},' +
  '{"nominalValue":102000,"purchasingPower":98039.22,"year":1},' +
  '{"nominalValue":104040,"purchasingPower":96116.88,"year":2},' +
  '{"nominalValue":106120.8,"purchasingPower":94232.23,"year":3},' +
  '{"nominalValue":108243.22,"purchasingPower":92384.54,"year":4},' +
  '{"nominalValue":110408.08,"purchasingPower":90573.08,"year":5},' +
  '{"nominalValue":112616.24,"purchasingPower":88797.14,"year":6},' +
  '{"nominalValue":114868.57,"purchasingPower":87056.02,"year":7},' +
  '{"nominalValue":117165.94,"purchasingPower":85349.04,"year":8},' +
  '{"nominalValue":119509.26,"purchasingPower":83675.53,"year":9},' +
  '{"nominalValue":121899.44,"purchasingPower":82034.83,"year":10}]}\n';
const EXPECTED_CPI_BASIC =
  '{"adjustedAmount":32760,"cumulativePercent":9.2,"equivalentAnnualRatePercent":null,"fromLabel":"2015","toLabel":"2025"}\n';

test("the rate-basic report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(rateBasic.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_RATE_BASIC);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("the cpi-basic report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(cpiBasic.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_CPI_BASIC);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixtures' literal result objects gives the same bytes", () => {
  assert.equal(serializeReport(rateBasic.expected.result).text, EXPECTED_RATE_BASIC);
  assert.equal(serializeReport(cpiBasic.expected.result).text, EXPECTED_CPI_BASIC);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    yearTable: rateBasic.expected.result.yearTable,
    purchasingPower: 82034.83,
    futureValue: 121899.44,
    cumulativePercent: 21.9,
  };
  assert.equal(serializeReport(shuffled).text, EXPECTED_RATE_BASIC);
  const shuffledCpi = {
    toLabel: "2025",
    fromLabel: "2015",
    equivalentAnnualRatePercent: null,
    cumulativePercent: 9.2,
    adjustedAmount: 32760,
  };
  assert.equal(serializeReport(shuffledCpi).text, EXPECTED_CPI_BASIC);
});

test("a null purchasing power serializes as null, never Infinity", () => {
  const outcome = run({ mode: "rate", amount: "1000", annualRatePercent: "-99.999", years: "200" });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.purchasingPower, null);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.ok(serialized.text.includes('"purchasingPower":null'));
  assert.ok(!serialized.text.includes("Infinity"));
  assert.ok(!serialized.text.includes("NaN"));
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const huge = {
    cumulativePercent: 21.9,
    futureValue: 121899.44,
    purchasingPower: 82034.83,
    yearTable: [],
    padding: "x".repeat(2097152),
  };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
