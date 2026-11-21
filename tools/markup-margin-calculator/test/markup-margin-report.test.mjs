// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/markup-margin.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const reportBasic = fixtures.cases.find((entry) => entry.id === "report-basic");
const solveMarginHigh = fixtures.cases.find((entry) => entry.id === "solve-margin-high");
const solveMarkupTie = fixtures.cases.find((entry) => entry.id === "solve-markup-tie");

const EXPECTED_REPORT_BASIC =
  '{"belowCost":false,"costCents":8000,"marginHundredths":2000,"markupHundredths":2500,"mode":"report","priceCents":10000,"profitCents":2000}\n';
const EXPECTED_SOLVE_MARGIN_HIGH =
  '{"costCents":1000,"marginPercentMilli":99900,"markupHundredths":9990000,"mode":"solve-margin","priceCents":1000000,"profitCents":999000}\n';
const EXPECTED_SOLVE_MARKUP_TIE =
  '{"costCents":2,"marginHundredths":3333,"markupPercentMilli":25000,"mode":"solve-markup","priceCents":3,"profitCents":1}\n';

test("the report-basic report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(reportBasic.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_REPORT_BASIC);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixtures' literal result objects gives the same bytes", () => {
  assert.equal(serializeReport(reportBasic.expected.result).text, EXPECTED_REPORT_BASIC);
  assert.equal(serializeReport(solveMarginHigh.expected.result).text, EXPECTED_SOLVE_MARGIN_HIGH);
  assert.equal(serializeReport(solveMarkupTie.expected.result).text, EXPECTED_SOLVE_MARKUP_TIE);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    profitCents: 2000,
    mode: "report",
    priceCents: 10000,
    markupHundredths: 2500,
    marginHundredths: 2000,
    belowCost: false,
    costCents: 8000,
  };
  assert.equal(serializeReport(shuffled).text, EXPECTED_REPORT_BASIC);
  const shuffledHigh = {
    profitCents: 999000,
    priceCents: 1000000,
    mode: "solve-margin",
    markupHundredths: 9990000,
    marginPercentMilli: 99900,
    costCents: 1000,
  };
  assert.equal(serializeReport(shuffledHigh).text, EXPECTED_SOLVE_MARGIN_HIGH);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const huge = {
    mode: "report",
    costCents: 8000,
    priceCents: 10000,
    profitCents: 2000,
    markupHundredths: 2500,
    marginHundredths: 2000,
    belowCost: false,
    padding: "x".repeat(2097152),
  };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
