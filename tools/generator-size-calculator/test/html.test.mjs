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
  assert.ok(zh.includes("<title>發電機容量試算｜Gloss Tools</title>"));
  assert.ok(zh.includes("<h1>發電機容量試算</h1>"));
  assert.ok(
    zh.includes(
      'content="停電備援或露營用電前，先確認要買多大的發電機：列出家電的運轉與啟動瓦數，算出總運轉瓦數、啟動突波與建議 kVA。"'
    )
  );
});

test("en page identity", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>Generator Size Calculator | Gloss Tools</title>"));
  assert.ok(en.includes("<h1>Generator Size Calculator</h1>"));
  assert.ok(
    en.includes(
      'content="Before buying a generator for backup, camping or a job site, check the size you need from your appliances\' running and starting watts."'
    )
  );
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
      "rows",
      "btn-add-row",
      "btn-run",
      "btn-example",
      "btn-cancel",
      "btn-reset",
      "btn-download",
      "status",
      "result",
      "result-sentence",
      "result-total",
      "result-max-surge",
      "result-surge-row",
      "result-peak",
      "result-required",
      "result-required-kva",
      "result-peak-kva",
      "result-recommended",
      "result-size",
      "result-oversize",
      "result-rows-body",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
    }
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-live="polite"'));
  }
});

test("both pages carry the fixed disclaimer and the SPEC FAQs", () => {
  assert.ok(zh.includes("本工具是選型估算，不是專業電氣設計；結果僅供購買參考，實際接線、啟動順序與容量請依家電與發電機銘牌及專業人員確認。"));
  assert.ok(en.includes("This tool is a sizing estimate, not a professional electrical design. The result is for purchase reference only; confirm wiring, start order and capacity against the appliance and generator nameplates and a professional."));
  assert.ok(zh.includes("為什麼只加最大一台的啟動瓦數？"));
  assert.ok(en.includes("Why add only the largest starting watts?"));
  assert.ok(zh.includes("馬達依序啟動時，同一時間只有一台在啟動；同時啟動多台馬達不在本工具範圍內，請分開順序啟動。"));
  assert.ok(en.includes("When motors start one at a time, only one is starting at any moment; starting several motors at once is out of scope — stagger the starts."));
  assert.ok(zh.includes("25% 安全裕度與功率因數 0.8 是什麼？"));
  assert.ok(en.includes("What are the 25% safety margin and 0.8 power factor?"));
  assert.ok(zh.includes("這能取代專業電氣評估嗎？"));
  assert.ok(en.includes("Does this replace a professional electrical assessment?"));
});
