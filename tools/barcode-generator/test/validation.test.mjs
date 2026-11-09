// SPEC sections 2, 3 and 7d: validation boundaries and every error class
// with its exact message parameters.
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeCode128, encodeEan13, encodeUpca } from "../public/js/core/barcode.mjs";

test("code 128: empty payload refused", () => {
  assert.deepEqual(encodeCode128(""), { ok: false, error: { code: "empty" } });
});

test("code 128: lengths 1 and 48 accepted, 49 refused", () => {
  assert.equal(encodeCode128("A").ok, true);
  assert.equal(encodeCode128("A".repeat(48)).ok, true);
  const r = encodeCode128("A".repeat(49));
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "too-long");
  assert.equal(r.error.max, 48);
  assert.equal(r.error.actual, 49);
});

test("code 128: ASCII 32 (space, value 0) and 126 (~, value 94) accepted", () => {
  const space = encodeCode128("A B");
  assert.deepEqual(space.values, [104, 33, 0, 34, 33]);
  const tilde = encodeCode128("~");
  assert.deepEqual(tilde.values, [104, 94, 95]);
});

test("code 128: ASCII 127 refused with its position named", () => {
  const r = encodeCode128("AB\u007f");
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "invalid-character");
  assert.equal(r.error.position, 3);
  assert.equal(r.error.codePoint, 127);
});

test("code 128: a control character is refused with its position named", () => {
  const r = encodeCode128("A\tB");
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "invalid-character");
  assert.equal(r.error.position, 2);
  assert.equal(r.error.codePoint, 9);
});

test("ean-13: empty refused; letters refused with position", () => {
  assert.equal(encodeEan13("").error.code, "empty");
  const r = encodeEan13("59012341234A");
  assert.equal(r.error.code, "non-digit");
  assert.equal(r.error.position, 12);
  assert.equal(r.error.char, "A");
});

test("ean-13: wrong digit counts report expected and actual", () => {
  const short = encodeEan13("59012341234"); // 11 digits
  assert.equal(short.error.code, "wrong-length");
  assert.deepEqual(short.error.expected, [12, 13]);
  assert.equal(short.error.actual, 11);
  const long = encodeEan13("59012341234567"); // 14 digits
  assert.equal(long.error.code, "wrong-length");
  assert.equal(long.error.actual, 14);
});

test("ean-13: check-digit mismatch names the expected digit", () => {
  const r = encodeEan13("5901234123458");
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "check-digit-mismatch");
  assert.equal(r.error.expected, 7);
  assert.equal(r.error.actual, 8);
});

test("upc-a: wrong digit counts report expected and actual", () => {
  const short = encodeUpca("0360002914"); // 10 digits
  assert.equal(short.error.code, "wrong-length");
  assert.deepEqual(short.error.expected, [11, 12]);
  assert.equal(short.error.actual, 10);
  const long = encodeUpca("0360002914523"); // 13 digits
  assert.equal(long.error.code, "wrong-length");
  assert.equal(long.error.actual, 13);
});

test("upc-a: letters refused; check-digit mismatch names the expected digit", () => {
  const letters = encodeUpca("0360002914X");
  assert.equal(letters.error.code, "non-digit");
  assert.equal(letters.error.position, 11);
  const mismatch = encodeUpca("036000291453");
  assert.equal(mismatch.error.code, "check-digit-mismatch");
  assert.equal(mismatch.error.expected, 2);
  assert.equal(mismatch.error.actual, 3);
});
