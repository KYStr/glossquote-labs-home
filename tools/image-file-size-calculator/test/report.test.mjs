// Fixed-report tests for image-file-size-report.json.
//
// The expected literal below was derived from the SPEC independently
// of this implementation: the jpeg-photo-12mp result object (the
// SPEC's literal fixture) serialized with a separate canonicalizer
// (Python json, sorted keys, compact separators) applying the SPEC's
// rule — keys sorted recursively by UTF-16 code units, compact
// separators, exactly one trailing LF. The test fails if the
// implementation's serializer, key order, or result shape drifts in
// any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/image-file-size.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const jpeg = fixtures.cases.find((entry) => entry.id === "jpeg-photo-12mp");
assert.equal(jpeg.expected.ok, true);

const EXPECTED_TEXT =
  `{"displaySize":"3.43 MB","effectiveBitDepth":"24","estimatedBytes":3600000,"format":"jpeg","megapixels":"12.00","sizeKB":"3515.63","sizeMB":"3.43","totalPixels":12000000,"uncompressedBytes":36000000}` +
  "\n";

test("jpeg-photo-12mp report matches the independently derived literal byte for byte", () => {
  const report = buildReport(jpeg.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "image-file-size-report.json");
  assert.equal(REPORT_FILENAME, "image-file-size-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(jpeg.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
});

test("a tiny-icon result serializes with the same canonical key order", () => {
  const outcome = run({ widthPx: "16", heightPx: "16", bitDepth: "32", format: "png" });
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(
    report.text,
    `{"displaySize":"410 B","effectiveBitDepth":"32","estimatedBytes":410,"format":"png","megapixels":"0.00","sizeKB":"0.40","sizeMB":"0.00","totalPixels":256,"uncompressedBytes":1024}\n`,
  );
});

test("the report limit constant is the SPEC's 2 MiB", () => {
  assert.equal(REPORT_LIMIT_BYTES, 2097152);
});

test("non-plain report inputs are refused", () => {
  // The SPEC pins the report bytes and the OUTPUT_LIMIT failure, not
  // an error code for a non-result input; the house pattern refuses
  // every non-plain input without serializing it (and never invokes
  // an accessor or the input's toJSON).
  for (const bad of [null, [], "x", 42]) {
    assert.equal(buildReport(bad).ok, false);
  }
  const withAccessor = {};
  Object.defineProperty(withAccessor, "estimatedBytes", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    estimatedBytes: 3600000,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
