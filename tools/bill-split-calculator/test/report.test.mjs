// Report serialization tests: canonical compact JSON (object keys
// sorted by UTF-16 code units, recursively; array order preserved), one
// trailing LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT.
// Expected strings were written by hand from the SPEC's rule and the
// fixtures' literal results, never produced by the product.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/bill-split.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const firstCase = fixtures.cases[0];
const FIRST_REPORT =
  '{"billCents":10000,"sharesCents":[4167,4167,4166],"taxCents":1000,"tipBaseCents":10000,"tipCents":1500,"totalCents":12500}\n';

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
    totalCents: 12500,
    tipCents: 1500,
    tipBaseCents: 10000,
    taxCents: 1000,
    sharesCents: [4167, 4167, 4166],
    billCents: 10000,
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, FIRST_REPORT);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const sharesCents = new Array(300000).fill(4000000);
  const serialized = serializeReport({
    billCents: 99999999,
    taxCents: 99999999,
    tipBaseCents: 199999998,
    tipCents: 199999998,
    totalCents: 399999996,
    sharesCents,
  });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
