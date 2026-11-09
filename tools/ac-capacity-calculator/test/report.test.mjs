// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/ac.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const byId = Object.fromEntries(fixtures.cases.map((entry) => [entry.id, entry]));

test("the plain-ping report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(byId["plain-ping"].input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"adjustmentPct":0,"baseKcalH":5000,"modelOverRange":false,"nextModelKw":"7.1","ping":"10.00","recommendedModelKw":"6.3","requiredBtuH":19840,"requiredKcalH":5000,"requiredKw":"5.81","tonnageRuleOfThumb":"2.0"}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(byId["plain-ping"].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"adjustmentPct":0,"baseKcalH":5000,"modelOverRange":false,"nextModelKw":"7.1","ping":"10.00","recommendedModelKw":"6.3","requiredBtuH":19840,"requiredKcalH":5000,"requiredKw":"5.81","tonnageRuleOfThumb":"2.0"}\n',
  );
});

test("null recommendations serialize as JSON null (over-range fixture)", () => {
  const serialized = serializeReport(byId["all-adjustments-overrange"].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"adjustmentPct":32,"baseKcalH":7500,"modelOverRange":true,"nextModelKw":null,"ping":"15.00","recommendedModelKw":null,"requiredBtuH":39283,"requiredKcalH":9900,"requiredKw":"11.51","tonnageRuleOfThumb":"4.0"}\n',
  );
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    tonnageRuleOfThumb: "2.0",
    requiredKw: "5.81",
    requiredKcalH: 5000,
    requiredBtuH: 19840,
    recommendedModelKw: "6.3",
    ping: "10.00",
    nextModelKw: "7.1",
    modelOverRange: false,
    baseKcalH: 5000,
    adjustmentPct: 0,
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"adjustmentPct":0,"baseKcalH":5000,"modelOverRange":false,"nextModelKw":"7.1","ping":"10.00","recommendedModelKw":"6.3","requiredBtuH":19840,"requiredKcalH":5000,"requiredKw":"5.81","tonnageRuleOfThumb":"2.0"}\n',
  );
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const serialized = serializeReport({ ping: "9".repeat(3000000) });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
