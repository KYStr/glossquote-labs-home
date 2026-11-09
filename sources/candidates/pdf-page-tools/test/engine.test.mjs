import assert from "node:assert/strict";
import test from "node:test";

import {
  extractPages,
  inspectPdf,
  mergePdfs,
  pageCountOf,
  pageLabels,
  producerOf,
  rotatePages,
} from "../public/js/core/engine.mjs";
import { PRODUCER } from "../public/js/core/pdftools.mjs";
import {
  makeCorruptPdf,
  makeDocA,
  makeDocB,
  makeEncryptedPdf,
  makePreRotatedPdf,
} from "./fixtures.mjs";

test("inspect reports page counts and rotations; encrypted and corrupt are coded facts", async () => {
  const a = await makeDocA();
  const facts = await inspectPdf(a);
  assert.equal(facts.pageCount, 5);
  assert.deepEqual(facts.rotations, [0, 0, 0, 0, 0]);
  assert.deepEqual(await inspectPdf(makeEncryptedPdf()), { errorCode: "ENCRYPTED" });
  assert.deepEqual(await inspectPdf(makeCorruptPdf(a)), { errorCode: "CORRUPT" });
  assert.deepEqual(await inspectPdf(new TextEncoder().encode("not a pdf")), { errorCode: "CORRUPT" });
});

test("SPEC section 7: merge A+B yields 8 pages in order A-1..A-5, B-1..B-3", async () => {
  const merged = await mergePdfs([await makeDocA(), await makeDocB()]);
  assert.equal(await pageCountOf(merged), 8);
  assert.deepEqual(await pageLabels(merged), ["A-1", "A-2", "A-3", "A-4", "A-5", "B-1", "B-2", "B-3"]);
  assert.equal(await producerOf(merged), PRODUCER);
});

test("SPEC section 7: split A by 2-3,5 per-group yields files of 2 and 1 pages with the right labels", async () => {
  const a = await makeDocA();
  const group1 = await extractPages(a, [2, 3]);
  const group2 = await extractPages(a, [5]);
  assert.equal(await pageCountOf(group1), 2);
  assert.deepEqual(await pageLabels(group1), ["A-2", "A-3"]);
  assert.equal(await pageCountOf(group2), 1);
  assert.deepEqual(await pageLabels(group2), ["A-5"]);
});

test("SPEC section 7: extract 5,1-2 preserves the listed order 5,1,2", async () => {
  const out = await extractPages(await makeDocA(), [5, 1, 2]);
  assert.deepEqual(await pageLabels(out), ["A-5", "A-1", "A-2"]);
});

test("SPEC section 7: rotate page 2 by 90 twice gives 180; pre-rotated +90 gives 180 total", async () => {
  const a = await makeDocA();
  const once = await rotatePages(a, [2], 90);
  assert.deepEqual((await inspectPdf(once)).rotations, [0, 90, 0, 0, 0]);
  const twice = await rotatePages(once, [2], 90);
  assert.deepEqual((await inspectPdf(twice)).rotations, [0, 180, 0, 0, 0]);
  const pre = await makePreRotatedPdf();
  assert.deepEqual((await inspectPdf(pre)).rotations, [0, 90]);
  const bumped = await rotatePages(pre, [2], 90);
  assert.deepEqual((await inspectPdf(bumped)).rotations, [0, 180]);
});

test("rotate output is a fresh document: labels intact, fixed Producer, other pages untouched", async () => {
  const out = await rotatePages(await makeDocA(), [1, 3], 270);
  assert.deepEqual(await pageLabels(out), ["A-1", "A-2", "A-3", "A-4", "A-5"]);
  assert.deepEqual((await inspectPdf(out)).rotations, [270, 0, 270, 0, 0]);
  assert.equal(await producerOf(out), PRODUCER);
});

test("structural determinism: the same operation yields the same pages and rotations", async () => {
  const a = await makeDocA();
  const first = await extractPages(a, [3, 1]);
  const second = await extractPages(a, [3, 1]);
  assert.deepEqual(await pageLabels(first), await pageLabels(second));
  assert.deepEqual((await inspectPdf(first)).rotations, (await inspectPdf(second)).rotations);
});
