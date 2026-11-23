// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// bilingual disclaimer, the pinned FAQ answers, the draft-loss note,
// the form controls, and the download button that only appears on
// success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const DISCLAIMER_ZH =
  "本工具僅依你輸入的假設試算，不含稅費、仲介費、裝修、維修、管理費與房貸成數限制，不是財務建議或銀行報價。";
const DISCLAIMER_EN =
  "This tool estimates only from the assumptions you enter. It excludes taxes, agent fees, renovation, maintenance, management fees and loan-to-value limits, and is not financial advice or a bank quotation.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>租屋 vs 買房試算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入租金、房價、頭期款、房貸利率與年增率假設，看到第幾年買房開始比租屋划算，以及逐年的總成本比較表。">',
    ),
  );
  assert.ok(zh.includes("<h1>租屋 vs 買房試算</h1>"));
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
  assert.ok(en.includes("<title>Rent vs Buy Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter rent, home price, down payment, mortgage rate and growth assumptions to see the breakeven year and the year-by-year total-cost comparison.">',
    ),
  );
  assert.ok(en.includes("<h1>Rent vs Buy Calculator</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages show the disclaimer in both languages", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes(DISCLAIMER_ZH));
    assert.ok(page.includes(DISCLAIMER_EN));
  }
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("機會成本是什麼意思？"));
  assert.ok(zh.includes("買房把頭期款鎖進房子，租屋則假設這筆錢以你填的年利率複利增值；比較時這筆放棄的增值算在買房的成本裡。"));
  assert.ok(zh.includes("過了損益平衡年就一定一直划算嗎？"));
  assert.ok(zh.includes("不一定。損益平衡年是買房第一次追上租屋的那一年；之後是否回落，請看逐年比較表的差額欄。"));
  assert.ok(zh.includes("這是買房建議嗎？"));
  assert.ok(zh.includes("不是。這只是依你輸入的假設試算，不含稅費、仲介費、裝修、維修、管理費與房貸成數限制，也不是銀行報價。"));
  assert.ok(en.includes("What is opportunity cost?"));
  assert.ok(en.includes("Buying locks the down payment into the house, while renting assumes that money grows at the rate you enter; the forgone growth counts as part of buying's cost."));
  assert.ok(en.includes("Once past the breakeven year, is buying always cheaper?"));
  assert.ok(en.includes("Not necessarily. The breakeven year is the first year buying catches up with renting; check the difference column of the yearly table for later years."));
  assert.ok(en.includes("Is this buying advice?"));
  assert.ok(en.includes("No. It only estimates from the assumptions you enter, excludes taxes, agent fees, renovation, maintenance, management fees and loan-to-value limits, and is not a bank quotation."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-monthly-rent"'));
    assert.ok(page.includes('id="field-home-price"'));
    assert.ok(page.includes('id="field-down-payment"'));
    assert.ok(page.includes('id="field-mortgage-rate"'));
    assert.ok(page.includes('id="field-years"'));
    assert.ok(page.includes('id="field-rent-growth"'));
    assert.ok(page.includes('id="field-home-appreciation"'));
    assert.ok(page.includes('id="field-opportunity-cost"'));
    assert.ok(page.includes('id="error-monthly-rent"'));
    assert.ok(page.includes('id="error-opportunity-cost"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="yearly-rows"'));
    assert.ok(page.includes('id="yearly-table"'));
    assert.ok(page.includes('id="pagination"'));
    assert.ok(page.includes('id="table-prev"'));
    assert.ok(page.includes('id="table-next"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
