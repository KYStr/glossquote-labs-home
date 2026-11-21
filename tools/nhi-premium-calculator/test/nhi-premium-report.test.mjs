// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/nhi-premium.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const floorCase = fixtures.cases.find((entry) => entry.id === "floor-grade-no-dependents");
const overCapCase = fixtures.cases.find((entry) => entry.id === "dependents-over-cap");

const EXPECTED_FLOOR_REPORT =
  '{"dependentPremiumEach":458,"dependentsCapped":false,"dependentsCharged":0,' +
  '"employeeTotalPremium":458,"employerPremium":1428,"governmentPremium":238,' +
  '"grade":1,"insuredAmount":29500,"selfPremium":458}\n';
const EXPECTED_OVER_CAP_REPORT =
  '{"dependentPremiumEach":681,"dependentsCapped":true,"dependentsCharged":3,' +
  '"employeeTotalPremium":2724,"employerPremium":2124,"governmentPremium":354,' +
  '"grade":10,"insuredAmount":43900,"selfPremium":681}\n';

test("the floor-grade report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(floorCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_FLOOR_REPORT);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("the over-cap report carries the cap flag and three charged dependents", () => {
  const outcome = run(overCapCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_OVER_CAP_REPORT);
});

test("serializing the fixtures' literal result objects gives the same bytes", () => {
  assert.equal(serializeReport(floorCase.expected.result).text, EXPECTED_FLOOR_REPORT);
  assert.equal(serializeReport(overCapCase.expected.result).text, EXPECTED_OVER_CAP_REPORT);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    selfPremium: 458,
    grade: 1,
    insuredAmount: 29500,
    dependentsCapped: false,
    employeeTotalPremium: 458,
    employerPremium: 1428,
    governmentPremium: 238,
    dependentsCharged: 0,
    dependentPremiumEach: 458,
  };
  assert.equal(serializeReport(shuffled).text, EXPECTED_FLOOR_REPORT);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const huge = {
    ...floorCase.expected.result,
    padding: "x".repeat(2097152),
  };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
