// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/taiwan-water-bill.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const typical = fixtures.cases.find((entry) => entry.id === "bimonthly-typical");
const fullLevies = fixtures.cases.find((entry) => entry.id === "bimonthly-full-levies");

const EXPECTED_TYPICAL =
  '{"basicFeeMilliNt":71400,"businessTaxMilliNt":14900,"cycle":"bimonthly",' +
  '"diameterMm":"20","sewerFeeMilliNt":null,"sewerRateNt":null,' +
  '"tiers":[{"degrees":20,"subtotalMilliNt":147000,"tier":1,"unitPriceMilliNt":7350},' +
  '{"degrees":10,"subtotalMilliNt":94500,"tier":2,"unitPriceMilliNt":9450}],' +
  '"totalPayableMilliNt":325000,"usageChargeMilliNt":241500,"usageM3":30,' +
  '"wasteFeeMilliNt":null,"wasteRateNt":null,"waterSubtotalMilliNt":312900,"wrccMilliNt":12000}\n';
const EXPECTED_FULL_LEVIES =
  '{"basicFeeMilliNt":71400,"businessTaxMilliNt":28400,"cycle":"bimonthly",' +
  '"diameterMm":"20","sewerFeeMilliNt":300000,"sewerRateNt":"5",' +
  '"tiers":[{"degrees":20,"subtotalMilliNt":147000,"tier":1,"unitPriceMilliNt":7350},' +
  '{"degrees":40,"subtotalMilliNt":378000,"tier":2,"unitPriceMilliNt":9450}],' +
  '"totalPayableMilliNt":1143000,"usageChargeMilliNt":525000,"usageM3":60,' +
  '"wasteFeeMilliNt":222000,"wasteRateNt":"3.7","waterSubtotalMilliNt":596400,"wrccMilliNt":25000}\n';

test("the bimonthly-typical report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(typical.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_TYPICAL);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixtures' literal result objects gives the same bytes", () => {
  assert.equal(serializeReport(typical.expected.result).text, EXPECTED_TYPICAL);
  assert.equal(serializeReport(fullLevies.expected.result).text, EXPECTED_FULL_LEVIES);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    wrccMilliNt: 12000,
    totalPayableMilliNt: 325000,
    cycle: "bimonthly",
    tiers: [
      { unitPriceMilliNt: 7350, tier: 1, subtotalMilliNt: 147000, degrees: 20 },
      { unitPriceMilliNt: 9450, tier: 2, subtotalMilliNt: 94500, degrees: 10 },
    ],
    usageM3: 30,
    diameterMm: "20",
    basicFeeMilliNt: 71400,
    usageChargeMilliNt: 241500,
    waterSubtotalMilliNt: 312900,
    sewerRateNt: null,
    sewerFeeMilliNt: null,
    wasteRateNt: null,
    wasteFeeMilliNt: null,
    businessTaxMilliNt: 14900,
  };
  assert.equal(serializeReport(shuffled).text, EXPECTED_TYPICAL);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const huge = {
    cycle: "bimonthly",
    diameterMm: "20",
    usageM3: 30,
    tiers: [],
    basicFeeMilliNt: 71400,
    usageChargeMilliNt: 241500,
    waterSubtotalMilliNt: 312900,
    wrccMilliNt: 12000,
    sewerRateNt: null,
    sewerFeeMilliNt: null,
    wasteRateNt: null,
    wasteFeeMilliNt: null,
    businessTaxMilliNt: 14900,
    totalPayableMilliNt: 325000,
    padding: "x".repeat(2097152),
  };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
