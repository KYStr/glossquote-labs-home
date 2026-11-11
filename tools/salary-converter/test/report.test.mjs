// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. The expected
// string for case 1 is the SPEC's own pinned canonical content, written
// by hand here, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/salary.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const firstCase = fixtures.cases[0];
const CASE1_TEXT =
  '{"annualBase":480000,"annualTotal":560000,"bonusAmount":80000,"daily":1333,"hourly":167,"monthly":40000}\n';

test("the first fixture's report is the SPEC's pinned canonical content", () => {
  const outcome = run(firstCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, CASE1_TEXT);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(firstCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, CASE1_TEXT);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    monthly: 40000,
    hourly: 167,
    annualTotal: 560000,
    daily: 1333,
    bonusAmount: 80000,
    annualBase: 480000,
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, CASE1_TEXT);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const serialized = serializeReport({
    monthly: "9".repeat(3000000),
    daily: 0,
    hourly: 0,
    annualBase: 0,
    bonusAmount: 0,
    annualTotal: 0,
  });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
