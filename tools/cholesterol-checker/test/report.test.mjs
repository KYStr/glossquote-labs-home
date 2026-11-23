// Report serialization: byte-exact expectations written literally here
// (sorted keys, compact JSON, one trailing LF), hashed independently.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildReport, run, stableStringify } from "../public/js/core/core.mjs";

test("report bytes for all-desirable are exact", () => {
  const { result } = run({ total: "180", ldl: "90", hdl: "65", triglycerides: "120" });
  const report = buildReport(result);
  assert.equal(report.ok, true);
  const expectedText =
    '{"classifications":{"hdl":{"band":"high","severity":0},"ldl":{"band":"optimal","severity":0},"total":{"band":"desirable","severity":0},"triglycerides":{"band":"normal","severity":0}},"nonHdl":115,"overall":{"label":"all-desirable","rank":0},"values":{"hdl":65,"ldl":90,"total":180,"triglycerides":120}}\n';
  assert.equal(report.text, expectedText);
  const expectedHash = createHash("sha256").update(expectedText, "utf8").digest("hex");
  const actualHash = createHash("sha256").update(report.bytes).digest("hex");
  assert.equal(actualHash, expectedHash);
  // UTF-8 without BOM: first byte is '{'.
  assert.equal(report.bytes[0], 0x7b);
});

test("report bytes for high-risk are exact", () => {
  const { result } = run({ total: "260", ldl: "195", hdl: "35", triglycerides: "550" });
  const report = buildReport(result);
  assert.equal(report.ok, true);
  const expectedText =
    '{"classifications":{"hdl":{"band":"low","severity":2},"ldl":{"band":"very-high","severity":4},"total":{"band":"high","severity":2},"triglycerides":{"band":"very-high","severity":3}},"nonHdl":225,"overall":{"label":"needs-attention","rank":4},"values":{"hdl":35,"ldl":195,"total":260,"triglycerides":550}}\n';
  assert.equal(report.text, expectedText);
});

test("report sorts keys recursively and preserves array order", () => {
  const text = stableStringify({ b: [{ d: 1, a: 2 }, { c: 3 }], a: "x" });
  assert.equal(text, '{"a":"x","b":[{"a":2,"d":1},{"c":3}]}');
});
