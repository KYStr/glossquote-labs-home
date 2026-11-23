// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// pinned FAQ answers, the draft-loss note, the form controls, the
// success-only download, and the full 64-row status code table with
// its class filter and per-class unassigned note.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>HTTP 狀態碼查詢｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入一個 HTTP 狀態碼，立即知道它的分類、官方名稱、中文說明、常見成因與處理建議。">',
    ),
  );
  assert.ok(zh.includes("<h1>HTTP 狀態碼查詢</h1>"));
  assert.ok(zh.includes('content="noindex, nofollow"'));
  assert.ok(!zh.includes("canonical"));
  assert.ok(!zh.includes("hreflang"));
  assert.ok(zh.includes('href="./en/index.html"'));
  assert.ok(zh.includes('href="../../"'));
  assert.ok(zh.includes('href="./styles/app.css"'));
  assert.ok(zh.includes('src="./js/app.js"'));
});

test("en page carries the pinned metadata and candidate rules", () => {
  assert.match(en, /<html lang="en">/);
  assert.ok(en.includes("<title>HTTP Status Lookup | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter an HTTP status code and see its class, official name, meaning in Chinese, common causes, and what to do about it.">',
    ),
  );
  assert.ok(en.includes("<h1>HTTP Status Lookup</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("查不到的代碼怎麼辦？"));
  assert.ok(zh.includes("在 100–599 內但尚未指派的代碼會顯示未指派說明，只以分類概略理解。"));
  assert.ok(zh.includes("會真的去請求某個網址嗎？"));
  assert.ok(zh.includes("不會。本工具只查內建的狀態碼表，不發出任何網路請求。"));
  assert.ok(zh.includes('418 是 "I\'m a teapot" 嗎？'));
  assert.ok(zh.includes("不是。現行 IANA 登記與 RFC 9110 將 418 列為 (Unused)；\"I'm a teapot\" 出自 RFC 2324 愚人節玩笑。"));
  assert.ok(en.includes("What if a code is not assigned?"));
  assert.ok(en.includes("A code inside 100–599 with no assignment shows the unassigned note; interpret it only by its class."));
  assert.ok(en.includes("Does it request a URL?"));
  assert.ok(en.includes("No. This tool only looks up the built-in status code table and makes no network requests."));
  assert.ok(en.includes('Is 418 "I\'m a teapot"?'));
  assert.ok(en.includes('No. The current IANA registry and RFC 9110 list 418 as (Unused); "I\'m a teapot" came from the RFC 2324 April Fools\' joke.'));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-code"'));
    assert.ok(page.includes('id="error-code"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="advice-rows"'));
    assert.ok(page.includes('id="flags-note"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
    assert.ok(page.includes('id="table-filter"'));
    assert.ok(page.includes('id="status-table"'));
  }
});

test("both pages carry the full 64-row table with the pinned official names", () => {
  for (const page of [zh, en]) {
    const rows = page.match(/<tr data-class="[1-5]">/g);
    assert.ok(rows, "no table rows found");
    assert.equal(rows.length, 64);
    for (const cls of ["1", "2", "3", "4", "5"]) {
      assert.ok(page.includes(`data-class="${cls}"`), `missing class ${cls} rows`);
    }
    // Spot-check the pinned rows: 418 (Unused), 104 temporary,
    // 510 obsoleted, 413/422 current RFC 9110 names.
    assert.ok(page.includes('data-code="418"'));
    assert.ok(page.includes("(Unused)"));
    assert.ok(page.includes('data-code="104"'));
    assert.ok(page.includes("Upload Resumption Supported"));
    assert.ok(page.includes('data-code="510"'));
    assert.ok(page.includes("Not Extended"));
    assert.ok(page.includes("Content Too Large"));
    assert.ok(page.includes("Unprocessable Content"));
    assert.ok(page.includes('data-code="404"'));
    assert.ok(page.includes("Not Found"));
    // Unassigned intervals are noted, not listed row by row.
    assert.ok(page.includes("105–199"));
    assert.ok(page.includes("512–599"));
    assert.ok(!page.includes('data-code="209"'));
    assert.ok(!page.includes('data-code="599"'));
  }
  // Per-class row counts: 1xx 5, 2xx 10, 3xx 9, 4xx 29, 5xx 11.
  const countClass = (page, cls) => (page.match(new RegExp(`data-class="${cls}"`, "g")) ?? []).length;
  for (const page of [zh, en]) {
    assert.equal(countClass(page, "1"), 5);
    assert.equal(countClass(page, "2"), 10);
    assert.equal(countClass(page, "3"), 9);
    assert.equal(countClass(page, "4"), 29);
    assert.equal(countClass(page, "5"), 11);
  }
});

test("the table in each page matches the core table row for row", async () => {
  const { STATUS_TABLE } = await import("../public/js/core/http-status.mjs");
  for (const page of [zh, en]) {
    for (const row of STATUS_TABLE) {
      assert.ok(page.includes(`data-code="${row.code}"`), `page missing code ${row.code}`);
      assert.ok(page.includes(row.reason), `page missing reason for ${row.code}`);
      assert.ok(page.includes(row.reference), `page missing reference for ${row.code}`);
    }
  }
});
