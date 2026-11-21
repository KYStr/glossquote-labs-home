// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/screen-ppi.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const fhd24 = fixtures.cases.find((entry) => entry.id === "fhd-24");
const tv85 = fixtures.cases.find((entry) => entry.id === "tv-85");

const EXPECTED_FHD24 =
  '{"aspectRatio":"16:9","diagonalIn":24,"dotPitchMm":0.277,"heightCm":29.9,"heightPx":1080,"megapixels":2.07,"ppi":91.8,"widthCm":53.1,"widthPx":1920}\n';
const EXPECTED_TV85 =
  '{"aspectRatio":"16:9","diagonalIn":85,"dotPitchMm":0.49,"heightCm":105.8,"heightPx":2160,"megapixels":8.29,"ppi":51.8,"widthCm":188.2,"widthPx":3840}\n';

test("the fhd-24 report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(fhd24.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_FHD24);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixtures' literal result objects gives the same bytes", () => {
  assert.equal(serializeReport(fhd24.expected.result).text, EXPECTED_FHD24);
  assert.equal(serializeReport(tv85.expected.result).text, EXPECTED_TV85);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    widthPx: 1920,
    ppi: 91.8,
    aspectRatio: "16:9",
    diagonalIn: 24,
    dotPitchMm: 0.277,
    heightCm: 29.9,
    heightPx: 1080,
    megapixels: 2.07,
    widthCm: 53.1,
  };
  assert.equal(serializeReport(shuffled).text, EXPECTED_FHD24);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const huge = {
    aspectRatio: "16:9",
    diagonalIn: 24,
    dotPitchMm: 0.277,
    heightCm: 29.9,
    heightPx: 1080,
    megapixels: 2.07,
    ppi: 91.8,
    widthCm: 53.1,
    widthPx: 1920,
    padding: "x".repeat(2097152),
  };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
