// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes and SHA-256, integers serialized without a decimal point
// (17.0 becomes 17, per the SPEC), and the 2,097,152-byte OUTPUT_LIMIT.
// Expected strings were written by hand from the SPEC's rule, never
// produced by the product.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/bodyfat.mjs";

const manNormalResult = { bodyFatPct: 17, category: "fitness", fatMassKg: 12.8, leanMassKg: 62.2 };
const manNormalText = '{"bodyFatPct":17,"category":"fitness","fatMassKg":12.8,"leanMassKg":62.2}\n';

test("man-normal report is canonical compact JSON with one trailing LF", () => {
  const serialized = serializeReport(manNormalResult);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, manNormalText);
  assert.equal(serialized.bytes, new TextEncoder().encode(manNormalText).length);
  assert.equal(
    createHash("sha256").update(serialized.text, "utf8").digest("hex"),
    createHash("sha256").update(manNormalText, "utf8").digest("hex"),
  );
});

test("the report of a live run matches the hand-written bytes", () => {
  const outcome = run({
    sex: "male",
    heightCm: "175",
    neckCm: "38",
    waistCm: "85",
    hipCm: "",
    weightKg: "75",
  });
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, manNormalText);
});

test("woman-normal report keeps one-decimal values and sorted keys", () => {
  const serialized = serializeReport({
    bodyFatPct: 26.9,
    category: "average",
    fatMassKg: 15.6,
    leanMassKg: 42.4,
  });
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"bodyFatPct":26.9,"category":"average","fatMassKg":15.6,"leanMassKg":42.4}\n',
  );
});

test("key order does not depend on insertion order", () => {
  const shuffled = { leanMassKg: 62.2, fatMassKg: 12.8, category: "fitness", bodyFatPct: 17 };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, manNormalText);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const serialized = serializeReport({ pad: "x".repeat(3000000) });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
