// Report serialization: byte-exact expectations written literally here
// (sorted keys, compact JSON, one trailing LF), taken from the SPEC
// fixtures, hashed independently.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildReport, run, stableStringify } from "../public/js/core/core.mjs";

test("report bytes for fridge-lights-tv are exact", () => {
  const { result } = run({
    appliances: [
      { name: "Refrigerator", runningWatts: "192", startingWatts: "1200" },
      { name: "Lights", runningWatts: "100", startingWatts: "100" },
      { name: "TV", runningWatts: "190", startingWatts: "190" },
    ],
  });
  const report = buildReport(result);
  assert.equal(report.ok, true);
  const expectedText =
    '{"largestSurgeRow":"Refrigerator","maxSurgeExtraW":1008,"oversize":false,"peakKva":"1.9","peakW":1490,"recommendedKva":"1.9","recommendedSizeKva":"2.0","requiredKva":"0.8","requiredRunningW":603,"rows":[{"name":"Refrigerator","runningWatts":192,"startingWatts":1200,"surgeExtraW":1008},{"name":"Lights","runningWatts":100,"startingWatts":100,"surgeExtraW":0},{"name":"TV","runningWatts":190,"startingWatts":190,"surgeExtraW":0}],"totalRunningW":482}\n';
  assert.equal(report.text, expectedText);
  const expectedHash = createHash("sha256").update(expectedText, "utf8").digest("hex");
  const actualHash = createHash("sha256").update(report.bytes).digest("hex");
  assert.equal(actualHash, expectedHash);
  // UTF-8 without BOM: first byte is '{'.
  assert.equal(report.bytes[0], 0x7b);
});

test("report bytes for the oversize case are exact", () => {
  const { result } = run({
    appliances: [
      { name: "Dryer", runningWatts: "5400", startingWatts: "6750" },
      { name: "Water Heater A", runningWatts: "4500", startingWatts: "4500" },
      { name: "Water Heater B", runningWatts: "4500", startingWatts: "4500" },
      { name: "Window AC", runningWatts: "1500", startingWatts: "2200" },
      { name: "Washer", runningWatts: "1200", startingWatts: "1200" },
      { name: "Refrigerator", runningWatts: "192", startingWatts: "1200" },
    ],
  });
  const report = buildReport(result);
  assert.equal(report.ok, true);
  const expectedText =
    '{"largestSurgeRow":"Dryer","maxSurgeExtraW":1350,"oversize":true,"peakKva":"23.4","peakW":18642,"recommendedKva":"27.1","recommendedSizeKva":"27.5","requiredKva":"27.1","requiredRunningW":21615,"rows":[{"name":"Dryer","runningWatts":5400,"startingWatts":6750,"surgeExtraW":1350},{"name":"Water Heater A","runningWatts":4500,"startingWatts":4500,"surgeExtraW":0},{"name":"Water Heater B","runningWatts":4500,"startingWatts":4500,"surgeExtraW":0},{"name":"Window AC","runningWatts":1500,"startingWatts":2200,"surgeExtraW":700},{"name":"Washer","runningWatts":1200,"startingWatts":1200,"surgeExtraW":0},{"name":"Refrigerator","runningWatts":192,"startingWatts":1200,"surgeExtraW":1008}],"totalRunningW":17292}\n';
  assert.equal(report.text, expectedText);
});

test("report sorts keys recursively and preserves array order", () => {
  const text = stableStringify({ b: [{ d: 1, a: 2 }, { c: 3 }], a: "x" });
  assert.equal(text, '{"a":"x","b":[{"a":2,"d":1},{"c":3}]}');
});

test("report over the 2,097,152-byte cap is OUTPUT_LIMIT", () => {
  const report = buildReport({ pad: "x".repeat(2097152) });
  assert.deepEqual(report, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
