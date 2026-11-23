// Fixed-report tests for storage-unit-estimator-report.json.
//
// The expected literals below were derived from the SPEC independently
// of this implementation: the studio-basics and overflow-largest
// result objects (the SPEC's literal fixtures) serialized with a
// separate canonicalizer (Python json, sorted keys, compact
// separators) applying the SPEC's rule — keys sorted recursively by
// UTF-16 code units, compact separators, exactly one trailing LF.
// The test fails if the implementation's serializer, key order, or
// result shape drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/storage-unit-estimator.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const studio = fixtures.cases.find((entry) => entry.id === "studio-basics");
assert.equal(studio.expected.ok, true);
const overflow = fixtures.cases.find((entry) => entry.id === "overflow-largest");
assert.equal(overflow.expected.ok, true);

const EXPECTED_TEXT =
  `{"allowanceM3":"0.79","capacityM3":"5.66","fillPct":"69.6","fits":true,"floorAreaM2":"2.32","floorAreaPing":"0.70","requiredM3":"3.94","rows":[{"itemId":"single-bed","nameEn":"Single bed frame + mattress","nameZh":"單人床架+床墊","quantity":1,"rowVolumeM3":"1.14","unitVolumeM3":"1.14"},{"itemId":"wardrobe","nameEn":"Wardrobe (double-door)","nameZh":"衣櫃（雙門）","quantity":1,"rowVolumeM3":"1.44","unitVolumeM3":"1.44"},{"itemId":"box-medium","nameEn":"Medium box","nameZh":"中紙箱","quantity":2,"rowVolumeM3":"0.26","unitVolumeM3":"0.13"},{"itemId":"washing-machine","nameEn":"Washing machine","nameZh":"洗衣機","quantity":1,"rowVolumeM3":"0.31","unitVolumeM3":"0.31"}],"totalM3":"3.15","unitId":"5x5","unitLabelFt":"5 × 5 ft","unitsNeeded":1}` +
  "\n";

const EXPECTED_OVERFLOW_TEXT =
  `{"allowanceM3":"15.45","capacityM3":"67.96","fillPct":"56.8","fits":false,"floorAreaM2":"27.87","floorAreaPing":"8.43","requiredM3":"77.25","rows":[{"itemId":"wardrobe","nameEn":"Wardrobe (double-door)","nameZh":"衣櫃（雙門）","quantity":10,"rowVolumeM3":"14.40","unitVolumeM3":"1.44"},{"itemId":"sofa-3-seat","nameEn":"Three-seat sofa","nameZh":"三人沙發","quantity":10,"rowVolumeM3":"17.00","unitVolumeM3":"1.70"},{"itemId":"double-bed","nameEn":"Double bed frame + mattress","nameZh":"雙人床架+床墊","quantity":10,"rowVolumeM3":"18.20","unitVolumeM3":"1.82"},{"itemId":"refrigerator-large","nameEn":"Large refrigerator (double-door)","nameZh":"大冰箱（雙門）","quantity":10,"rowVolumeM3":"12.20","unitVolumeM3":"1.22"}],"totalM3":"61.80","unitId":"10x30","unitLabelFt":"10 × 30 ft","unitsNeeded":2}` +
  "\n";

test("studio-basics report matches the independently derived literal byte for byte", () => {
  const report = buildReport(studio.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "storage-unit-estimator-report.json");
  assert.equal(REPORT_FILENAME, "storage-unit-estimator-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 767);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(studio.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
});

test("an overflow result serializes with the same canonical key order", () => {
  const outcome = run(overflow.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_OVERFLOW_TEXT);
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
  Object.defineProperty(withAccessor, "totalM3", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    totalM3: "3.15",
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
