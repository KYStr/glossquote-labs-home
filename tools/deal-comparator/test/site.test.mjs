// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// pinned FAQ answers, the draft-loss note, the form controls, and
// the download button that only appears on success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>優惠比價｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="同一商品 2–4 個優惠方案，換算成統一單位價再排名，找出真正最划算的買法。">',
    ),
  );
  assert.ok(zh.includes("<h1>優惠比價</h1>"));
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
  assert.ok(en.includes("<title>Deal Comparator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Compare 2–4 offers for the same product as one common unit price and rank the best deal.">',
    ),
  );
  assert.ok(en.includes("<h1>Deal Comparator</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("單位價怎麼算？"));
  assert.ok(zh.includes("把每個方案的實付金額除以總數量，再換算成每 100 g／每 100 mL／每件；買 N 送 M 的贈品數量也算進總數量。"));
  assert.ok(zh.includes("兩個方案單位價相同時為什麼排名不同？"));
  assert.ok(zh.includes("先比實付總價，總價低者在前；總價也相同時，輸入順序在前者在前。"));
  assert.ok(zh.includes("可以比較不同商品嗎？"));
  assert.ok(zh.includes("不行。本工具只比較同一商品的優惠方案；不同商品的比較不在範圍內。"));
  assert.ok(zh.includes("組合價比原價貴會怎樣？"));
  assert.ok(zh.includes("仍可比較，省下金額與百分比會是負值，該方案排名最後。"));
  assert.ok(en.includes("How is the unit price calculated?"));
  assert.ok(en.includes("Divide each offer's total paid by its total quantity, then scale to per 100 g / per 100 mL / per piece; free items from buy N get M count toward the total quantity."));
  assert.ok(en.includes("Why do two offers with the same unit price rank differently?"));
  assert.ok(en.includes("The lower total paid ranks first; if the totals are also equal, the earlier-entered offer ranks first."));
  assert.ok(en.includes("Can I compare different products?"));
  assert.ok(en.includes("No. This tool only compares offers for the same product; comparing different products is out of scope."));
  assert.ok(en.includes("What if a bundle costs more than the list price?"));
  assert.ok(en.includes("It still compares; its savings amount and percent are negative and it ranks last."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-product-name"'));
    assert.ok(page.includes('id="field-unit-basis"'));
    assert.ok(page.includes('id="field-pack-size"'));
    assert.ok(page.includes('id="field-pack-price"'));
    assert.ok(page.includes('id="field-offer-count"'));
    for (let index = 0; index < 4; index += 1) {
      assert.ok(page.includes(`id="field-offer-${index}-label"`));
      assert.ok(page.includes(`id="field-offer-${index}-type"`));
      assert.ok(page.includes(`id="field-offer-${index}-buy-n"`));
      assert.ok(page.includes(`id="field-offer-${index}-get-m"`));
      assert.ok(page.includes(`id="field-offer-${index}-percent"`));
      assert.ok(page.includes(`id="field-offer-${index}-amount-off"`));
      assert.ok(page.includes(`id="field-offer-${index}-bundle-price"`));
      assert.ok(page.includes(`id="error-offer-${index}"`));
    }
    assert.ok(page.includes('id="error-product-name"'));
    assert.ok(page.includes('id="error-pack-price"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="best-line"'));
    assert.ok(page.includes('id="result-rows"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
