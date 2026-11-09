// Roman numeral conversion and validity (SPEC section 4).
//
// Canonical generation is the greedy table walk, and that is the only
// definition of "canonical": a Roman string is valid if and only if it
// is non-empty, uses only IVXLCDM, its loose value lies in 1..3999, and
// re-encoding that value reproduces the string exactly. No regex or
// exception list widens or narrows the rule.
//
// Input handling recorded by the maker, inside the SPEC's limits:
// - The integer field is not trimmed: only ASCII digits are accepted, at
//   most 4 characters; the length check runs before the digit check, and
//   a space is reported as a non-digit character at its position.
// - The Roman field is trimmed of surrounding ASCII whitespace and
//   uppercased with an ASCII-only mapping (a-z -> A-Z) before validation,
//   so lengths and positions never shift under Unicode casing rules.
// - Error precedence in the Roman field: empty (neutral), then
//   over-length, then the first invalid character (named, with its
//   1-based position in the normalised string), then loose-value range,
//   then the non-canonical verdict naming the loose value and the
//   canonical form.

import { GREEDY_TABLE, SYMBOL_VALUES } from "./table.mjs";

export const MAX_VALUE = 3999;
export const MAX_ROMAN_LENGTH = 15;
export const MAX_INTEGER_DIGITS = 4;

// The generator's own trace: one entry per greedy append, in order. The
// breakdown table is rendered from exactly this list, so it can never
// disagree with the generated string.
export function generateTrace(value) {
  const groups = [];
  let remaining = value;
  for (const entry of GREEDY_TABLE) {
    while (remaining >= entry.value) {
      groups.push({ symbols: entry.symbols, value: entry.value });
      remaining -= entry.value;
    }
  }
  return groups;
}

export function toRoman(value) {
  return generateTrace(value).map((group) => group.symbols).join("");
}

export function looseValue(text) {
  let total = 0;
  for (let index = 0; index < text.length; index += 1) {
    const current = SYMBOL_VALUES[text[index]];
    const next = index + 1 < text.length ? SYMBOL_VALUES[text[index + 1]] : 0;
    total += next > current ? -current : current;
  }
  return total;
}

export function isValidRoman(text) {
  if (text === "") return false;
  for (const character of text) {
    if (!(character in SYMBOL_VALUES)) return false;
  }
  const value = looseValue(text);
  return value >= 1 && value <= MAX_VALUE && toRoman(value) === text;
}

export function parseIntegerField(text) {
  if (text === "") return { kind: "empty" };
  if (text.length > MAX_INTEGER_DIGITS) return { kind: "error", code: "INT_TOO_LONG" };
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character < "0" || character > "9") {
      return { kind: "error", code: "INT_NON_DIGIT", char: character, position: index + 1 };
    }
  }
  const value = Number(text);
  if (value === 0) return { kind: "error", code: "INT_NO_ZERO" };
  if (value > MAX_VALUE) return { kind: "error", code: "INT_CEILING", value };
  return {
    kind: "value",
    value,
    leadingZeros: text.length > 1 && text[0] === "0",
    text,
  };
}

export function normaliseRoman(text) {
  const trimmed = text.replace(/^[\t\n\r ]+|[\t\n\r ]+$/g, "");
  return trimmed.replace(/[a-z]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 32));
}

export function parseRomanField(rawText) {
  const text = normaliseRoman(rawText);
  if (text === "") return { kind: "empty" };
  if (text.length > MAX_ROMAN_LENGTH) {
    return { kind: "error", code: "ROMAN_TOO_LONG", length: text.length };
  }
  for (let index = 0; index < text.length; index += 1) {
    if (!(text[index] in SYMBOL_VALUES)) {
      return { kind: "error", code: "ROMAN_BAD_CHAR", char: text[index], position: index + 1 };
    }
  }
  const loose = looseValue(text);
  if (loose < 1 || loose > MAX_VALUE) {
    return { kind: "error", code: "ROMAN_OUT_OF_RANGE", loose };
  }
  const canonical = toRoman(loose);
  if (canonical !== text) {
    return { kind: "error", code: "ROMAN_NON_CANONICAL", loose, canonical };
  }
  return { kind: "value", value: loose, text };
}
