import assert from "node:assert/strict";
import test from "node:test";

import {
  computeModeA,
  computeModeB,
  describeSolved,
  formatDecimal,
  gcd,
  nearestPresetNote,
  parseDecimal,
  parseDimension,
  parseGivenDimension,
  parseRatioPart,
  ratioFromParts,
  simplifyPair,
} from "../public/js/core/ratio.mjs";

const part = (text) => {
  const parsed = parseRatioPart(text);
  assert.equal(parsed.ok, true, `ratio part ${text}`);
  return parsed.value;
};
const given = (text) => {
  const parsed = parseGivenDimension(text);
  assert.equal(parsed.ok, true, `given dimension ${text}`);
  return parsed.value;
};
const modeB = (w, h, solveFor, givenText) =>
  computeModeB({ partW: part(w), partH: part(h), solveFor, given: given(givenText) });

test("SPEC fixture 1: 1920x1080 is exactly 16:9", () => {
  const result = computeModeA(1920n, 1080n);
  assert.equal(result.ratioText, "16:9");
  assert.equal(result.decimalText, "1.7778");
  assert.equal(result.percentText, "56.25");
  assert.deepEqual(result.note, { kind: "exact", label: "16:9" });
});

test("SPEC fixture 2: 1366x768 is 683:384, only close to 16:9", () => {
  const result = computeModeA(1366n, 768n);
  assert.equal(result.ratioText, "683:384");
  assert.equal(result.decimalText, "1.7786");
  assert.deepEqual(result.note, { kind: "close", label: "16:9", diffText: "0.0009" });
});

test("SPEC fixture 3: 2560x1080 is 64:27 with no preset note", () => {
  const result = computeModeA(2560n, 1080n);
  assert.equal(result.ratioText, "64:27");
  assert.equal(result.decimalText, "2.3704");
  assert.deepEqual(result.note, { kind: "none" });
});

test("SPEC fixture 4: 2.39:1 with width 1000", () => {
  const result = modeB("2.39", "1", "height", "1000");
  assert.equal(result.ratioText, "239:100");
  assert.equal(result.solvedDisplay, "418.41");
  assert.equal(result.solvedFractionText, "100000/239");
  assert.equal(result.canUseAsDimensions, false);
});

test("SPEC fixture 5: 16:9 with width 1280 solves height 720", () => {
  const result = modeB("16", "9", "height", "1280");
  assert.equal(result.ratioText, "16:9");
  assert.equal(result.solvedDisplay, "720");
  assert.equal(result.solvedFractionText, null);
  assert.equal(result.canUseAsDimensions, true);
});

test("SPEC fixture 6: typed 21:9 shows as 7:3, width 1000", () => {
  const result = modeB("21", "9", "height", "1000");
  assert.equal(result.ratioText, "7:3");
  assert.equal(result.solvedDisplay, "428.57");
  assert.equal(result.solvedFractionText, "3000/7");
});

test("SPEC fixture 7: 4:3 with height 600 solves width 800", () => {
  const result = modeB("4", "3", "width", "600");
  assert.equal(result.ratioText, "4:3");
  assert.equal(result.solvedDisplay, "800");
  assert.equal(result.solvedFractionText, null);
});

test("SPEC fixture 8: 1.85:1 simplifies to 37:20", () => {
  const result = modeB("1.85", "1", "height", "100");
  assert.equal(result.ratioText, "37:20");
});

test("SPEC 7(e): decimal given dimension uses the exact fraction path", () => {
  const result = modeB("1", "1", "height", "12.50");
  assert.equal(result.solvedDisplay, "12.50");
  assert.equal(result.solvedFractionText, "25/2");
  assert.equal(result.canUseAsDimensions, false);
});

test("gcd sweep: equal, dividing, coprime and the cap corner", () => {
  assert.equal(gcd(5n, 5n), 5n);
  assert.deepEqual(simplifyPair(5n, 5n), { a: 1n, b: 1n });
  assert.deepEqual(simplifyPair(100n, 10n), { a: 10n, b: 1n });
  assert.deepEqual(simplifyPair(10n, 100n), { a: 1n, b: 10n });
  assert.deepEqual(simplifyPair(100000n, 99999n), { a: 100000n, b: 99999n });
  assert.deepEqual(simplifyPair(1366n, 768n), { a: 683n, b: 384n });
});

test("scaling: 0.001, trailing zeros and partners", () => {
  assert.deepEqual(ratioFromParts(part("0.001"), part("1")), { a: 1n, b: 1000n });
  assert.deepEqual(ratioFromParts(part("2.390"), part("1")), { a: 239n, b: 100n });
  assert.deepEqual(ratioFromParts(part("2.39"), part("1")), { a: 239n, b: 100n });
  assert.deepEqual(ratioFromParts(part("16"), part("10")), { a: 8n, b: 5n });
});

test("rounding is display-only, half away from zero", () => {
  assert.equal(formatDecimal({ num: 5n, den: 8n }, 2), "0.63");
  assert.equal(formatDecimal({ num: 1n, den: 8n }, 2), "0.13");
  assert.equal(formatDecimal({ num: 25n, den: 2n }, 2), "12.50");
  assert.equal(formatDecimal({ num: 16n, den: 9n }, 4), "1.7778");
  assert.deepEqual(describeSolved({ num: 720n, den: 1n }), {
    isInteger: true, display: "720", fractionText: null,
  });
});

test("SPEC 7(f): two presets within 0.01 name only the nearer (synthetic set)", () => {
  const synthetic = [
    { label: "1.77", a: 177n, b: 100n },
    { label: "1.78", a: 89n, b: 50n },
  ];
  const note = nearestPresetNote(1778n, 1000n, synthetic);
  assert.equal(note.kind, "close");
  assert.equal(note.label, "1.78");
  assert.equal(note.diffText, "0.0020");
});

test("dimension boundaries: 1 and 100000 pass, 100001 is refused", () => {
  assert.equal(parseDimension("1").ok, true);
  assert.equal(parseDimension("100000").ok, true);
  assert.equal(parseDimension("100001").code, "TOO_LARGE");
  assert.equal(parseDimension("0").code, "NON_POSITIVE");
  assert.equal(parseDimension("-5").code, "NON_POSITIVE");
  assert.equal(parseDimension("12.5").code, "TOO_MANY_DECIMALS");
  assert.equal(parseDimension("").code, "EMPTY");
  assert.equal(parseDimension("1,000").code, "INVALID_NUMBER");
  assert.equal(parseDimension("１２").code, "INVALID_NUMBER");
});

test("ratio part boundaries: 3 decimals pass, 4 refused, 0 and negative refused", () => {
  assert.equal(parseRatioPart("0.001").ok, true);
  assert.equal(parseRatioPart("2.390").ok, true);
  assert.equal(parseRatioPart("0.0001").code, "TOO_MANY_DECIMALS");
  assert.equal(parseRatioPart("1.0000").code, "TOO_MANY_DECIMALS");
  assert.equal(parseRatioPart("0").code, "NON_POSITIVE");
  assert.equal(parseRatioPart("-2.39").code, "NON_POSITIVE");
  assert.equal(parseRatioPart("10000").ok, true);
  assert.equal(parseRatioPart("10000.001").code, "TOO_LARGE");
});

test("given dimension boundaries: 2 decimals pass, 3 refused", () => {
  assert.equal(parseGivenDimension("12.50").ok, true);
  assert.equal(parseGivenDimension("0.5").ok, true);
  assert.equal(parseGivenDimension("12.505").code, "TOO_MANY_DECIMALS");
  assert.equal(parseGivenDimension("100000").ok, true);
  assert.equal(parseGivenDimension("100000.01").code, "TOO_LARGE");
});

test("parser lexical rules: trimming, signs, bare-dot forms", () => {
  const trimmed = parseDecimal("  16  ", { maxDecimals: 0, cap: 100000n });
  assert.equal(trimmed.ok, true);
  assert.equal(trimmed.text, "16");
  assert.equal(parseDecimal(".5", { maxDecimals: 2, cap: 100000n }).code, "INVALID_NUMBER");
  assert.equal(parseDecimal("1.", { maxDecimals: 2, cap: 100000n }).code, "INVALID_NUMBER");
  assert.equal(parseDecimal("+5", { maxDecimals: 0, cap: 100000n }).ok, true);
  assert.equal(parseDecimal("1e3", { maxDecimals: 0, cap: 100000n }).code, "INVALID_NUMBER");
});

test("cap-corner arithmetic stays exact (BigInt path)", () => {
  const result = computeModeA(100000n, 99999n);
  assert.equal(result.ratioText, "100000:99999");
  const solved = modeB("10000", "0.001", "height", "100000");
  assert.equal(solved.ratioText, "10000000:1");
  assert.equal(solved.solvedFractionText, "1/100");
  assert.equal(solved.solvedDisplay, "0.01");
});
