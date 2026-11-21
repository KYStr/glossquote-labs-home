// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/photo-print-size.mjs";
import fixturesDoc from "./fixtures.json" with { type: "json" };

const fixtures = fixturesDoc.cases;
const max24mp = fixtures.find((entry) => entry.id === "max-24mp-300");
const needA4 = fixtures.find((entry) => entry.id === "need-a4-300");
const checkA4 = fixtures.find((entry) => entry.id === "check-4k-a4");

const EXPECTED_MAX_24MP =
  '{"bestFitSizeId":"A3","dpi":300,"maxHeightCm":33.9,"maxHeightIn":13.33,' +
  '"maxWidthCm":50.8,"maxWidthIn":20,"mode":"max","pixelsH":4000,"pixelsW":6000,' +
  '"sizes":[{"dpiLong":1200,"dpiShort":1333.3,"effectiveDpi":1200,"fits":true,"quality":"excellent","sizeId":"3x5"},' +
  '{"dpiLong":1000,"dpiShort":1000,"effectiveDpi":1000,"fits":true,"quality":"excellent","sizeId":"4x6"},' +
  '{"dpiLong":857.1,"dpiShort":800,"effectiveDpi":800,"fits":true,"quality":"excellent","sizeId":"5x7"},' +
  '{"dpiLong":750,"dpiShort":666.7,"effectiveDpi":666.7,"fits":true,"quality":"excellent","sizeId":"6x8"},' +
  '{"dpiLong":600,"dpiShort":500,"effectiveDpi":500,"fits":true,"quality":"excellent","sizeId":"8x10"},' +
  '{"dpiLong":500,"dpiShort":400,"effectiveDpi":400,"fits":true,"quality":"excellent","sizeId":"10x12"},' +
  '{"dpiLong":725.7,"dpiShort":686.5,"effectiveDpi":686.5,"fits":true,"quality":"excellent","sizeId":"A5"},' +
  '{"dpiLong":513.1,"dpiShort":483.8,"effectiveDpi":483.8,"fits":true,"quality":"excellent","sizeId":"A4"},' +
  '{"dpiLong":362.9,"dpiShort":342.1,"effectiveDpi":342.1,"fits":true,"quality":"excellent","sizeId":"A3"}]}\n';
const EXPECTED_NEED_A4 =
  '{"dpi":300,"megapixels":8.7,"mode":"need","requiredLongPx":3508,"requiredShortPx":2481,' +
  '"sizeId":"A4","sizeLongCm":29.7,"sizeLongIn":11.69,"sizeShortCm":21,"sizeShortIn":8.27}\n';
const EXPECTED_CHECK_A4 =
  '{"dpiLong":328.4,"dpiShort":309.6,"effectiveDpi":309.6,"mode":"check","pixelsH":2560,' +
  '"pixelsW":3840,"quality":"excellent","sizeId":"A4"}\n';

test("the max-24mp-300 report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(max24mp.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_MAX_24MP);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixtures' literal result objects gives the same bytes", () => {
  assert.equal(serializeReport(max24mp.expected.result).text, EXPECTED_MAX_24MP);
  assert.equal(serializeReport(needA4.expected.result).text, EXPECTED_NEED_A4);
  assert.equal(serializeReport(checkA4.expected.result).text, EXPECTED_CHECK_A4);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    sizeId: "A4",
    quality: "excellent",
    pixelsW: 3840,
    pixelsH: 2560,
    mode: "check",
    effectiveDpi: 309.6,
    dpiShort: 309.6,
    dpiLong: 328.4,
  };
  assert.equal(serializeReport(shuffled).text, EXPECTED_CHECK_A4);
  const shuffledNeed = {
    megapixels: 8.7,
    sizeShortIn: 8.27,
    sizeShortCm: 21,
    sizeLongIn: 11.69,
    sizeLongCm: 29.7,
    sizeId: "A4",
    requiredShortPx: 2481,
    requiredLongPx: 3508,
    mode: "need",
    dpi: 300,
  };
  assert.equal(serializeReport(shuffledNeed).text, EXPECTED_NEED_A4);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const huge = {
    mode: "check",
    pixelsW: 3840,
    pixelsH: 2560,
    sizeId: "A4",
    dpiLong: 328.4,
    dpiShort: 309.6,
    effectiveDpi: 309.6,
    quality: "excellent",
    padding: "x".repeat(2097152),
  };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
