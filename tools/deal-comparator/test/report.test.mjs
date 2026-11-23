// Fixed-report tests for deal-comparator-report.json.
//
// The expected literals below were derived from the SPEC
// independently of this implementation: the buy-n-get-m-wins and
// savings-negative-bundle results (the SPEC's literal fixtures)
// serialized with a separate canonicalizer (Python json, sorted
// keys, compact separators) applying the SPEC's rule — keys sorted
// recursively by UTF-16 code units, compact separators, exactly one
// trailing LF. The tests fail if the implementation's serializer,
// key order, or result shape drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/deal-comparator.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const first = fixtures.cases.find((entry) => entry.id === "buy-n-get-m-wins");
assert.equal(first.expected.ok, true);
const negative = fixtures.cases.find((entry) => entry.id === "savings-negative-bundle");
assert.equal(negative.expected.ok, true);

const EXPECTED_TEXT =
  `{"offers":[{"best":true,"index":0,"label":"方案 A","rank":1,"savings":"150.00","savingsPercent":"33.3","totalPaid":"300.00","totalQuantity":1500,"type":"buyNGetM","unitPrice":"20.00"},{"best":false,"index":1,"label":"方案 B","rank":2,"savings":"30.00","savingsPercent":"20.0","totalPaid":"120.00","totalQuantity":500,"type":"percentOff","unitPrice":"24.00"},{"best":false,"index":2,"label":"方案 C","rank":3,"savings":"30.00","savingsPercent":"20.0","totalPaid":"120.00","totalQuantity":500,"type":"fixedOff","unitPrice":"24.00"},{"best":false,"index":3,"label":"方案 D","rank":4,"savings":"90.00","savingsPercent":"20.0","totalPaid":"360.00","totalQuantity":1500,"type":"bundle","unitPrice":"24.00"}],"packPrice":"150.00","packSize":500,"productName":"咖啡豆","unitBasis":"g","unitLabel":"每 100 g"}` +
  "\n";

const EXPECTED_NEGATIVE_TEXT =
  `{"offers":[{"best":true,"index":1,"label":"九折","rank":1,"savings":"10.00","savingsPercent":"10.0","totalPaid":"90.00","totalQuantity":500,"type":"percentOff","unitPrice":"18.00"},{"best":false,"index":0,"label":"貴組合","rank":2,"savings":"-50.00","savingsPercent":"-25.0","totalPaid":"250.00","totalQuantity":1000,"type":"bundle","unitPrice":"25.00"}],"packPrice":"100.00","packSize":500,"productName":"洗衣粉","unitBasis":"g","unitLabel":"每 100 g"}` +
  "\n";

test("buy-n-get-m-wins report matches the independently derived literal byte for byte", () => {
  const report = buildReport(first.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "deal-comparator-report.json");
  assert.equal(REPORT_FILENAME, "deal-comparator-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 813);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(first.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
});

test("a negative-savings result serializes with the same canonical key order", () => {
  const outcome = run(negative.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_NEGATIVE_TEXT);
  assert.equal(report.byteLength, 463);
});

test("the report limit constant is the SPEC's 2 MiB", () => {
  assert.equal(REPORT_LIMIT_BYTES, 2097152);
});

test("a result over the limit is refused with OUTPUT_LIMIT", () => {
  const big = {
    productName: "x".repeat(2100000),
    unitBasis: "g",
    unitLabel: "每 100 g",
    packSize: 500,
    packPrice: "150.00",
    offers: [],
  };
  // 2,100,000 characters of product name alone exceed the 2 MiB
  // limit; the serializer must refuse rather than truncate.
  const report = buildReport(big);
  assert.equal(report.ok, false);
  assert.equal(report.error.code, "OUTPUT_LIMIT");
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
  Object.defineProperty(withAccessor, "productName", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    productName: "咖啡豆",
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
