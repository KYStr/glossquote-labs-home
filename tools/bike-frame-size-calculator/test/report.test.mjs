// Report serialization: byte-exact expectations written literally here
// (sorted keys, compact JSON, one trailing LF), hashed independently.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildReport, run, stableStringify } from "../public/js/core/core.mjs";

test("report bytes for road-typical are exact", () => {
  const { result } = run({ heightCm: "175", inseamCm: "80", bikeType: "road" });
  const report = buildReport(result);
  assert.equal(report.ok, true);
  const expectedText =
    '{"bikeType":"road","centreCm":53.6,"centreIn":21.1,"heightCm":175,"inseamCm":80,"letter":"M","rangeCm":{"high":54.6,"low":52.6},"rangeIn":{"high":21.5,"low":20.7},"saddleHeightCm":70.6,"warning":null}\n';
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

test("report for a warned result carries the ratio warning object", () => {
  const { result } = run({ heightCm: "170", inseamCm: "50", bikeType: "road" });
  const report = buildReport(result);
  assert.equal(
    report.text,
    '{"bikeType":"road","centreCm":33.5,"centreIn":13.2,"heightCm":170,"inseamCm":50,"letter":"M","rangeCm":{"high":34.5,"low":32.5},"rangeIn":{"high":13.6,"low":12.8},"saddleHeightCm":44.2,"warning":{"code":"INSEAM_RATIO","ratio":0.294}}\n'
  );
});
