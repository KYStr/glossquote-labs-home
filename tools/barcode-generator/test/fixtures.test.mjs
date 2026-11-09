// SPEC section 4 normative fixtures, asserted exactly. Code 128 module
// strings below were hand-derived by expanding the SPEC-pinned symbol value
// sequences through the ISO width table (data file), not by running the
// encoder; EAN/UPC module strings are quoted verbatim from the SPEC.
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeCode128, encodeEan13, encodeUpca } from "../public/js/core/barcode.mjs";

const QZ10 = "0".repeat(10);

test("code 128 fixture 1: ABC", () => {
  const r = encodeCode128("ABC");
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, [104, 33, 34, 35, 1]); // Start B, data, check = 1
  assert.equal(r.symbolCount, 5);
  assert.equal(
    r.coreModules,
    "11010010000101000110001000101100010001000110110011011001100011101011",
  );
  assert.equal(r.totalModules, 88); // 68 + 2x10 quiet zones
  assert.equal(r.modules, QZ10 + r.coreModules + QZ10);
});

test("code 128 fixture 2: 123456 starts in C", () => {
  const r = encodeCode128("123456");
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, [105, 12, 34, 56, 44]); // check = 44
  assert.equal(
    r.coreModules,
    "11010011100101100111001000101100011100010110100011011101100011101011",
  );
  assert.equal(r.totalModules, 88);
});

test("code 128 fixture 3: AB123456 switches to C mid-payload", () => {
  const r = encodeCode128("AB123456");
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, [104, 33, 34, 99, 12, 34, 56, 26]); // check = 26
  assert.equal(
    r.coreModules,
    "11010010000101000110001000101100010111011110101100111001000101100011100010110111001001101100011101011",
  );
  assert.equal(r.totalModules, 121);
});

test("code 128 fixture 4: 12345AB donates its first digit to B", () => {
  const r = encodeCode128("12345AB");
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, [104, 17, 99, 23, 45, 100, 33, 34, 62]); // check = 62
  assert.equal(
    r.coreModules,
    "1101001000010011100110101110111101110110111010111011000101111011101010001100010001011000111100010101100011101011",
  );
  assert.equal(r.totalModules, 132);
});

test("ean-13 fixture: 590123412345 -> check 7 and the full 95-module string", () => {
  const r = encodeEan13("590123412345");
  assert.equal(r.ok, true);
  assert.equal(r.checkDigit, 7);
  assert.equal(r.payload, "5901234123457");
  assert.equal(
    r.coreModules,
    "10100010110100111011001100100110111101001110101010110011011011001000010101110010011101000100101",
  );
  assert.equal(r.coreModules.length, 95);
  assert.equal(r.totalModules, 113); // 95 + 11 left + 7 right quiet zones
});

test("ean-13 check-only fixture: 978020137962 -> check 4", () => {
  const r = encodeEan13("978020137962");
  assert.equal(r.ok, true);
  assert.equal(r.checkDigit, 4);
  assert.equal(r.payload, "9780201379624");
});

test("ean-13 accepts a correct 13-digit input unchanged", () => {
  const r = encodeEan13("5901234123457");
  assert.equal(r.ok, true);
  assert.equal(r.payload, "5901234123457");
  assert.equal(r.checkDigit, 7);
});

test("upc-a fixture: 03600029145 -> check 2 and the full 95-module string", () => {
  const r = encodeUpca("03600029145");
  assert.equal(r.ok, true);
  assert.equal(r.checkDigit, 2);
  assert.equal(r.payload, "036000291452");
  assert.equal(
    r.coreModules,
    "10100011010111101010111100011010001101000110101010110110011101001100110101110010011101101100101",
  );
  assert.equal(r.coreModules.length, 95);
  assert.equal(r.totalModules, 113); // 95 + 9 quiet zones each side
});

test("upc-a accepts a correct 12-digit input unchanged", () => {
  const r = encodeUpca("036000291452");
  assert.equal(r.ok, true);
  assert.equal(r.payload, "036000291452");
  assert.equal(r.checkDigit, 2);
});
