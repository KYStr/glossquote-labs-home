// Report serialization tests: canonical compact JSON (object keys
// sorted by UTF-16 code units, recursively; array order preserved), one
// trailing LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT.
// Expected strings were written by hand from the SPEC's rule and the
// fixtures' literal results, never produced by the product.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/bac-calculator.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const firstCase = fixtures.cases[0];
const FIRST_REPORT =
  '{"bacGL":0.29,"bacPercent":0.029,"band":"below-threshold","breathMgL":0.145,"minutesToBelowAdmin":0,"minutesToZero":117,"peakBacGL":0.29,"totalAlcoholGrams":13.8}\n';

test("the first fixture's report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(firstCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, FIRST_REPORT);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(firstCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, FIRST_REPORT);
  assert.equal(
    createHash("sha256").update(serialized.text, "utf8").digest("hex"),
    createHash("sha256").update(FIRST_REPORT, "utf8").digest("hex"),
  );
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    totalAlcoholGrams: 13.8,
    peakBacGL: 0.29,
    minutesToZero: 117,
    minutesToBelowAdmin: 0,
    breathMgL: 0.145,
    band: "below-threshold",
    bacPercent: 0.029,
    bacGL: 0.29,
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, FIRST_REPORT);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  // No BAC result can legitimately reach the limit (8 scalar fields),
  // so the limit is exercised with a synthetic oversized payload that
  // still passes through the same serializer path.
  const huge = "x".repeat(2097152);
  const serialized = serializeReport({ ...firstCase.expected.result, band: huge });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
