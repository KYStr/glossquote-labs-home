// Fixed-report tests for http-status-lookup-report.json.
//
// The expected literals below were derived from the SPEC independently
// of this implementation: the code-404-not-found and code-418-unused
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
} from "../public/js/core/http-status.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const notFound = fixtures.cases.find((entry) => entry.id === "code-404-not-found");
assert.equal(notFound.expected.ok, true);
const unused418 = fixtures.cases.find((entry) => entry.id === "code-418-unused");
assert.equal(unused418.expected.ok, true);

const EXPECTED_404_TEXT =
  `{"adviceEn":"Check the URL spelling; site owners should fix links and redirects.","adviceZh":"檢查網址拼字；站方應確認連結與導向。","assigned":true,"category":{"class":4,"key":"client-error","labelEn":"Client Error","labelZh":"客戶端錯誤","range":"400–499","summaryEn":"The request contains bad syntax or cannot be fulfilled.","summaryZh":"請求語法錯誤或無法完成。"},"causeEn":"A mistyped URL, or a deleted or moved resource without a redirect.","causeZh":"網址打錯、資源已刪除或移動且未設導向。","code":404,"meaningEn":"The server cannot find the requested resource.","meaningZh":"伺服器找不到請求的資源。","obsolete":false,"reason":"Not Found","reasonZh":"找不到","reference":"RFC 9110 §15.5.5","temporary":false}` +
  "\n";

const EXPECTED_418_TEXT =
  `{"adviceEn":"It should not appear in real responses; treat it as an undefined code.","adviceZh":"不應出現在實際回應中；收到時視為未定義代碼處理。","assigned":true,"category":{"class":4,"key":"client-error","labelEn":"Client Error","labelZh":"客戶端錯誤","range":"400–499","summaryEn":"The request contains bad syntax or cannot be fulfilled.","summaryZh":"請求語法錯誤或無法完成。"},"causeEn":"A reserved code, defined as unused by RFC 9110; the old \\"I'm a teapot\\" name came from the RFC 2324 April Fools' joke and is not in the current registry.","causeZh":"保留代碼，RFC 9110 明定為未使用；舊稱「I'm a teapot」出自 RFC 2324 愚人節玩笑，不在現行登記中。","code":418,"meaningEn":"This code is currently unused and has no defined semantics.","meaningZh":"此代碼目前未使用，沒有定義的語義。","obsolete":false,"reason":"(Unused)","reasonZh":"（未使用）","reference":"RFC 9110 §15.5.19","temporary":false}` +
  "\n";

test("code-404-not-found report matches the independently derived literal byte for byte", () => {
  const report = buildReport(notFound.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "http-status-lookup-report.json");
  assert.equal(REPORT_FILENAME, "http-status-lookup-report.json");
  assert.equal(report.text, EXPECTED_404_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_404_TEXT, "utf8"));
  assert.equal(report.byteLength, 788);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("code-418-unused report matches the independently derived literal byte for byte", () => {
  const report = buildReport(unused418.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_418_TEXT);
  assert.equal(report.byteLength, 1001);
});

test("a live run of the example produces the identical report", () => {
  const outcome = run({ code: "404" });
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_404_TEXT);
});

test("an unassigned result serializes with null reason and reference", () => {
  const outcome = run({ code: "209" });
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.ok(report.text.includes('"assigned":false'));
  assert.ok(report.text.includes('"reason":null'));
  assert.ok(report.text.includes('"reference":null'));
  assert.ok(report.text.includes('"code":209'));
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
  Object.defineProperty(withAccessor, "code", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    code: 404,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
