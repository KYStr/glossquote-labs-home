// SPEC section 4 fixtures V1-V7, reproduced exactly.
import assert from "node:assert/strict";
import test from "node:test";
import { atbash, bruteForceTable, caesar, vigenere } from "../public/js/core/cipher.mjs";

test("V1: Caesar encrypt shift 3, and decrypt returns the input", () => {
  assert.equal(caesar("Hello, World!", 3, "encrypt"), "Khoor, Zruog!");
  assert.equal(caesar("Khoor, Zruog!", 3, "decrypt"), "Hello, World!");
});

test("V2: ROT13 is an involution", () => {
  assert.equal(caesar("Hello", 13, "encrypt"), "Uryyb");
  assert.equal(caesar("Uryyb", 13, "encrypt"), "Hello");
  assert.equal(caesar("Hello", 13, "decrypt"), "Uryyb");
});

test("V3: Atbash mirrors the alphabet, case preserved", () => {
  assert.equal(atbash("Abc XyZ"), "Zyx CbA");
});

test("V4: canonical Vigenere example, key LEMON", () => {
  assert.equal(vigenere("ATTACKATDAWN", "LEMON", "encrypt"), "LXFOPVEFRNHR");
  assert.equal(vigenere("LXFOPVEFRNHR", "LEMON", "decrypt"), "ATTACKATDAWN");
});

test("V5: Vigenere key advances only on letters", () => {
  assert.equal(vigenere("HELLO, WORLD", "KEY", "encrypt"), "RIJVS, UYVJN");
  assert.equal(vigenere("RIJVS, UYVJN", "KEY", "decrypt"), "HELLO, WORLD");
});

test("V6: digits, punctuation and CJK pass through; case preserved", () => {
  assert.equal(caesar("Attack at 6:30, 代號!", 1, "encrypt"), "Buubdl bu 6:30, 代號!");
});

test("V7: brute-force table has exactly 25 rows in shift order", () => {
  const rows = bruteForceTable("Khoor");
  assert.equal(rows.length, 25);
  assert.deepEqual(
    rows.map((row) => row.shift),
    Array.from({ length: 25 }, (_, i) => i + 1),
  );
  assert.equal(rows.find((row) => row.shift === 3).text, "Hello");
});
