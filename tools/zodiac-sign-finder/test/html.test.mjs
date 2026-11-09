// Static HTML contract tests for both language pages. Expected values
// come from the SPEC's two-language section (lang, title, description,
// H1, FAQ wording) and the SPEC's candidate rule: robots noindex and
// NO production canonical/hreflang in the preview candidate.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const TOOL_ROOT = fileURLToPath(new URL("..", import.meta.url));

const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "西洋星座查詢｜Gloss Tools",
    description:
      "輸入出生月日，依固定的熱帶黃道日期表查出西洋星座、符號、元素與模式；交界首末日附提示，年份選填只驗證日期存在、不影響結果。",
    h1: "西洋星座查詢",
    homeHref: "../../",
    otherHref: "en/index.html",
    script: "js/app.js",
    style: "styles/app.css",
    yearHint: "年份選填，只用來檢查日期是否存在，不影響星座。",
    faqSnippets: [
      "雙魚座。年份只用來檢查日期是否存在；不填年份時 2 月 29 日也視為有效。",
      "實際交界時刻隨年份略有不同，本工具使用固定日期表，並在每個星座的首日與末日附上提示。",
    ],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Zodiac Sign Finder | Gloss Tools",
    description:
      "Enter a birth month and day to look up the Western zodiac sign, symbol, element and modality in a fixed tropical date table. Cusp days are flagged, and the optional year only validates that the date exists — it never changes the sign.",
    h1: "Zodiac Sign Finder",
    homeHref: "../../en/",
    otherHref: "../index.html",
    script: "../js/app.js",
    style: "../styles/app.css",
    yearHint: "The year is optional. It only checks that the date exists and never changes the sign.",
    faqSnippets: [
      "Pisces. The year only checks that the date exists; with no year given, Feb 29 is accepted.",
      "The exact ingress moment varies slightly by year; this tool uses a fixed date table and flags each sign's first and last day.",
    ],
  },
];

for (const page of PAGES) {
  test(`HTML ${page.path}: bilingual metadata and links`, async () => {
    const html = await readFile(`${TOOL_ROOT}/${page.path}`, "utf8");
    assert.ok(html.includes(`<html lang="${page.lang}">`), "lang");
    assert.ok(html.includes(`<title>${page.title}</title>`), "title");
    assert.ok(
      html.includes(`<meta name="description" content="${page.description}">`),
      "description",
    );
    assert.ok(html.includes(`<h1>${page.h1}</h1>`), "h1");
    assert.ok(html.includes('content="noindex, nofollow"'), "robots noindex");
    assert.ok(!html.includes('<link rel="canonical"'), "no canonical in candidate");
    assert.ok(!html.includes("hreflang"), "no hreflang in candidate");
    assert.ok(html.includes(`href="${page.homeHref}"`), "home link");
    assert.ok(html.includes(`href="${page.otherHref}"`), "language link");
    assert.ok(html.includes(`src="${page.script}"`), "app script");
    assert.ok(html.includes(`href="${page.style}"`), "stylesheet");
    assert.ok(html.includes('for="month-input"'), "month label");
    assert.ok(html.includes('for="day-input"'), "day label");
    assert.ok(html.includes('for="year-input"'), "year label");
    assert.ok(html.includes(page.yearHint), "pinned year hint");
    for (const snippet of page.faqSnippets) {
      assert.ok(html.includes(snippet), `FAQ snippet: ${snippet.slice(0, 24)}…`);
    }
    assert.ok(!/ on\w+=/i.test(html), "no inline event handlers");
    assert.ok(!html.includes("http://") && !html.includes("https://"), "no absolute URLs");
  });
}
