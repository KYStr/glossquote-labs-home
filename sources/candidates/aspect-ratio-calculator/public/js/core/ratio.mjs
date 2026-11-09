// Exact aspect-ratio arithmetic (SPEC section 4).
//
// Every value is an exact BigInt fraction { num, den } with den > 0 and the
// fraction reduced. Floating point is never used for a simplification, an
// equality test, a preset comparison or a solved dimension. Rounding is
// display-only, half away from zero, at the places stated in the SPEC.
//
// Input-parser lexical choices (recorded by the maker, inside the SPEC's
// stated value/precision limits):
// - Surrounding ASCII whitespace (space, tab, CR, LF) is trimmed.
// - Grammar: an optional sign, at least one digit, then optionally one "."
//   plus at least one digit. So ".5" and "1." are refused as not-a-number.
// - Decimal places are counted from the typed fraction digits, so "1.0000"
//   has 4 places and is refused where the limit is 3, even though its value
//   is 1. "2.390" has 3 places and equals 2.39.
// - Error precedence: empty, then not-a-number, then too-many-decimals,
//   then zero-or-negative, then above-the-cap.
// - Mode B's given dimension accepts any value > 0 and <= 100,000 with at
//   most 2 decimal places (the SPEC's integer form is the 0-place case).

import { PRESETS } from "./presets.mjs";

export const DIMENSION_CAP = 100000n;
export const RATIO_PART_CAP = 10000n;
export const RATIO_PART_MAX_DECIMALS = 3;
export const GIVEN_MAX_DECIMALS = 2;

const DECIMAL_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/;

function fail(code, params = {}) {
  return { ok: false, code, ...params };
}

export function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x;
}

export function reduceFraction(num, den) {
  if (den <= 0n) throw new Error("Fraction denominator must be positive.");
  if (num === 0n) return { num: 0n, den: 1n };
  const divisor = gcd(num, den);
  return { num: num / divisor, den: den / divisor };
}

export function parseDecimal(text, { maxDecimals, cap }) {
  if (typeof text !== "string") return fail("INVALID_NUMBER");
  const trimmed = text.replace(/^[\t\n\r ]+|[\t\n\r ]+$/g, "");
  if (trimmed === "") return fail("EMPTY");
  const match = DECIMAL_PATTERN.exec(trimmed);
  if (match === null) return fail("INVALID_NUMBER");
  const sign = match[1];
  const intPart = match[2];
  const fracPart = match[3] ?? "";
  if (fracPart.length > maxDecimals) return fail("TOO_MANY_DECIMALS", { max: maxDecimals });
  const scale = 10n ** BigInt(fracPart.length);
  let num = BigInt(intPart) * scale + (fracPart === "" ? 0n : BigInt(fracPart));
  if (sign === "-") num = -num;
  const value = reduceFraction(num, scale);
  if (value.num <= 0n) return fail("NON_POSITIVE");
  if (value.num > cap * value.den) return fail("TOO_LARGE", { cap: cap.toString() });
  return { ok: true, value, places: fracPart.length, text: trimmed };
}

// Mode A dimensions: integers 1..100,000 (zero decimal places allowed).
export function parseDimension(text) {
  const parsed = parseDecimal(text, { maxDecimals: 0, cap: DIMENSION_CAP });
  if (!parsed.ok) return parsed;
  return { ok: true, value: parsed.value.num, text: parsed.text };
}

// Mode B ratio parts: > 0, <= 10,000, at most 3 decimal places.
export function parseRatioPart(text) {
  return parseDecimal(text, { maxDecimals: RATIO_PART_MAX_DECIMALS, cap: RATIO_PART_CAP });
}

// Mode B given dimension: > 0, <= 100,000, at most 2 decimal places.
export function parseGivenDimension(text) {
  return parseDecimal(text, { maxDecimals: GIVEN_MAX_DECIMALS, cap: DIMENSION_CAP });
}

export function simplifyPair(w, h) {
  const divisor = gcd(w, h);
  return { a: w / divisor, b: h / divisor };
}

// Decimal ratio parts are scaled by 1000 (exact, because at most 3 decimal
// places were accepted) and then simplified by gcd: 2.39:1 -> 239:100 and
// 21:9 -> 7:3 (SPEC section 4).
export function ratioFromParts(partW, partH) {
  const w = (partW.num * 1000n) / partW.den;
  const h = (partH.num * 1000n) / partH.den;
  return simplifyPair(w, h);
}

export function solveHeight(ratio, givenWidth) {
  return reduceFraction(givenWidth.num * ratio.b, givenWidth.den * ratio.a);
}

export function solveWidth(ratio, givenHeight) {
  return reduceFraction(givenHeight.num * ratio.a, givenHeight.den * ratio.b);
}

// Display-only rounding, half away from zero. Every fraction in this tool
// is non-negative, so BigInt truncation is floor and the half comparison is
// exact.
export function formatDecimal(frac, places) {
  const scale = 10n ** BigInt(places);
  const scaled = frac.num * scale;
  let quotient = scaled / frac.den;
  const remainder = scaled % frac.den;
  if (remainder * 2n >= frac.den) quotient += 1n;
  const intPart = quotient / scale;
  if (places === 0) return intPart.toString();
  const fracPart = (quotient % scale).toString().padStart(places, "0");
  return `${intPart}.${fracPart}`;
}

// A solved dimension: integers display plainly; anything else displays
// rounded to 2 decimals together with its exact reduced fraction.
export function describeSolved(frac) {
  if (frac.den === 1n) {
    return { isInteger: true, display: frac.num.toString(), fractionText: null };
  }
  return {
    isInteger: false,
    display: formatDecimal(frac, 2),
    fractionText: `${frac.num}/${frac.den}`,
  };
}

export function presetFraction(preset) {
  const width = parseDecimal(preset.width, { maxDecimals: RATIO_PART_MAX_DECIMALS, cap: RATIO_PART_CAP });
  const height = parseDecimal(preset.height, { maxDecimals: RATIO_PART_MAX_DECIMALS, cap: RATIO_PART_CAP });
  if (!width.ok || !height.ok) throw new Error(`Invalid preset data: ${preset.label}`);
  const { a, b } = ratioFromParts(width.value, height.value);
  return { label: preset.label, a, b };
}

export const PRESET_FRACTIONS = Object.freeze(PRESETS.map(presetFraction));

// Nearest-preset note (SPEC sections 2(d) and 4). Comparisons are exact
// fraction comparisons; the shipped preset list has wide separation, and
// this helper accepts any preset set so the two-within-0.01 selection rule
// can be tested with a synthetic set (SPEC section 7(f)). Only the single
// nearest preset is named; a tie keeps the earliest list entry.
export function nearestPresetNote(a, b, presetFractions = PRESET_FRACTIONS) {
  let best = null;
  for (const preset of presetFractions) {
    const cross = a * preset.b - preset.a * b;
    if (cross === 0n) return { kind: "exact", label: preset.label };
    const diffNum = cross < 0n ? -cross : cross;
    const diffDen = b * preset.b;
    if (diffNum * 100n > diffDen) continue;
    if (best === null || diffNum * best.diffDen < best.diffNum * diffDen) {
      best = { label: preset.label, diffNum, diffDen };
    }
  }
  if (best === null) return { kind: "none" };
  return {
    kind: "close",
    label: best.label,
    diffText: formatDecimal({ num: best.diffNum, den: best.diffDen }, 4),
  };
}

export function computeModeA(width, height) {
  const { a, b } = simplifyPair(width, height);
  return {
    a,
    b,
    ratioText: `${a}:${b}`,
    decimalText: formatDecimal({ num: width, den: height }, 4),
    percentText: formatDecimal({ num: height * 100n, den: width }, 2),
    note: nearestPresetNote(a, b),
  };
}

export function computeModeB({ partW, partH, solveFor, given }) {
  const ratio = ratioFromParts(partW, partH);
  const solved = solveFor === "height" ? solveHeight(ratio, given) : solveWidth(ratio, given);
  const described = describeSolved(solved);
  const givenIsInteger = given.den === 1n;
  return {
    ratio,
    ratioText: `${ratio.a}:${ratio.b}`,
    solved,
    solvedDisplay: described.display,
    solvedFractionText: described.fractionText,
    solvedIsInteger: described.isInteger,
    givenIsInteger,
    canUseAsDimensions: givenIsInteger && described.isInteger,
  };
}
