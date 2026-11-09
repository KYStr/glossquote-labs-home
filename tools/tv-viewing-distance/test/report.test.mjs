// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes and SHA-256, and the 2,097,152-byte OUTPUT_LIMIT.
// Expected strings were written by hand from the SPEC's rule and the
// literal fixture results, never produced by the product code.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { serializeReport } from "../public/js/core/tv.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const forwardResult = fixtures.cases.find((entry) => entry.id === "forward-55-fhd").expected.result;
const inverseResult = fixtures.cases.find((entry) => entry.id === "inverse-300-fhd").expected.result;

test("forward report is canonical compact JSON with one trailing LF", () => {
  const serialized = serializeReport(forwardResult);
  assert.equal(serialized.ok, true);
  const expectedText =
    '{"diagonalIn":55,"distances":{"idealHigh":{"cm":279,"m":2.79},"idealLow":{"cm":210,"m":2.1},"maximum":{"cm":349,"m":3.49},"minimum":{"cm":168,"m":1.68}},"fit":null,"mode":"diagonal","resolution":"FHD","screen":{"heightCm":68.5,"widthCm":121.8}}\n';
  assert.equal(serialized.text, expectedText);
  assert.equal(serialized.bytes, new TextEncoder().encode(expectedText).length);
  assert.equal(
    createHash("sha256").update(expectedText, "utf8").digest("hex"),
    createHash("sha256").update(serialized.text, "utf8").digest("hex"),
  );
});

test("inverse report keeps the fixed key order and trailing-zero-free numbers", () => {
  const serialized = serializeReport(inverseResult);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"diagonalMaxIn":98.4,"diagonalMinIn":47.2,"diagonalRangeIn":{"high":78.7,"low":59.1},"mode":"distance","resolution":"FHD","roomDistanceCm":300}\n',
  );
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    resolution: "FHD",
    mode: "diagonal",
    fit: { roomDistanceCm: 300, status: "IDEAL" },
    screen: { widthCm: 143.9, heightCm: 80.9 },
    distances: {
      maximum: { m: 4.13, cm: 413 },
      minimum: { m: 1.98, cm: 198 },
      idealLow: { m: 2.48, cm: 248 },
      idealHigh: { m: 3.3, cm: 330 },
    },
    diagonalIn: 65,
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"diagonalIn":65,"distances":{"idealHigh":{"cm":330,"m":3.3},"idealLow":{"cm":248,"m":2.48},"maximum":{"cm":413,"m":4.13},"minimum":{"cm":198,"m":1.98}},"fit":{"roomDistanceCm":300,"status":"IDEAL"},"mode":"diagonal","resolution":"FHD","screen":{"heightCm":80.9,"widthCm":143.9}}\n',
  );
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const serialized = serializeReport({ pad: "x".repeat(3000000) });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, path: null },
  });
});
