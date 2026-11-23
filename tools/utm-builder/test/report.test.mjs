// Report serialization: byte-exact expectations written literally here
// (sorted keys, compact JSON, one trailing LF), hashed independently.
// The basic-social expected text was derived by hand: top-level keys
// sort params before taggedUrl; each param sorts key before value.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildReport, run, stableStringify } from "../public/js/core/core.mjs";

test("report bytes for basic-social are exact", () => {
  const { result } = run({
    baseUrl: "https://example.com/blog/summer-sale",
    source: "facebook",
    medium: "social",
    campaign: "summer_sale",
    term: "",
    content: "",
  });
  const report = buildReport(result);
  assert.equal(report.ok, true);
  const expectedText =
    '{"params":[{"key":"utm_source","value":"facebook"},{"key":"utm_medium","value":"social"},{"key":"utm_campaign","value":"summer_sale"}],"taggedUrl":"https://example.com/blog/summer-sale?utm_source=facebook&utm_medium=social&utm_campaign=summer_sale"}\n';
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

test("report for a five-parameter result keeps param order", () => {
  const { result } = run({
    baseUrl: "https://example.com/landing",
    source: "google",
    medium: "cpc",
    campaign: "spring_promo",
    term: "running shoes",
    content: "banner_top",
  });
  const report = buildReport(result);
  assert.equal(
    report.text,
    '{"params":[{"key":"utm_source","value":"google"},{"key":"utm_medium","value":"cpc"},{"key":"utm_campaign","value":"spring_promo"},{"key":"utm_term","value":"running shoes"},{"key":"utm_content","value":"banner_top"}],"taggedUrl":"https://example.com/landing?utm_source=google&utm_medium=cpc&utm_campaign=spring_promo&utm_term=running%20shoes&utm_content=banner_top"}\n'
  );
});

test("report over the byte cap returns OUTPUT_LIMIT", () => {
  const big = { taggedUrl: "x".repeat(2097152), params: [] };
  const report = buildReport(big);
  assert.deepEqual(report, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
