// SPEC sections 4 and 7b: the deterministic Code 128 auto-switch rule.
// Expected value traces and checksums are hand-derived from the SPEC rule
// (checksum = (start + sum i*value_i) mod 103), not from encoder output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeCode128 } from "../public/js/core/barcode.mjs";

test("run of exactly 3 digits stays in B", () => {
  const r = encodeCode128("AB123");
  assert.deepEqual(r.values, [104, 33, 34, 17, 18, 19, 11]);
});

test("run of 4 in the middle switches to C and back", () => {
  const r = encodeCode128("AB1234CD");
  assert.deepEqual(r.values, [104, 33, 34, 99, 12, 34, 100, 35, 36, 102]);
});

test("run of 4 at the end switches to C with no trailing switch back", () => {
  const r = encodeCode128("AB1234");
  assert.deepEqual(r.values, [104, 33, 34, 99, 12, 34, 102]);
});

test("run of 5 in the middle donates its first digit to B", () => {
  const r = encodeCode128("AB12345");
  assert.deepEqual(r.values, [104, 33, 34, 17, 99, 23, 45, 7]);
});

test("run of 4 at the start begins in C, then switches to B for letters", () => {
  const r = encodeCode128("1234AB");
  assert.deepEqual(r.values, [105, 12, 34, 100, 33, 34, 66]);
});

test("digit-only payload with odd length 7 starts in B, one digit, then C", () => {
  const r = encodeCode128("1234567");
  assert.deepEqual(r.values, [104, 17, 99, 23, 45, 67, 79]);
});

test("a short run after a C section switches back to B", () => {
  // 123456 in C, then run "78" (length 2 <= 3) must be encoded in B.
  const r = encodeCode128("123456AB78");
  assert.deepEqual(r.values.slice(0, 5), [105, 12, 34, 56, 100]);
  assert.deepEqual(r.values.slice(5, 9), [33, 34, 23, 24]); // A, B, '7' -> 55-32 = 23, '8' -> 56-32 = 24
});

test("sample payload SKU-1024: run of 4 digits at the end uses C", () => {
  const r = encodeCode128("SKU-1024");
  assert.equal(r.ok, true);
  // S=51, K=43, U=53, '-'=13, then switch 99, pairs 10, 24.
  assert.deepEqual(r.values.slice(0, 8), [104, 51, 43, 53, 13, 99, 10, 24]);
});
