import assert from "node:assert/strict";
import test from "node:test";

import {
  baseName,
  checkFileSize,
  hasPdfHeader,
  normaliseRotation,
  outputName,
  parseRange,
  planExtract,
  planMerge,
  planRotate,
  planSplit,
  validateInspectedFile,
  validateMergeSet,
} from "../public/js/core/pdftools.mjs";

const code = (fn) => {
  try {
    fn();
  } catch (error) {
    return error.code;
  }
  return null;
};

test("header probe: %PDF- must appear within the first 1024 bytes", () => {
  assert.equal(hasPdfHeader(new TextEncoder().encode("%PDF-1.7 rest")), true);
  const padded = new Uint8Array(2000).fill(0x20);
  padded.set(new TextEncoder().encode("%PDF-"), 1000);
  assert.equal(hasPdfHeader(padded), true);
  const tooLate = new Uint8Array(2000).fill(0x20);
  tooLate.set(new TextEncoder().encode("%PDF-"), 1030);
  assert.equal(hasPdfHeader(tooLate), false);
  assert.equal(hasPdfHeader(new TextEncoder().encode("plain text")), false);
  assert.equal(hasPdfHeader(new Uint8Array(0)), false);
});

test("file size limit: exactly 200 MB passes, one byte over is a named error", () => {
  checkFileSize(200 * 1024 * 1024);
  assert.equal(code(() => checkFileSize(200 * 1024 * 1024 + 1)), "FILE_TOO_LARGE");
});

test("inspected-file validation maps engine facts to named errors", () => {
  assert.equal(code(() => validateInspectedFile({ errorCode: "ENCRYPTED" })), "ENCRYPTED");
  assert.equal(code(() => validateInspectedFile({ errorCode: "CORRUPT" })), "CORRUPT");
  assert.equal(code(() => validateInspectedFile({ pageCount: 0 })), "NO_PAGES");
  assert.equal(code(() => validateInspectedFile({ pageCount: 2001 })), "TOO_MANY_PAGES");
  const ok = validateInspectedFile({ pageCount: 2000, rotations: [0] });
  assert.equal(ok.pageCount, 2000);
});

test("merge set aggregates: files, bytes and pages each have a named limit", () => {
  const file = (pages, size) => ({ name: "x.pdf", pageCount: pages, size });
  assert.equal(code(() => validateMergeSet(Array.from({ length: 21 }, () => file(1, 1)))), "TOO_MANY_FILES");
  assert.equal(
    code(() => validateMergeSet([file(1, 150 * 1024 * 1024), file(1, 60 * 1024 * 1024)])),
    "TOTAL_SIZE_EXCEEDED",
  );
  assert.equal(code(() => validateMergeSet([file(1500, 1), file(600, 1)])), "TOO_MANY_PAGES");
  const ok = validateMergeSet([file(5, 10), file(3, 10)]);
  assert.equal(ok.totalPages, 8);
});

test("range grammar: singles, ranges, open ranges, spaces, order", () => {
  assert.deepEqual(parseRange("3", 10, "extract").pages, [3]);
  assert.deepEqual(parseRange("1-3, 5, 8-12", 12, "split").groups, [[1, 2, 3], [5], [8, 9, 10, 11, 12]]);
  assert.deepEqual(parseRange("4-", 6, "extract").pages, [4, 5, 6]);
  assert.deepEqual(parseRange(" 2 - 3 ,5 ", 9, "extract").pages, [2, 3, 5]);
  // Extract keeps the listed order exactly (SPEC 4).
  assert.deepEqual(parseRange("5,1-2", 5, "extract").pages, [5, 1, 2]);
  // Split groups keep the expression's order too.
  assert.deepEqual(parseRange("5,1-2", 5, "split").groups, [[5], [1, 2]]);
});

test("range grammar: every error class names its token", () => {
  assert.equal(code(() => parseRange("", 10, "extract")), "RANGE_EMPTY");
  assert.equal(code(() => parseRange("   ", 10, "extract")), "RANGE_EMPTY");
  let err;
  try { parseRange("1,,2", 10, "extract"); } catch (e) { err = e; }
  assert.equal(err.code, "RANGE_EMPTY_ITEM");
  try { parseRange("1,x,3", 10, "extract"); } catch (e) { err = e; }
  assert.equal(err.code, "RANGE_NON_NUMERIC");
  assert.equal(err.params.token, "x");
  try { parseRange("5-3", 10, "extract"); } catch (e) { err = e; }
  assert.equal(err.code, "RANGE_REVERSED");
  assert.equal(err.params.token, "5-3");
  try { parseRange("11", 10, "extract"); } catch (e) { err = e; }
  assert.equal(err.code, "RANGE_BEYOND");
  try { parseRange("0", 10, "extract"); } catch (e) { err = e; }
  assert.equal(err.code, "RANGE_BAD_PAGE");
  try { parseRange("1-4,3-5", 10, "split"); } catch (e) { err = e; }
  assert.equal(err.code, "RANGE_OVERLAP");
  assert.equal(err.params.token, "3-5");
  try { parseRange("2,2", 10, "extract"); } catch (e) { err = e; }
  assert.equal(err.code, "RANGE_DUPLICATE");
  // The same overlapping expression is legal for extract in listed
  // order only when pages do not repeat; split rejects it, as shown.
});

test("naming: sanitiser fixtures from SPEC section 7 plus edge cases", () => {
  assert.equal(baseName("report.pdf"), "report");
  assert.equal(baseName("my file (final).pdf"), "my-file-final");
  assert.equal(baseName("季度報告 2026.pdf"), "季度報告-2026");
  assert.equal(baseName("C:\\Users\\me\\scan 01.PDF"), "scan-01");
  assert.equal(baseName("!!!.pdf"), "document");
  assert.equal(baseName(".pdf"), "document");
  const long = baseName(`${"a".repeat(100)}.pdf`);
  assert.equal(long.length, 60);
  assert.equal(baseName("a/b/c/名稱.pdf"), "名稱");
});

test("output names per mode and group shape", () => {
  assert.equal(outputName("report", "merge"), "report-merged.pdf");
  assert.equal(outputName("report", "split"), "report-split.pdf");
  assert.equal(outputName("report", "split", { first: 2, last: 4 }), "report-p2-4.pdf");
  assert.equal(outputName("report", "split", { first: 7, last: 7 }), "report-p7.pdf");
  assert.equal(outputName("report", "extract"), "report-extract.pdf");
  assert.equal(outputName("report", "rotate"), "report-rotated.pdf");
});

test("rotation sums normalise into 0/90/180/270", () => {
  assert.equal(normaliseRotation(0, 90), 90);
  assert.equal(normaliseRotation(90, 90), 180);
  assert.equal(normaliseRotation(270, 90), 0);
  assert.equal(normaliseRotation(90, 270), 0);
  assert.equal(normaliseRotation(180, 180), 0);
});

test("plan builders: merge totals, split groups, extract order, rotate results", () => {
  const a = { name: "a.pdf", size: 10, pageCount: 5, rotations: [0, 0, 0, 0, 0] };
  const b = { name: "b.pdf", size: 10, pageCount: 3, rotations: [0, 0, 0] };
  const merge = planMerge([a, b]);
  assert.equal(merge.totalPages, 8);
  assert.equal(merge.outputName, "a-merged.pdf");

  const split = planSplit(a, "2-3,5", true);
  assert.deepEqual(split.groups, [[2, 3], [5]]);
  assert.deepEqual(split.outputs.map((o) => o.outputName), ["a-p2-3.pdf", "a-p5.pdf"]);
  const splitCombined = planSplit(a, "2-3,5", false);
  assert.deepEqual(splitCombined.outputs, [{ pages: [2, 3, 5], outputName: "a-split.pdf" }]);

  const extract = planExtract(a, "5,1-2");
  assert.deepEqual(extract.pages, [5, 1, 2]);
  assert.equal(extract.outputs[0].outputName, "a-extract.pdf");

  const rotated = { name: "r.pdf", size: 1, pageCount: 2, rotations: [0, 90] };
  const rotate = planRotate(rotated, "2", 90);
  assert.deepEqual(rotate.results, [{ page: 2, from: 90, to: 180 }]);
  assert.equal(rotate.sample.to, 180);
  assert.equal(rotate.outputs[0].outputName, "r-rotated.pdf");
});
