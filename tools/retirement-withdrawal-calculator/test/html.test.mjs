// Static page checks for both language entries: identity strings fixed by
// the SPEC, noindex candidate convention, same-language home links, and no
// production canonical/hreflang/sitemap artifacts.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const zh = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const en = await readFile(new URL("../public/en/index.html", import.meta.url), "utf8");

test("zh page identity", () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes("<title>退休提領試算｜Gloss Tools</title>"));
  assert.ok(zh.includes("<h1>退休提領試算</h1>"));
  assert.ok(
    zh.includes(
      'content="輸入投資組合價值與每年提領額，算出這筆錢能撐幾年；再用 4% 法則看離目標組合還差多少。"'
    )
  );
  assert.ok(zh.includes("本工具僅為固定假設下的試算，不構成投資或退休建議。實際報酬與通膨每年變動，結果僅供參考。"));
});

test("en page identity", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>Retirement Withdrawal Calculator | Gloss Tools</title>"));
  assert.ok(en.includes("<h1>Retirement Withdrawal Calculator</h1>"));
  assert.ok(
    en.includes(
      'content="See how many years a retirement portfolio lasts at a given annual withdrawal, return and inflation — and check the 4% rule target."'
    )
  );
  assert.ok(en.includes("This tool is an estimate under fixed assumptions, not investment or retirement advice. Actual returns and inflation vary year to year; use the result for reference only."));
});

test("candidate conventions on both pages", () => {
  for (const html of [zh, en]) {
    assert.ok(html.includes('name="robots" content="noindex, nofollow"'));
    assert.ok(!html.includes('rel="canonical"'), "no production canonical in candidate");
    assert.ok(!html.includes('rel="alternate"'), "no production hreflang in candidate");
    assert.ok(!/src="https?:/.test(html), "no external scripts");
    assert.ok(!/href="https?:/.test(html), "no external links");
  }
  // Same-language home links use ../../ per the house convention.
  assert.ok(zh.includes('href="../../index.html"'));
  assert.ok(en.includes('href="../../en/index.html"'));
  // Cross-language links keep to paths only.
  assert.ok(zh.includes('href="en/index.html"'));
  assert.ok(en.includes('href="../index.html"'));
});

test("both pages expose the full control set", () => {
  for (const html of [zh, en]) {
    for (const id of [
      "calc-form",
      "group-depletion",
      "group-four-percent",
      "input-portfolio",
      "input-withdrawal",
      "input-return",
      "input-inflation",
      "input-spending",
      "input-current",
      "btn-run",
      "btn-example",
      "btn-cancel",
      "btn-reset",
      "btn-download",
      "status",
      "result",
      "result-summary",
      "yearly-body",
      "page-info",
      "btn-page-prev",
      "btn-page-next",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
    }
    assert.ok(html.includes('name="mode" value="depletion"'));
    assert.ok(html.includes('name="mode" value="four-percent"'));
    assert.ok(html.includes('name="currency" value="NT$"'));
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-live="polite"'));
  }
});

test("both pages carry the SPEC FAQ answers", () => {
  assert.ok(zh.includes("每年提領在年初、餘額再計當年報酬"));
  assert.ok(zh.includes("Bengen 1994"));
  assert.ok(zh.includes("100 年是模擬上限"));
  assert.ok(en.includes("Each year's withdrawal is taken at the start of the year"));
  assert.ok(en.includes("Bengen (1994)"));
  assert.ok(en.includes("100 years is the simulation cap"));
});
