// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links,
// same-language home links, the fixed boundary disclosure in the
// results area, the SPEC-pinned FAQ answers, the draft-loss note, the
// as-of scope note beside its field, and all form control and
// error-slot ids, including the download button the SPEC pins.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "農曆生肖查詢｜Gloss Tools",
    description: "輸入國曆出生日期，以農曆春節為交界查正確生肖、干支與生肖年起訖，並判讀本命年；附 1960–2035 年春節日期表。",
    h1: "農曆生肖查詢",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    resultsHeading: "生肖結果",
    modelNote: "本工具以農曆正月初一（春節）為生肖交界；八字命理以立春交界者，結果可能不同。",
    faq: [
      "生肖年不是從 1 月 1 日開始，而是從農曆正月初一（春節）開始",
      "每 12 年一次",
      "八字命理以立春（約 2 月 4 日）為年界",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    asOfHelp: "選填。填了才判讀本命年與下一個本命年",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "Chinese Zodiac Calculator | Gloss Tools",
    description:
      "Find your Chinese zodiac sign from a Gregorian birth date using the Chinese New Year boundary, with the zodiac year's start and end dates and your Ben Ming Nian.",
    h1: "Chinese Zodiac Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    resultsHeading: "Zodiac result",
    modelNote:
      "This tool switches the zodiac year at Chinese New Year (lunar 1/1); BaZi traditions that switch at Li Chun may differ.",
    faq: [
      "the zodiac year starts at Chinese New Year (lunar 1/1), not on January 1",
      "it comes around every 12 years",
      "BaZi switches the year at Li Chun (around February 4)",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    asOfHelp: "Optional. Fill it in to check Ben Ming Nian and the next one",
  },
];

for (const page of PAGES) {
  test(`page metadata and structure (${page.lang})`, async () => {
    const html = await readFile(page.path, "utf8");
    assert.ok(html.includes(`<html lang="${page.lang}">`));
    assert.ok(html.includes('content="noindex, nofollow"'));
    assert.ok(!html.includes("canonical"), "candidate must not carry a canonical link");
    assert.ok(!html.includes("hreflang"), "candidate must not carry hreflang");
    assert.ok(html.includes(`<title>${page.title}</title>`));
    assert.ok(html.includes(`<meta name="description" content="${page.description}">`));
    assert.ok(html.includes(`<h1>${page.h1}</h1>`));
    assert.ok(html.includes(page.langLink), "relative language link");
    assert.ok(html.includes(page.home), "same-language home link");
    assert.ok(html.includes(page.draftNote), "draft-loss note");
    assert.ok(html.includes(page.resultsHeading), "results heading");
    assert.ok(html.includes(page.modelNote), "fixed boundary disclosure");
    assert.ok(html.includes(page.asOfHelp), "as-of scope note beside the field");
    for (const text of page.faq) assert.ok(html.includes(text), `FAQ: ${text}`);
    for (const id of [
      "field-birthDate",
      "field-asOfDate",
      "error-birthDate",
      "error-asOfDate",
      "status",
      "result-headline",
      "summary-rows",
      "cny-table-body",
      "run-btn",
      "example-btn",
      "reset-btn",
      "cancel-btn",
      "download-btn",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    }
  });
}
