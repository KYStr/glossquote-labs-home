// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/discount.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const firstCase = fixtures.cases[0];

test("the first fixture's report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(firstCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"effectiveOffPercent":"28.00","listTotalCents":100000,"steps":[{"kind":"list","priceCents":100000},{"kind":"discount1","offBp":2000,"priceCents":80000,"savedCents":20000},{"kind":"discount2","offBp":1000,"priceCents":72000,"savedCents":8000},{"appliedCents":0,"kind":"coupon","priceCents":72000},{"kind":"tax","priceCents":75600,"rateBp":500,"taxCents":3600}],"totalCents":75600,"totalSavedCents":28000,"unitFinalCents":75600,"zhe":"7.2"}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(firstCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"effectiveOffPercent":"28.00","listTotalCents":100000,"steps":[{"kind":"list","priceCents":100000},{"kind":"discount1","offBp":2000,"priceCents":80000,"savedCents":20000},{"kind":"discount2","offBp":1000,"priceCents":72000,"savedCents":8000},{"appliedCents":0,"kind":"coupon","priceCents":72000},{"kind":"tax","priceCents":75600,"rateBp":500,"taxCents":3600}],"totalCents":75600,"totalSavedCents":28000,"unitFinalCents":75600,"zhe":"7.2"}\n',
  );
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    zhe: "7.2",
    unitFinalCents: 75600,
    totalSavedCents: 28000,
    totalCents: 75600,
    steps: [
      { priceCents: 100000, kind: "list" },
      { savedCents: 20000, priceCents: 80000, offBp: 2000, kind: "discount1" },
      { savedCents: 8000, priceCents: 72000, offBp: 1000, kind: "discount2" },
      { priceCents: 72000, kind: "coupon", appliedCents: 0 },
      { taxCents: 3600, rateBp: 500, priceCents: 75600, kind: "tax" },
    ],
    listTotalCents: 100000,
    effectiveOffPercent: "28.00",
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"effectiveOffPercent":"28.00","listTotalCents":100000,"steps":[{"kind":"list","priceCents":100000},{"kind":"discount1","offBp":2000,"priceCents":80000,"savedCents":20000},{"kind":"discount2","offBp":1000,"priceCents":72000,"savedCents":8000},{"appliedCents":0,"kind":"coupon","priceCents":72000},{"kind":"tax","priceCents":75600,"rateBp":500,"taxCents":3600}],"totalCents":75600,"totalSavedCents":28000,"unitFinalCents":75600,"zhe":"7.2"}\n',
  );
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const steps = [];
  for (let i = 0; i < 100000; i += 1) {
    steps.push({ kind: "list", priceCents: 100000 });
  }
  const serialized = serializeReport({
    steps,
    unitFinalCents: 0,
    totalCents: 0,
    listTotalCents: 0,
    totalSavedCents: 0,
    effectiveOffPercent: "0.00",
    zhe: "10.0",
  });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
