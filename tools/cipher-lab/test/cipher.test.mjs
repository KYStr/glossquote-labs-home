// Boundary, round-trip and refusal tests. Expected values are derived by
// hand from SPEC section 4, never from the implementation's own output.
import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_KEY_LENGTH,
  atbash,
  bruteForceTable,
  caesar,
  transform,
  validateKey,
  validateShift,
  vigenere,
} from "../public/js/core/cipher.mjs";

const MIXED = "Meet at 9:45, 代號 Blue-Fox! Bring 42 maps — OK? (yes) 𐮷野家";

function stripLetters(text) {
  return [...text].filter((ch) => !/[A-Za-z]/.test(ch)).join("");
}

test("hand-computed: Caesar shift 25 wraps the alphabet", () => {
  assert.equal(caesar("AbcZ", 25, "encrypt"), "ZabY");
  assert.equal(caesar("ZabY", 25, "decrypt"), "AbcZ");
});

test("hand-computed: Atbash of Zebra", () => {
  assert.equal(atbash("Zebra"), "Avyiz");
});

test("hand-computed: key AB on interleaved punctuation (advancement)", () => {
  // shifts [0, 1]; the comma and space must not consume key letters:
  // A+0=A, B+1=C, C+0=C, D+1=E
  assert.equal(vigenere("AB, CD", "AB", "encrypt"), "AC, CE");
  assert.equal(vigenere("AC, CE", "AB", "decrypt"), "AB, CD");
});

test("hand-computed: key advances only on letters in a spaced text", () => {
  // key KEY = shifts [10, 4, 24]; "A A A": A+10=K, A+4=E, A+24=Y
  assert.equal(vigenere("A A A", "KEY", "encrypt"), "K E Y");
});

test("hand-computed: brute-force rows for a single letter", () => {
  const rows = bruteForceTable("A");
  assert.equal(rows.find((row) => row.shift === 1).text, "Z");
  assert.equal(rows.find((row) => row.shift === 13).text, "N");
  assert.equal(rows.find((row) => row.shift === 25).text, "B");
});

test("round trip: Caesar decrypt after encrypt is identity at every shift", () => {
  for (let shift = 0; shift <= 25; shift += 1) {
    const encrypted = caesar(MIXED, shift, "encrypt");
    assert.equal(caesar(encrypted, shift, "decrypt"), MIXED, `shift ${shift}`);
  }
});

test("round trip: Vigenere with several keys", () => {
  for (const key of ["A", "KEY", "LEMON", "Z", "MixedCaseKey", "Q".repeat(64)]) {
    const encrypted = vigenere(MIXED, key, "encrypt");
    assert.equal(vigenere(encrypted, key, "decrypt"), MIXED, `key ${key.slice(0, 8)}`);
  }
});

test("Atbash and ROT13 are self-inverse on mixed text", () => {
  assert.equal(atbash(atbash(MIXED)), MIXED);
  assert.equal(caesar(caesar(MIXED, 13, "encrypt"), 13, "encrypt"), MIXED);
});

test("passthrough integrity: non-letters are positionally identical", () => {
  const outputs = [
    caesar(MIXED, 7, "encrypt"),
    atbash(MIXED),
    vigenere(MIXED, "LEMON", "encrypt"),
    bruteForceTable(MIXED)[0].text,
  ];
  for (const output of outputs) {
    assert.equal(stripLetters(output), stripLetters(MIXED));
    assert.equal([...output].length, [...MIXED].length);
  }
});

test("astral characters pass through whole, never as surrogate halves", () => {
  assert.equal(caesar("A😀Z", 1, "encrypt"), "B😀A");
  assert.equal(vigenere("😀A", "B", "encrypt"), "😀B");
});

test("shift 0 is legal and returns the input unchanged", () => {
  assert.equal(caesar(MIXED, 0, "encrypt"), MIXED);
  assert.equal(caesar(MIXED, 0, "decrypt"), MIXED);
});

test("shift bounds: -1, 26 and non-integers are refused", () => {
  for (const bad of [-1, 26, 2.5, "3", Number.NaN]) {
    assert.throws(() => validateShift(bad), (error) => error.code === "invalid_shift");
    assert.throws(() => caesar("abc", bad, "encrypt"), (error) => error.code === "invalid_shift");
  }
  assert.equal(validateShift(0), 0);
  assert.equal(validateShift(25), 25);
});

test("key validation: empty, non-letter and over-length keys are refused by name", () => {
  assert.throws(() => validateKey(""), (error) => error.code === "key_empty");
  assert.throws(() => vigenere("abc", "", "encrypt"), (error) => error.code === "key_empty");
  assert.throws(() => validateKey("K3Y"), (error) => error.code === "key_non_letter");
  assert.throws(() => validateKey("KEY KEY"), (error) => error.code === "key_non_letter");
  assert.throws(() => validateKey("clé"), (error) => error.code === "key_non_letter");
  assert.throws(
    () => validateKey("A".repeat(MAX_KEY_LENGTH + 1)),
    (error) => error.code === "key_too_long",
  );
});

test("key bounds: 1 and 64 letters accepted; lowercase keys normalise to uppercase", () => {
  assert.equal(validateKey("a"), "A");
  assert.equal(validateKey("z".repeat(64)), "Z".repeat(64));
  assert.equal(vigenere("ATTACKATDAWN", "lemon", "encrypt"), "LXFOPVEFRNHR");
  assert.equal(vigenere("AAA", "B".repeat(64), "encrypt"), "BBB");
  assert.equal(vigenere("AAA", "A", "encrypt"), "AAA");
});

test("empty input produces empty output, not an error", () => {
  assert.equal(caesar("", 3, "encrypt"), "");
  assert.equal(atbash(""), "");
  assert.equal(vigenere("", "KEY", "encrypt"), "");
  assert.ok(bruteForceTable("").every((row) => row.text === ""));
});

test("input at the 10,000 character bound transforms fully", () => {
  const big = "Ab3 ".repeat(2500);
  assert.equal([...big].length, 10000);
  const encrypted = caesar(big, 3, "encrypt");
  assert.equal([...encrypted].length, 10000);
  assert.equal(caesar(encrypted, 3, "decrypt"), big);
});

test("transform dispatch matches the individual functions and rejects unknown ciphers", () => {
  assert.equal(transform({ cipher: "caesar", shift: 3, direction: "encrypt" }, "Hello, World!"), "Khoor, Zruog!");
  assert.equal(transform({ cipher: "atbash" }, "Abc XyZ"), "Zyx CbA");
  assert.equal(transform({ cipher: "vigenere", key: "LEMON", direction: "encrypt" }, "ATTACKATDAWN"), "LXFOPVEFRNHR");
  assert.throws(() => transform({ cipher: "aes" }, "x"), (error) => error.code === "invalid_cipher");
});
