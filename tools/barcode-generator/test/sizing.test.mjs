// SPEC sections 2(e,f) and 7e: physical sizing. X is in hundredths of a
// millimetre, so total width = total modules x X is exact at 2 decimals.
// PNG height = round(barHeightMm / X x scale), half away from zero.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  barRuns,
  buildSvg,
  encodeCode128,
  encodeEan13,
  pngHeightPx,
  pngWidthPx,
  totalWidthMm,
} from "../public/js/core/barcode.mjs";

test("SPEC fixture 1 width: 88 modules at X = 0.25 / 0.33 / 1.00 mm", () => {
  assert.equal(totalWidthMm(88, 25), "22.00");
  assert.equal(totalWidthMm(88, 33), "29.04");
  assert.equal(totalWidthMm(88, 100), "88.00");
});

test("ean-13 total width at default X: 113 modules x 0.33 = 37.29 mm", () => {
  const r = encodeEan13("590123412345");
  assert.equal(totalWidthMm(r.totalModules, 33), "37.29");
});

test("png pixel dimensions follow the SPEC formula", () => {
  assert.equal(pngWidthPx(88, 3), 264);
  // 25 mm / 0.33 mm x 3 = 227.27... -> 227
  assert.equal(pngHeightPx(25, 33, 3), 227);
  // 22 mm / 0.33 mm x 3 = 200 exactly
  assert.equal(pngHeightPx(22, 33, 3), 200);
  // half away from zero: 11 mm / 0.40 mm x 1 = 27.5 -> 28
  assert.equal(pngHeightPx(11, 40, 1), 28);
  // X bounds: 0.25 and 1.00
  assert.equal(pngHeightPx(25, 25, 1), 100);
  assert.equal(pngHeightPx(25, 100, 1), 25);
});

test("bar runs reconstruct the exact module string", () => {
  const literal =
    "10100010110100111011001100100110111101001110101010110011011011001000010101110010011101000100101";
  const rebuilt = new Array(literal.length).fill("0");
  for (const run of barRuns(literal)) {
    for (let i = 0; i < run.width; i += 1) rebuilt[run.x + i] = "1";
  }
  assert.equal(rebuilt.join(""), literal);
});

test("svg download is in module units and reproduces the module string", () => {
  const r = encodeCode128("ABC");
  const svg = buildSvg(r, { barHeightMm: 25, xHundredths: 33, showText: true });
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 '), svg.slice(0, 90));
  // Rebuild modules from the rect elements and compare with the core result.
  const rebuilt = new Array(r.totalModules).fill("0");
  for (const match of svg.matchAll(/<rect x="(\d+)" y="0" width="(\d+)" height="[\d.]+" fill="#000000"\/>/g)) {
    const x = Number(match[1]);
    const w = Number(match[2]);
    for (let i = 0; i < w; i += 1) rebuilt[x + i] = "1";
  }
  assert.equal(rebuilt.join(""), r.modules);
  assert.ok(svg.includes(">ABC</text>"), "human-readable payload present");
});

test("svg escapes markup payloads: '<' is data, never markup", () => {
  const r = encodeCode128("A<B");
  assert.equal(r.ok, true);
  const svg = buildSvg(r, { barHeightMm: 25, xHundredths: 33, showText: true });
  assert.ok(svg.includes("A&lt;B"));
  assert.ok(!svg.includes(">A<B<"));
});
