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
  assert.ok(zh.includes("<title>網址 slug 產生器｜Gloss Tools</title>"));
  assert.ok(zh.includes("<h1>網址 slug 產生器</h1>"));
  assert.ok(
    zh.includes(
      'content="輸入文章標題，產生小寫、連字號分隔的網址 slug：去重音、轉寫與長度上限規則皆已釘版。"'
    )
  );
});

test("en page identity", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>URL Slug Generator | Gloss Tools</title>"));
  assert.ok(en.includes("<h1>URL Slug Generator</h1>"));
  assert.ok(
    en.includes(
      'content="Turn a title into a lowercase, hyphenated, URL-friendly slug: accent folding, transliteration and the length cap are pinned."'
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
      "input-title",
      "input-maxlength",
      "btn-run",
      "btn-example",
      "btn-copy",
      "btn-cancel",
      "btn-reset",
      "btn-download",
      "status",
      "result",
      "result-sentence",
      "result-slug",
      "result-length",
      "result-maxlength",
      "result-truncated",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
    }
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-live="polite"'));
  }
});

test("both pages carry the fixed disclaimer and the SPEC FAQs", () => {
  assert.ok(zh.includes("本工具只轉換你輸入的標題文字，不檢查 slug 是否已被網站使用，也不會上傳或儲存你的標題。"));
  assert.ok(en.includes("This tool only converts the title you type. It does not check whether the slug is already in use, and it never uploads or stores your title."));
  assert.ok(zh.includes("中文標題會變成拼音嗎？"));
  assert.ok(en.includes("Are Chinese titles converted to pinyin?"));
  assert.ok(zh.includes("不會，中文字元視為分隔字元捨棄；純中文標題會回錯誤，請補拉丁字母或數字。"));
  assert.ok(en.includes("No, Chinese characters are treated as separators and dropped; a title with only Chinese characters returns an error, so add Latin letters or digits."));
  assert.ok(zh.includes("底線會保留嗎？"));
  assert.ok(en.includes("Are underscores kept?"));
  assert.ok(zh.includes("不會，底線是分隔字元，會變成連字號。"));
  assert.ok(en.includes("No, underscores are separators and become hyphens."));
  assert.ok(zh.includes("slug 會超過長度上限嗎？"));
  assert.ok(en.includes("Can the slug exceed the length cap?"));
  assert.ok(zh.includes("不會，超過時截斷並去除截斷後尾端的連字號。"));
  assert.ok(en.includes("No, it is truncated and any trailing hyphen left by truncation is removed."));
  assert.ok(zh.includes("這會檢查 slug 有沒有被用過嗎？"));
  assert.ok(en.includes("Does this check whether the slug is already in use?"));
  assert.ok(zh.includes("不會，只轉換文字；是否重複請在你的網站後台確認。"));
  assert.ok(en.includes("No, it only converts the text; check duplicates in your own site admin."));
});

test("both pages state the pinned conversion rules", () => {
  assert.ok(zh.includes("NFKD 正規化"));
  assert.ok(en.includes("NFKD normalization"));
  assert.ok(zh.includes("æ→ae、œ→oe、ø→o、đ→d、ð→d、þ→th、ł→l、ß→ss"));
  assert.ok(en.includes("æ→ae, œ→oe, ø→o, đ→d, ð→d, þ→th, ł→l, ß→ss"));
  assert.ok(zh.includes("長度恰等於上限時不截斷"));
  assert.ok(en.includes("a slug exactly at the cap is not truncated"));
});
