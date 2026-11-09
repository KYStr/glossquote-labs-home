// Static HTML contract tests for both language pages. Expected values
// come from the SPEC's two-language section (lang, title, description,
// H1) and the house format (noindex, relative canonical/hreflang,
// same-language home links, local assets only).

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const TOOL_ROOT = fileURLToPath(new URL("..", import.meta.url));

const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "SemVer 版本順位比較｜Gloss Tools",
    description:
      "工程師面對兩個發布版本及 prerelease 標籤時，需要核對哪個順位在先、差異出在哪一個識別符。",
    h1: "SemVer 版本順位比較",
    homeHref: "../../",
    otherHref: "en/index.html",
    script: "js/app.js",
    style: "styles/app.css",
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "SemVer Precedence Comparison | Gloss Tools",
    description:
      "Compare two Semantic Versioning 2.0.0 identifiers and see the first field that decides their precedence.",
    h1: "SemVer Precedence Comparison",
    homeHref: "../../en/",
    otherHref: "../index.html",
    script: "../js/app.js",
    style: "../styles/app.css",
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
    assert.ok(html.includes('<link rel="canonical"'), "canonical");
    assert.ok(html.includes('hreflang="zh-Hant"'), "hreflang zh-Hant");
    assert.ok(html.includes('hreflang="en"'), "hreflang en");
    assert.ok(html.includes('hreflang="x-default"'), "hreflang x-default");
    assert.ok(html.includes(`href="${page.homeHref}"`), "home link");
    assert.ok(html.includes(`href="${page.otherHref}"`), "language link");
    assert.ok(html.includes(`src="${page.script}"`), "app script");
    assert.ok(html.includes(`href="${page.style}"`), "stylesheet");
    assert.ok(html.includes('for="left-input"'), "left label");
    assert.ok(html.includes('for="right-input"'), "right label");
    assert.ok(html.includes('id="compare-button"'), "compare button");
    assert.ok(html.includes('id="download-button"'), "download button");
    assert.ok(!/ on\w+=/i.test(html), "no inline event handlers");
    assert.ok(!html.includes("http://") && !html.includes("https://"), "no absolute URLs");
    // The two FAQ answers from the SPEC are present in each language.
    assert.ok(html.includes("rc.10"), "FAQ rc.10");
    assert.ok(html.includes("build"), "FAQ build");
  });
}

test("HTML pages share the same element ids", async () => {
  const zh = await readFile(`${TOOL_ROOT}/public/index.html`, "utf8");
  const en = await readFile(`${TOOL_ROOT}/public/en/index.html`, "utf8");
  const ids = (html) => [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(ids(zh), ids(en));
});
