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
  assert.ok(zh.includes("<title>UTM 連結產生器｜Gloss Tools</title>"));
  assert.ok(zh.includes("<h1>UTM 連結產生器</h1>"));
  assert.ok(
    zh.includes(
      'content="輸入目標網址與 UTM 參數，產生可直接貼用的追蹤連結：編碼與既有查詢合併方式皆已釘版。"'
    )
  );
});

test("en page identity", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>UTM Builder | Gloss Tools</title>"));
  assert.ok(en.includes("<h1>UTM Builder</h1>"));
  assert.ok(
    en.includes(
      'content="Build a share-ready UTM-tagged link from a target URL: encoding and existing-query merging are pinned."'
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
      "input-baseurl",
      "input-source",
      "input-medium",
      "input-campaign",
      "input-term",
      "input-content",
      "btn-run",
      "btn-example",
      "btn-preset-social",
      "btn-preset-newsletter",
      "btn-preset-ads",
      "btn-copy",
      "btn-cancel",
      "btn-reset",
      "btn-download",
      "status",
      "result",
      "result-url",
      "param-row-source",
      "param-row-medium",
      "param-row-campaign",
      "param-row-term",
      "param-row-content",
      "param-value-source",
      "param-value-medium",
      "param-value-campaign",
      "param-value-term",
      "param-value-content",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
    }
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-live="polite"'));
    // Labels are real <label> elements, not placeholders alone.
    for (const field of ["baseurl", "source", "medium", "campaign", "term", "content"]) {
      assert.ok(html.includes(`<label for="input-${field}"`), `missing label for ${field}`);
    }
  }
});

test("both pages carry the fixed disclaimer and the SPEC FAQs", () => {
  assert.ok(zh.includes("本工具只在你的網址後面加上追蹤參數，不檢查目標網址是否存在，也不會上傳或儲存你的網址與參數。"));
  assert.ok(en.includes("This tool only appends tracking parameters to your URL. It does not check whether the target URL exists, and it never uploads or stores your URL or parameters."));
  assert.ok(zh.includes("空格會編成 + 嗎？"));
  assert.ok(en.includes("Are spaces encoded as +?"));
  assert.ok(zh.includes("不會，空格一律編為 %20。"));
  assert.ok(en.includes("No, spaces are always encoded as %20."));
  assert.ok(zh.includes("目標網址本來就有查詢參數怎麼辦？"));
  assert.ok(en.includes("What if the target URL already has query parameters?"));
  assert.ok(zh.includes("原樣保留在前，UTM 接在後面；若已含 utm_* 參數會直接拒絕，不覆寫。"));
  assert.ok(en.includes("They are kept verbatim first, with UTM parameters appended; if it already contains a utm_* parameter the build is rejected instead of overwriting it."));
  assert.ok(zh.includes("這會縮短網址或追蹤成效嗎？"));
  assert.ok(en.includes("Does this shorten the URL or track performance?"));
  assert.ok(zh.includes("不會，只產生連結；不發送請求、不縮短、不記錄。"));
  assert.ok(en.includes("No, it only builds the link; it sends no request, shortens nothing and records nothing."));
  assert.ok(zh.includes("範本會改掉我填的活動名稱嗎？"));
  assert.ok(en.includes("Does a preset overwrite my campaign name?"));
  assert.ok(zh.includes("不會，範本只填 source 與 medium、清空 term 與 content，campaign 保持原值。"));
  assert.ok(en.includes("No, a preset only fills source and medium and clears term and content; campaign is left untouched."));
});

test("both pages state the pinned encoding and merging rules", () => {
  assert.ok(zh.includes("空格一律編為 %20，絕不用 +"));
  assert.ok(en.includes("a space is always %20, never +"));
  assert.ok(zh.includes("不編碼的字元僅限 A–Z a–z 0–9 - _ . ! ~ * ' ( )"));
  assert.ok(en.includes("the only unencoded characters are A–Z a–z 0–9 - _ . ! ~ * ' ( )"));
  assert.ok(zh.includes("值內的 % 不先解碼，直接編為 %25"));
  assert.ok(en.includes("a % in a value is encoded as %25 without pre-decoding"));
  assert.ok(zh.includes("既有查詢字串原樣保留在前"));
  assert.ok(en.includes("An existing query string is kept verbatim first"));
  assert.ok(zh.includes("既有 fragment 原樣保留在 UTM 參數之後"));
  assert.ok(en.includes("An existing fragment is kept verbatim after the UTM parameters"));
  assert.ok(zh.includes("目標網址已含任何 utm_* 參數時直接拒絕，不覆寫"));
  assert.ok(en.includes("A target URL that already contains any utm_* parameter is rejected, never overwritten"));
});
