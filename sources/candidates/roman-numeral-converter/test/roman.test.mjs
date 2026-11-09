import assert from "node:assert/strict";
import test from "node:test";

import {
  generateTrace,
  isValidRoman,
  looseValue,
  parseIntegerField,
  parseRomanField,
  toRoman,
} from "../public/js/core/roman.mjs";

const CONVERSIONS = [
  [1, "I"], [4, "IV"], [9, "IX"], [14, "XIV"], [40, "XL"], [44, "XLIV"],
  [49, "XLIX"], [58, "LVIII"], [90, "XC"], [99, "XCIX"], [400, "CD"],
  [444, "CDXLIV"], [500, "D"], [777, "DCCLXXVII"], [900, "CM"],
  [944, "CMXLIV"], [1994, "MCMXCIV"], [2026, "MMXXVI"], [2421, "MMCDXXI"],
  [3888, "MMMDCCCLXXXVIII"], [3999, "MMMCMXCIX"],
];

const INVALID = [
  ["IIII", 4, "IV"], ["IC", 99, "XCIX"], ["IL", 49, "XLIX"], ["IIV", 5, "V"],
  ["IXIX", 18, "XVIII"], ["IXL", 39, "XXXIX"], ["VX", 5, "V"], ["LC", 50, "L"],
  ["DM", 500, "D"], ["VV", 10, "X"], ["LL", 100, "C"], ["DD", 1000, "M"],
  ["CCCC", 400, "CD"], ["XXXX", 40, "XL"], ["XM", 990, "CMXC"],
];

test("SPEC section 4: all conversion fixtures in both directions", () => {
  for (const [value, roman] of CONVERSIONS) {
    assert.equal(toRoman(value), roman, `toRoman(${value})`);
    const parsed = parseRomanField(roman);
    assert.equal(parsed.kind, "value", roman);
    assert.equal(parsed.value, value, roman);
    assert.equal(isValidRoman(roman), true, roman);
  }
});

test("SPEC section 4: all sixteen invalid fixtures name loose value and canonical form", () => {
  for (const [text, loose, canonical] of INVALID) {
    const parsed = parseRomanField(text);
    assert.equal(parsed.kind, "error", text);
    assert.equal(parsed.code, "ROMAN_NON_CANONICAL", text);
    assert.equal(parsed.loose, loose, text);
    assert.equal(parsed.canonical, canonical, text);
    assert.equal(isValidRoman(text), false, text);
  }
  const mmmm = parseRomanField("MMMM");
  assert.equal(mmmm.code, "ROMAN_OUT_OF_RANGE");
  assert.equal(mmmm.loose, 4000);
});

test("exhaustive property: every integer 1-3999 round-trips and stays within 15 chars", () => {
  for (let value = 1; value <= 3999; value += 1) {
    const roman = toRoman(value);
    assert.ok(roman.length <= 15, `${value} -> ${roman}`);
    assert.equal(looseValue(roman), value, `${value} -> ${roman}`);
    assert.equal(isValidRoman(roman), true, `${value} -> ${roman}`);
    const trace = generateTrace(value);
    assert.equal(trace.reduce((sum, group) => sum + group.value, 0), value);
    assert.equal(trace.map((group) => group.symbols).join(""), roman);
  }
});

test("normalisation: case and surrounding whitespace, interior space position", () => {
  assert.equal(parseRomanField("mcmxciv").value, 1994);
  assert.equal(parseRomanField("  MCMXCIV  ").value, 1994);
  const interior = parseRomanField("MC MX");
  assert.equal(interior.code, "ROMAN_BAD_CHAR");
  assert.equal(interior.char, " ");
  assert.equal(interior.position, 3);
  const badChar = parseRomanField("MXA");
  assert.equal(badChar.code, "ROMAN_BAD_CHAR");
  assert.equal(badChar.char, "A");
  assert.equal(badChar.position, 3);
  const markup = parseRomanField("<M>");
  assert.equal(markup.code, "ROMAN_BAD_CHAR");
  assert.equal(markup.char, "<");
  assert.equal(markup.position, 1);
});

test("length boundaries: 15 accepted (3888), 16 refused as over-length", () => {
  assert.equal(parseRomanField("MMMDCCCLXXXVIII").kind, "value");
  const tooLong = parseRomanField("MMMDCCCLXXXVIIII");
  assert.equal(tooLong.code, "ROMAN_TOO_LONG");
  assert.equal(tooLong.length, 16);
});

test("integer grammar: leading zeros, zero, ceiling, non-digit, length", () => {
  const seven = parseIntegerField("007");
  assert.equal(seven.kind, "value");
  assert.equal(seven.value, 7);
  assert.equal(seven.leadingZeros, true);
  assert.equal(toRoman(seven.value), "VII");
  assert.equal(parseIntegerField("0").code, "INT_NO_ZERO");
  assert.equal(parseIntegerField("0000").code, "INT_NO_ZERO");
  assert.equal(parseIntegerField("4000").code, "INT_CEILING");
  assert.equal(parseIntegerField("3999").kind, "value");
  const nonDigit = parseIntegerField("12a");
  assert.equal(nonDigit.code, "INT_NON_DIGIT");
  assert.equal(nonDigit.char, "a");
  assert.equal(nonDigit.position, 3);
  assert.equal(parseIntegerField("12345").code, "INT_TOO_LONG");
  assert.equal(parseIntegerField("").kind, "empty");
  assert.equal(parseIntegerField(" 7").code, "INT_NON_DIGIT");
});

test("breakdowns come from the generator trace", () => {
  assert.deepEqual(generateTrace(1994), [
    { symbols: "M", value: 1000 },
    { symbols: "CM", value: 900 },
    { symbols: "XC", value: 90 },
    { symbols: "IV", value: 4 },
  ]);
  const trace3888 = generateTrace(3888);
  assert.equal(trace3888.length, 15);
  assert.equal(trace3888.reduce((sum, group) => sum + group.value, 0), 3888);
});
