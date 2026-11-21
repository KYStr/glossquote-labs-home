// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), two-decimal
// fields written with exactly two decimals, integer fields as integers,
// one trailing LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT.
// Expected strings were written by hand from the SPEC's rule and the
// fixtures' literal results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/stock-profit.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const roundLot = fixtures.cases.find((entry) => entry.id === "round-lot-profit");
const prorata = fixtures.cases.find((entry) => entry.id === "prorata-basis");
const oddLot = fixtures.cases.find((entry) => entry.id === "odd-lot-loss-min-fee");

const EXPECTED_ROUND_LOT =
  '{"breakevenPrice":100.59,"buyFee":143,"buyGross":100000.00,"buyShares":1000,' +
  '"buyTotal":100143.00,"costBasisSold":100143.00,"effectiveTaxRatePct":0.3,' +
  '"netProfitLoss":9370,"remainingShares":0,"returnPct":9.36,"sellFee":157,' +
  '"sellGross":110000.00,"sellNet":109513.00,"sellShares":1000,"sellTax":330}\n';
const EXPECTED_PRORATA =
  '{"breakevenPrice":33.55,"buyFee":14,"buyGross":10005.00,"buyShares":300,' +
  '"buyTotal":10019.00,"costBasisSold":3339.67,"effectiveTaxRatePct":0.3,' +
  '"netProfitLoss":642,"remainingShares":200,"returnPct":19.23,"sellFee":6,' +
  '"sellGross":4000.00,"sellNet":3982.00,"sellShares":100,"sellTax":12}\n';
const EXPECTED_ODD_LOT =
  '{"breakevenPrice":585.80,"buyFee":20,"buyGross":5800.00,"buyShares":10,' +
  '"buyTotal":5820.00,"costBasisSold":5820.00,"effectiveTaxRatePct":0.3,' +
  '"netProfitLoss":-357,"remainingShares":0,"returnPct":-6.13,"sellFee":20,' +
  '"sellGross":5500.00,"sellNet":5463.00,"sellShares":10,"sellTax":17}\n';

test("the round-lot-profit report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(roundLot.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_ROUND_LOT);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixtures' literal result objects gives the same bytes", () => {
  assert.equal(serializeReport(roundLot.expected.result).text, EXPECTED_ROUND_LOT);
  assert.equal(serializeReport(prorata.expected.result).text, EXPECTED_PRORATA);
  assert.equal(serializeReport(oddLot.expected.result).text, EXPECTED_ODD_LOT);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    sellTax: 330,
    returnPct: 9.36,
    buyGross: 100000,
    breakevenPrice: 100.59,
    sellShares: 1000,
    netProfitLoss: 9370,
    sellNet: 109513,
    buyFee: 143,
    costBasisSold: 100143,
    sellGross: 110000,
    buyTotal: 100143,
    buyShares: 1000,
    remainingShares: 0,
    effectiveTaxRatePct: 0.3,
    sellFee: 157,
  };
  assert.equal(serializeReport(shuffled).text, EXPECTED_ROUND_LOT);
});

test("two-decimal fields keep trailing zeros and integers stay integers", () => {
  const serialized = serializeReport(oddLot.expected.result);
  assert.ok(serialized.text.includes('"breakevenPrice":585.80'));
  assert.ok(serialized.text.includes('"buyGross":5800.00'));
  assert.ok(serialized.text.includes('"returnPct":-6.13'));
  assert.ok(serialized.text.includes('"buyFee":20'));
  assert.ok(!serialized.text.includes('"buyFee":20.00'));
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const huge = {
    ...roundLot.expected.result,
    padding: "x".repeat(2097152),
  };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
