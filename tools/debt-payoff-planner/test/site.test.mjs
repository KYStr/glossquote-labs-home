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
  "本工具以你輸入的固定年利率與固定月還款做推算，實際利率、最低還款與費用會隨銀行規定改變，結果僅供規劃參考，不是理財建議。";
const DISCLAIMER_EN =
  "This tool projects from the fixed APRs and fixed monthly payments you enter. Real rates, minimum payments and fees change with each lender; results are for planning only, not financial advice.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>債務清償規劃｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="同時背著多筆債務時，比較雪球法與雪崩法各自要幾個月還清、總利息差多少。">',
    ),
  );
  assert.ok(zh.includes("<h1>債務清償規劃</h1>"));
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
  assert.ok(en.includes("<title>Debt Payoff Planner | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Compare snowball and avalanche payoff plans for multiple debts: months to debt-free and total interest for each.">',
    ),
  );
  assert.ok(en.includes("<h1>Debt Payoff Planner</h1>"));
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
  assert.ok(zh.includes("雪球法和雪崩法差在哪？"));
  assert.ok(zh.includes("雪球先還餘額最小的，雪崩先還利率最高的；雪崩通常利息較少，雪球通常先看到一筆還清。"));
  assert.ok(zh.includes("還清一筆後，它的最低還款會怎樣？"));
  assert.ok(zh.includes("從下個月起併入額外還款池，繼續滾向下一筆；每月總流出不變。"));
  assert.ok(zh.includes("最低還款比利息少會怎樣？"));
  assert.ok(zh.includes("該筆餘額會越滾越大；若 600 個月內還不清，工具會如實顯示未還清與剩餘餘額。"));
  assert.ok(zh.includes("會連到我的銀行嗎？"));
  assert.ok(zh.includes("不會。全部計算都在本頁完成，不上傳任何資料。"));
  assert.ok(en.includes("What is the difference between snowball and avalanche?"));
  assert.ok(en.includes("Snowball pays the smallest balance first; avalanche pays the highest APR first. Avalanche usually costs less interest; snowball usually clears one debt sooner."));
  assert.ok(en.includes("What happens to a paid-off debt's minimum payment?"));
  assert.ok(en.includes("From the next month it joins the extra-payment pool and rolls to the next debt; the total monthly outflow stays the same."));
  assert.ok(en.includes("What if a minimum payment is less than the interest?"));
  assert.ok(en.includes("That balance grows; if it cannot be cleared within 600 months, the tool says so and shows the remaining balance."));
  assert.ok(en.includes("Does it connect to my bank?"));
  assert.ok(en.includes("No. All calculations run on this page and nothing is uploaded."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, debt table, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="debt-rows"'));
    assert.ok(page.includes('id="row-errors"'));
    assert.ok(page.includes('id="add-debt-btn"'));
    assert.ok(page.includes('id="field-extra"'));
    assert.ok(page.includes('id="error-extra"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="comparison-rows"'));
    assert.ok(page.includes('id="snowball-months"'));
    assert.ok(page.includes('id="snowball-interest"'));
    assert.ok(page.includes('id="snowball-paid"'));
    assert.ok(page.includes('id="snowball-order"'));
    assert.ok(page.includes('id="snowball-payoff"'));
    assert.ok(page.includes('id="snowball-monthly"'));
    assert.ok(page.includes('id="snowball-prev"'));
    assert.ok(page.includes('id="snowball-next"'));
    assert.ok(page.includes('id="snowball-page"'));
    assert.ok(page.includes('id="snowball-notfree"'));
    assert.ok(page.includes('id="avalanche-months"'));
    assert.ok(page.includes('id="avalanche-interest"'));
    assert.ok(page.includes('id="avalanche-paid"'));
    assert.ok(page.includes('id="avalanche-order"'));
    assert.ok(page.includes('id="avalanche-payoff"'));
    assert.ok(page.includes('id="avalanche-monthly"'));
    assert.ok(page.includes('id="avalanche-prev"'));
    assert.ok(page.includes('id="avalanche-next"'));
    assert.ok(page.includes('id="avalanche-page"'));
    assert.ok(page.includes('id="avalanche-notfree"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
