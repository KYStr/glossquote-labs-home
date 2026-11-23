// Report serialization: byte-exact expectations written literally here
// (sorted keys, compact JSON, one trailing LF), hashed independently.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildReport, run, stableStringify } from "../public/js/core/core.mjs";

test("report bytes for basic-title are exact", () => {
  const { result } = run({ title: "Hello World: A Beginner's Guide!", maxLength: "" });
  const report = buildReport(result);
  assert.equal(report.ok, true);
  const expectedText =
    '{"length":30,"maxLength":50,"slug":"hello-world-a-beginner-s-guide","truncated":false}\n';
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

test("report for a truncated result carries the truncated flag", () => {
  const { result } = run({
    title: "The Quick Brown Fox Jumps Over The Lazy Dog Near The River Bank",
    maxLength: "20",
  });
  const report = buildReport(result);
  assert.equal(
    report.text,
    '{"length":19,"maxLength":20,"slug":"the-quick-brown-fox","truncated":true}\n'
  );
});
