// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links, same-language
// home links, the pinned FAQ answers, the verbatim nutrition note, the
// draft-loss note, all section headings, form control and error-slot ids,
// the five preset radios, and the download affordance.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "三大營養素分配計算機｜Gloss Tools",
    description:
      "輸入每日熱量目標與飲食比例（均衡、高蛋白、低碳、生酮或自訂），換算蛋白質、碳水化合物與脂肪的每日克數、回算熱量與每餐分配。",
    h1: "三大營養素分配計算機",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    headings: ["每日熱量目標與飲食比例", "自訂百分比與每餐分配", "每種營養素克數與回算熱量"],
    faq: [
      "克數回算的熱量為什麼和目標不完全相等？",
      "克數取整數克，最大營養素已按固定規則吸收捨入差，剩餘差額以回算差明示。",
      "熱量目標從哪裡來？",
      "由你輸入，本工具不計算熱量需求。",
    ],
    nutritionNote:
      "本工具依一般營養通則換算：蛋白質與碳水化合物每克 4 大卡、脂肪每克 9 大卡。結果僅供一般飲食規劃參考，不構成醫療或營養處方；有疾病、懷孕或特殊飲食需求時，請諮詢醫師或營養師。",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    downloadLabel: "下載報告",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "Macro Split Calculator | Gloss Tools",
    description:
      "Turn a daily calorie target and a diet ratio (balanced, high-protein, low-carb, keto or custom) into grams of protein, carbs and fat, with implied calories and an optional per-meal split.",
    h1: "Macro Split Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    headings: [
      "Daily calorie target and diet preset",
      "Custom percentages and per-meal split",
      "Grams per macro and implied calories",
    ],
    faq: [
      "Why doesn't the implied total match the target exactly?",
      "Grams are whole numbers; the largest macro absorbs the rounding drift by a fixed rule and any remaining difference is shown.",
      "Where does the calorie target come from?",
      "You enter it; this tool does not estimate calorie needs.",
    ],
    nutritionNote:
      "This tool uses the general nutrition conversion of 4 kcal per gram of protein and carbohydrate and 9 kcal per gram of fat. Results are general dietary-planning information only, not medical or nutrition advice; consult a physician or dietitian if you have a medical condition, are pregnant, or have special dietary needs.",
    draftNote: "Switching language or leaving this page discards the current draft.",
    downloadLabel: "Download report",
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
    assert.ok(html.includes(page.nutritionNote), "verbatim nutrition note");
    for (const heading of page.headings) assert.ok(html.includes(heading), `heading: ${heading}`);
    for (const text of page.faq) assert.ok(html.includes(text), `FAQ: ${text}`);
    assert.ok(html.includes(page.downloadLabel), "download affordance");
    for (const id of [
      "macro-form",
      "field-calories",
      "field-preset-balanced",
      "field-preset-high-protein",
      "field-preset-low-carb",
      "field-preset-keto",
      "field-preset-custom",
      "field-proteinPct",
      "field-carbsPct",
      "field-fatPct",
      "field-meals",
      "error-calories",
      "error-preset",
      "error-proteinPct",
      "error-carbsPct",
      "error-fatPct",
      "error-meals",
      "status",
      "summary",
      "macro-rows",
      "meal-rows",
      "run-btn",
      "example-btn",
      "reset-btn",
      "cancel-btn",
      "download-btn",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    }
    for (const preset of ["balanced", "high-protein", "low-carb", "keto", "custom"]) {
      assert.ok(html.includes(`value="${preset}"`), `missing preset ${preset}`);
    }
  });
}
