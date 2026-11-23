// Report serialization: byte-exact expectations written literally here
// (sorted keys, compact JSON, one trailing LF), hashed independently.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildReport, run, stableStringify } from "../public/js/core/core.mjs";

test("report bytes for healthy-mid are exact", () => {
  const { result } = run({ waistCm: "76", heightCm: "170" });
  const report = buildReport(result);
  assert.equal(report.ok, true);
  const expectedText =
    '{"category":"healthy","healthyWaistMaxCm":"85.0","healthyWaistMinCm":"68.0","waistToLoseCm":null,"whtr":"0.45"}\n';
  assert.equal(report.text, expectedText);
  const expectedHash = createHash("sha256").update(expectedText, "utf8").digest("hex");
  const actualHash = createHash("sha256").update(report.bytes).digest("hex");
  assert.equal(actualHash, expectedHash);
  // UTF-8 without BOM: first byte is '{'.
  assert.equal(report.bytes[0], 0x7b);
});

test("report sorts keys recursively and preserves array order", () => {
  const text = stableStringify({ b: [{ d: 1, a: 2 }, { c: 3 }], a: "x" });
  assert.equal(text, '{"a":"x","b":[{"a":2,"d":1},{"c":3}]}');
});

test("report for an increased result carries the 0.0 distance", () => {
  const { result } = run({ waistCm: "85", heightCm: "170" });
  const report = buildReport(result);
  assert.equal(
    report.text,
    '{"category":"increased","healthyWaistMaxCm":"85.0","healthyWaistMinCm":"68.0","waistToLoseCm":"0.0","whtr":"0.50"}\n'
  );
});
