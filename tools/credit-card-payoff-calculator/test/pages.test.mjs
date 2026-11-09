import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Static page contract from the SPEC: exact pinned titles, headings,
// descriptions, the model disclosure and both FAQ answers, the
// noindex preview convention, the pinned CSP, and identical element
// id sets across the two language pages.

const zh = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const en = await readFile(new URL("../public/en/index.html", import.meta.url), "utf8");

function ids(html) {
  return [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]).sort();
}

test("zh page carries the pinned SPEC strings", () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes("<title>信用卡還款試算｜Gloss Tools</title>"));
  assert.ok(zh.includes("<h1>信用卡還款試算</h1>"));
  assert.ok(zh.includes('content="輸入信用卡欠款餘額與年利率，試算每月固定還款要多久還清、總利息多少，或在目標月數內還清每月要繳多少；含永遠還不完的偵測。"'));
  assert.ok(zh.includes("這是依上述模型的試算，實際帳單金額以發卡銀行結算為準；未含年費、違約金、預借現金與最低應繳規則。"));
  assert.ok(zh.includes("為什麼顯示永遠還不完？"));
  assert.ok(zh.includes("每月還款不超過第一個月利息時，餘額永遠不會減少。"));
  assert.ok(zh.includes("目標月數的每月金額怎麼算？"));
  assert.ok(zh.includes("以年金公式精確計算、無條件進位到分，再以同一月結模擬驗證。"));
  assert.ok(zh.includes("每月還款不超過每月利息，餘額永遠不會減少") === false); // error copy lives in i18n, not the page
});

test("en page carries the pinned SPEC strings", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>Credit Card Payoff Calculator | Gloss Tools</title>"));
  assert.ok(en.includes("<h1>Credit Card Payoff Calculator</h1>"));
  assert.ok(en.includes('content="Enter a card balance and APR to see how long a fixed monthly payment takes to clear it, the total interest, or the payment needed to finish within a target number of months — including never-payoff detection."'));
  assert.ok(en.includes("This is an estimate under the stated model. Your issuer's statement governs; fees, penalties, cash advances and minimum-payment rules are not modeled."));
  assert.ok(en.includes("Why does it say the balance never pays off?"));
  assert.ok(en.includes("When the payment is no more than the first month's interest, the balance never shrinks."));
  assert.ok(en.includes("How is the target-months payment derived?"));
  assert.ok(en.includes("From the exact annuity formula, rounded up to the cent, then verified by the same monthly simulation."));
});

test("both pages use the preview convention and the pinned CSP", () => {
  for (const html of [zh, en]) {
    assert.equal(html.split('<meta name="robots" content="noindex, nofollow">').length, 2);
    const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
    assert.ok(csp, "CSP meta present");
    for (const directive of [
      "default-src 'none'", "script-src 'self'", "style-src 'self'",
      "worker-src blob:", "img-src 'self'", "connect-src 'none'",
      "object-src 'none'", "base-uri 'none'", "form-action 'none'",
      "frame-ancestors 'none'",
    ]) {
      assert.ok(csp[1].includes(directive), directive);
    }
    assert.ok(!html.includes("https://credit-card-payoff.glossquote.com"));
    assert.ok(!/rel="canonical"/.test(html));
  }
  assert.ok(zh.includes('<a href="../../index.html">'));
  assert.ok(en.includes('<a href="../../en/index.html">'));
  assert.ok(zh.includes('<a href="en/index.html" lang="en">'));
  assert.ok(en.includes('<a href="../index.html" lang="zh-Hant">'));
});

test("element id sets are identical across languages", () => {
  assert.deepStrictEqual(ids(zh), ids(en));
  for (const id of [
    "payoff-form", "balance", "apr-percent", "mode-payment", "mode-months",
    "monthly-payment", "target-months", "run-button", "example-button",
    "reset-button", "cancel-button", "status-message", "result-section",
    "schedule-body", "page-prev", "page-next", "page-info", "download-button",
  ]) {
    assert.ok(ids(zh).includes(id), id);
  }
});
