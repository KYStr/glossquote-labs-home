// Pattern-table integrity (SPEC section 7c). The Code 128 width table is a
// transcription of ISO/IEC 15417; these checks pin its shape, its anchor
// values (whose module strings are fixed by the standard) and a recorded
// checksum, so a transcription slip fails loudly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { CODE128_WIDTHS, code128SymbolModules } from "../public/js/core/code128-patterns.mjs";
import { EAN_L_PATTERNS, EAN_FIRST_DIGIT_PARITY, eanGPattern, eanRPattern } from "../public/js/core/ean-patterns.mjs";

test("code 128 table has exactly 107 entries", () => {
  assert.equal(CODE128_WIDTHS.length, 107);
});

test("every pattern sums to 11 modules, stop to 13, with 6/7 elements", () => {
  CODE128_WIDTHS.forEach((widths, value) => {
    const sum = [...widths].reduce((acc, c) => acc + Number(c), 0);
    if (value === 106) {
      assert.equal(widths.length, 7, `value ${value}`);
      assert.equal(sum, 13, `value ${value}`);
    } else {
      assert.equal(widths.length, 6, `value ${value}`);
      assert.equal(sum, 11, `value ${value}`);
    }
    assert.ok([...widths].every((c) => c >= "1" && c <= "4"), `value ${value} width range`);
    assert.equal(code128SymbolModules(value).length, value === 106 ? 13 : 11);
    // Bar-first convention: every symbol starts with a bar; non-stop symbols
    // end with a space (even element count), stop ends with a bar.
    assert.ok(code128SymbolModules(value).startsWith("1"), `value ${value} starts with bar`);
  });
  assert.equal(new Set(CODE128_WIDTHS).size, 107, "patterns are unique");
});

test("anchor values match the standard module strings", () => {
  assert.equal(code128SymbolModules(0), "11011001100");
  assert.equal(code128SymbolModules(99), "10111011110"); // switch to C
  assert.equal(code128SymbolModules(100), "10111101110"); // switch to B
  assert.equal(code128SymbolModules(103), "11010000100"); // Start A
  assert.equal(code128SymbolModules(104), "11010010000"); // Start B
  assert.equal(code128SymbolModules(105), "11010011100"); // Start C
  assert.equal(code128SymbolModules(106), "1100011101011"); // Stop
});

test("recorded table checksum (SHA-256 of the joined width strings)", () => {
  const digest = createHash("sha256").update(CODE128_WIDTHS.join("")).digest("hex");
  assert.equal(digest, "2a01e6cafda82cf1361cdb17699c914deca757fa07519d621075d461c9e80c5f");
});

test("ean L patterns and parity table match SPEC section 4", () => {
  assert.deepEqual([...EAN_L_PATTERNS], [
    "0001101", "0011001", "0010011", "0111101", "0100011",
    "0110001", "0101111", "0111011", "0110111", "0001011",
  ]);
  assert.deepEqual([...EAN_FIRST_DIGIT_PARITY], [
    "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
    "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL",
  ]);
  // R = complement of L; G = reverse of R (SPEC definitions).
  assert.equal(eanRPattern(0), "1110010");
  assert.equal(eanGPattern(0), "0100111");
  assert.equal(eanGPattern(9), "0010111"); // R(9)=1101000 reversed by rule: complement of 0001011 = 1110100, reversed 0010111
});
