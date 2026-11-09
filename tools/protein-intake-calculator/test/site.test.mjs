// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links, same-language
// home links, the pinned nutrition disclaimer (verbatim, in the results
// area), the pinned FAQ answers, the draft-loss note, all form control
// and error-slot ids, all seven goal options, and the download button.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "蛋白質攝取量計算機｜Gloss Tools",
    description: "依體重與活動目標，用固定的 g/kg 係數表算出每日蛋白質目標、±0.2 區間與每餐分配。",
    h1: "蛋白質攝取量計算機",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    resultsHeading: "每日目標與每餐分配",
    disclaimer:
      "本工具提供一般營養資訊，非醫療建議；如有腎臟疾病、懷孕或其他健康狀況，請先諮詢醫師或營養師。",
    faq: [
      "每日目標是體重乘上所選係數，區間是係數上下各 0.2 g/kg 分別計算的結果。",
      "每日目標平均分到各餐，除不盡的餘數依序加到前面的餐次，所以每餐合計剛好等於每日目標。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "Protein Intake Calculator | Gloss Tools",
    description:
      "Estimate daily protein grams from body weight and an activity goal using pinned g/kg factors, with a ±0.2 range and per-meal splits.",
    h1: "Protein Intake Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    resultsHeading: "Daily target and per-meal split",
    disclaimer:
      "This tool provides general nutrition information, not medical advice. If you have kidney disease, are pregnant, or have other health conditions, consult a physician or dietitian first.",
    faq: [
      "The daily target is body weight times the chosen factor; the range recomputes at the factor minus and plus 0.2 g/kg.",
      "The daily target is divided evenly; any remainder is added one gram at a time to the earliest meals, so the meals always sum to the daily target.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
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
    assert.ok(html.includes(page.disclaimer), "pinned nutrition disclaimer");
    for (const text of page.faq) assert.ok(html.includes(text), `FAQ: ${text}`);
    for (const id of [
      "protein-form",
      "field-weight",
      "field-goal",
      "field-customFactor",
      "field-meals-3",
      "field-meals-4",
      "error-weight",
      "error-goal",
      "error-customFactor",
      "error-meals",
      "status",
      "summary",
      "meal-rows",
      "run-btn",
      "example-btn",
      "reset-btn",
      "cancel-btn",
      "download-btn",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    }
    for (const value of [
      "sedentary",
      "general",
      "regular-exercise",
      "strength-training",
      "high-intensity",
      "fat-loss",
      "custom",
    ]) {
      assert.ok(html.includes(`value="${value}"`), `missing goal option ${value}`);
    }
  });
}
