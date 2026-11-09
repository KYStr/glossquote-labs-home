// Page tests: both static entries carry the SPEC-pinned metadata
// (language, title, description, h1), the candidate preview rules
// (noindex, no canonical/hreflang, relative language links only,
// same-language home links), the pinned rule-of-thumb note and FAQ
// answers, and every element id the app wires.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const IDS = [
  "calc-form",
  "species",
  "size",
  "size-cat-note",
  "years",
  "months",
  "run-btn",
  "example-btn",
  "cancel-btn",
  "reset-btn",
  "example-note",
  "status",
  "results",
  "result-human-years",
  "result-stage",
  "result-total-months",
  "result-segments",
  "error-species",
  "error-size",
  "error-years",
  "error-months",
];

const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "寵物年齡換算｜Gloss Tools",
    description:
      "把狗狗或貓咪的年齡換算成人類等效年齡：第一年 15 歲、第二年再加 9 歲，之後依物種與體型逐年增加，並標示生命階段。",
    h1: "寵物年齡換算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    ruleNote:
      "經驗法則提醒：坊間「乘以 7」的算法不符合本分段模型——光是第一年就相當於人類 15 歲。請以分段計算結果為準，本結果僅供日常參考，不是獸醫建議。",
    faqAnswer: "未滿一年的部分，在目前所在的段內按比例線性折算，例如中型犬 3 歲 6 個月，第三段只算半年。",
    catNote: "貓不需要選體型",
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Pet Age Converter | Gloss Tools",
    description:
      "Convert a dog's or cat's age to human-equivalent years with a pinned piecewise model: 15 for the first year, +9 for the second, then a per-year increment by species and size, plus a life-stage label.",
    h1: "Pet Age Converter",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    ruleNote:
      "Rule-of-thumb note: the popular 'multiply by 7' shortcut does not match this piecewise model — the first year alone equals 15 human years. Treat the result as an everyday reference, not veterinary advice.",
    faqAnswer:
      "A partial year is prorated linearly inside its current segment — a 3-year-6-month medium dog accrues only half of the third segment's year.",
    catNote: "Cats do not need a size",
  },
];

for (const page of PAGES) {
  test(`page ${page.path}: pinned metadata and candidate rules`, async () => {
    const html = await readFile(resolve(PROJECT_ROOT, page.path), "utf8");
    assert.ok(html.includes(`<html lang="${page.lang}">`));
    assert.ok(html.includes(`<title>${page.title}</title>`));
    assert.ok(html.includes(`<meta name="description" content="${page.description}">`));
    assert.ok(html.includes(`<h1>${page.h1}</h1>`));
    assert.ok(html.includes('content="noindex, nofollow"'));
    assert.ok(!html.includes("canonical"));
    assert.ok(!html.includes("hreflang"));
    assert.ok(html.includes(page.langLink));
    assert.ok(html.includes(page.home));
    assert.ok(html.includes(page.ruleNote));
    assert.ok(html.includes(page.faqAnswer));
    assert.ok(html.includes(page.catNote));
    for (const id of IDS) {
      assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    }
  });
}
