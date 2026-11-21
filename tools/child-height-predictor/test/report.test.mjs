// Report serialization: byte-exact expectations written literally here
// (sorted keys, compact JSON, one trailing LF), hashed independently.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildReport, run, stableStringify } from "../public/js/core/core.mjs";

test("report bytes for boy-typical are exact", () => {
  const { result } = run({ childSex: "boy", fatherHeightCm: "178", motherHeightCm: "165" });
  const report = buildReport(result);
  assert.equal(report.ok, true);
  const expectedText = '{"childSex":"boy","rangeHighCm":186.5,"rangeLowCm":169.5,"targetCm":178}\n';
  assert.equal(report.text, expectedText);
  const expectedHash = createHash("sha256").update(expectedText, "utf8").digest("hex");
  const actualHash = createHash("sha256").update(report.bytes).digest("hex");
  assert.equal(actualHash, expectedHash);
  // UTF-8 without BOM: first byte is '{'.
  assert.equal(report.bytes[0], 0x7b);
});

test("report bytes for girl-same-parents are exact", () => {
  const { result } = run({ childSex: "girl", fatherHeightCm: "178", motherHeightCm: "165" });
  const report = buildReport(result);
  assert.equal(
    report.text,
    '{"childSex":"girl","rangeHighCm":173.5,"rangeLowCm":156.5,"targetCm":165}\n'
  );
});

test("report sorts keys recursively and preserves array order", () => {
  const text = stableStringify({ b: [{ d: 1, a: 2 }, { c: 3 }], a: "x" });
  assert.equal(text, '{"a":"x","b":[{"a":2,"d":1},{"c":3}]}');
});
