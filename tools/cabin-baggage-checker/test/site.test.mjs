// Page-contract tests for the Cabin Baggage Checker: both language
// pages carry the SPEC-pinned title, description, H1, field labels,
// buttons, disclaimer and FAQ text; preview pages are noindex and carry
// no canonical, hreflang, or sitemap reference; language and home links
// are relative and stay within the same language; every id the app
// wires up exists exactly once.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const zh = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const en = await readFile(new URL("../public/en/index.html", import.meta.url), "utf8");

const DISCLAIMER =
  "比對結果依 2026-11-09 查核之各航空公司公開規定（經濟艙），僅供參考。規定可能變更，行李是否可登機以航空公司官網與現場認定為準。 / Checked against each airline's published economy-class rules as verified on 2026-11-09, for reference only. Rules can change; the airline's official website and airport staff have the final say.";

const FIELD_IDS = [
  "field-bagLength",
  "field-bagWidth",
  "field-bagHeight",
  "field-bagWeightKg",
  "field-personalLength",
  "field-personalWidth",
  "field-personalHeight",
  "field-personalWeightKg",
  "field-airline-eva",
  "field-airline-china-airlines",
  "field-airline-starlux",
  "field-airline-tigerair-taiwan",
  "field-airline-ana",
  "field-airline-jal",
  "error-bagLength",
  "error-bagWidth",
  "error-bagHeight",
  "error-bagWeightKg",
  "error-personalLength",
  "error-personalWidth",
  "error-personalHeight",
  "error-personalWeightKg",
  "error-airlines",
  "error-form",
  "status",
  "example-note",
  "run-btn",
  "example-btn",
  "reset-btn",
  "cancel-btn",
  "download-btn",
  "results",
  "summary",
  "sorted-note",
  "result-rows",
];

function countOccurrences(text, needle) {
  return text.split(needle).length - 1;
}

test("zh page carries the pinned head and heading strings", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>手提行李規定檢查｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      'content="輸入手提行李的三邊尺寸與重量，一次比對長榮、中華、星宇、台灣虎航、全日空與日本航空經濟艙的登機行李規定，逐家列出符合與否和差距。"',
    ),
  );
  assert.ok(zh.includes("<h1>手提行李規定檢查</h1>"));
  assert.ok(zh.includes('<meta name="robots" content="noindex, nofollow">'));
});

test("en page carries the pinned head and heading strings", () => {
  assert.match(en, /<html lang="en">/);
  assert.ok(en.includes("<title>Cabin Baggage Checker | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      'content="Enter your cabin bag\'s three dimensions and weight to check it against the published economy carry-on rules of EVA Air, China Airlines, STARLUX, Tigerair Taiwan, ANA and JAL, with per-airline pass/fail and margins."',
    ),
  );
  assert.ok(en.includes("<h1>Cabin Baggage Checker</h1>"));
  assert.ok(en.includes('<meta name="robots" content="noindex, nofollow">'));
});

test("neither page carries canonical, hreflang, or sitemap references", () => {
  for (const page of [zh, en]) {
    assert.equal(page.includes("canonical"), false);
    assert.equal(page.includes("hreflang"), false);
    assert.equal(page.includes("sitemap"), false);
    assert.equal(page.includes("http://"), false);
    assert.equal(page.includes("https://"), false);
  }
});

test("language and home links are relative and same-language", () => {
  assert.ok(zh.includes('href="./en/index.html"'));
  assert.ok(zh.includes('href="../../"'));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
});

test("both pages carry the pinned disclaimer verbatim", () => {
  assert.ok(zh.includes(DISCLAIMER));
  assert.ok(en.includes(DISCLAIMER));
});

test("zh page carries the pinned labels, buttons, and FAQ", () => {
  for (const pinned of [
    "主行李尺寸（公分）：長、寬、高",
    "主行李重量（公斤）",
    "個人物品（選填）：長、寬、高、重量",
    "要比對的航空公司",
    "檢查行李",
    "載入範例",
    "逐家比對結果",
    "下載報告",
    "重設",
    "取消",
    "尺寸要含輪子和把手嗎？",
    "要。六家規定都把輪子、把手和側袋計入尺寸，請量裝滿後行李箱的外側三邊。",
    "為什麼星宇的重量比較嚴？",
    "星宇經濟艙規定主行李與個人物品合計 7 kg；長榮與中華的 7 kg 只計主行李一件。",
    "三邊填的順序有關係嗎？",
    "沒有。工具會把三邊由大到小排序後再跟各家上限逐邊比對。",
  ]) {
    assert.ok(zh.includes(pinned), pinned);
  }
});

test("en page carries the pinned labels, buttons, and FAQ", () => {
  for (const pinned of [
    "Main bag size (cm): length, width, height",
    "Main bag weight (kg)",
    "Personal item (optional): length, width, height, weight",
    "Airlines to check",
    "Check baggage",
    "Load example",
    "Results by airline",
    "Download report",
    "Reset",
    "Cancel",
    "Should I include wheels and handles?",
    "Yes. All six airlines count wheels, handles and side pockets; measure the outside of the packed bag.",
    "Why is STARLUX stricter on weight?",
    "STARLUX caps the main bag and personal item together at 7 kg in Economy, while EVA Air and China Airlines apply 7 kg to the main bag alone.",
    "Does the order of the three sides matter?",
    "No. The tool sorts your three sides from largest to smallest and compares them side by side with each airline's limits.",
  ]) {
    assert.ok(en.includes(pinned), pinned);
  }
});

test("every wired id exists exactly once on both pages", () => {
  for (const page of [zh, en]) {
    for (const id of FIELD_IDS) {
      assert.equal(countOccurrences(page, `id="${id}"`), 1, id);
    }
  }
});

test("all six airline checkboxes start checked on both pages", () => {
  for (const page of [zh, en]) {
    assert.equal(countOccurrences(page, 'type="checkbox"'), 6);
    assert.equal(countOccurrences(page, "checked>"), 6);
  }
});
