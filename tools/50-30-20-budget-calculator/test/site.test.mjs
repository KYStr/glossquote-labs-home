// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links, same-language
// home links, the pinned FAQ answers, the verbatim disclaimer, the
// draft-loss note, all section headings, form control and error-slot ids,
// and the download affordance.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "50/30/20 預算分配｜Gloss Tools",
    description:
      "輸入稅後月收入，按需求 50%、想要 30%、儲蓄／還債 20% 分配，填入實際支出對照目標看差異。",
    h1: "50/30/20 預算分配",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    headings: ["稅後月收入與三類比例", "三類比例（%）", "實際支出（選填，元）", "每類分配金額"],
    faq: [
      "收入要用稅前還是稅後？",
      "用稅後實領金額，比例是對稅後收入算的。",
      "債務最低應繳金額算哪一類？",
      "算需求；高於最低應繳的額外還款算儲蓄／還債。",
      "比例一定要 50/30/20 嗎？",
      "不用，可以自訂，但三類合計必須是 100。",
      "需求超過 50% 怎麼辦？",
      "先檢視固定支出，比例是起點不是鐵律；長期超過 50% 代表財務緩衝較薄。",
      "這個工具會給我理財建議嗎？",
      "不會，只做算術分配與差異對照。",
    ],
    disclaimerNote: "本工具僅做算術分配與差異對照，不是理財、投資或稅務建議。",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    downloadLabel: "下載報告",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "50-30-20 Budget Calculator | Gloss Tools",
    description:
      "Split monthly after-tax income into 50% needs, 30% wants and 20% savings, then compare actual spending with the targets.",
    h1: "50-30-20 Budget Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    headings: [
      "Monthly after-tax income and percentages",
      "Percentages (%)",
      "Actual spending (optional)",
      "Allocation per category",
    ],
    faq: [
      "Should I use gross or take-home pay?",
      "Use take-home pay after tax; the percentages apply to after-tax income.",
      "Where do minimum debt payments go?",
      "Minimum payments count as needs; anything above the minimum counts as savings and debt repayment.",
      "Must the split be exactly 50/30/20?",
      "No, you can customize it, but the three percentages must add up to 100.",
      "What if needs exceed 50%?",
      "Review fixed costs first; the split is a starting point, not a hard rule, and staying above 50% for long leaves less buffer.",
      "Does this tool give financial advice?",
      "No, it only calculates allocations and variances.",
    ],
    disclaimerNote:
      "This tool only calculates allocations and variances. It is not financial, investment, or tax advice.",
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
    assert.ok(html.includes(page.disclaimerNote), "verbatim disclaimer");
    for (const heading of page.headings) assert.ok(html.includes(heading), `heading: ${heading}`);
    for (const text of page.faq) assert.ok(html.includes(text), `FAQ: ${text}`);
    assert.ok(html.includes(page.downloadLabel), "download affordance");
    for (const id of [
      "budget-form",
      "field-income",
      "field-needsPct",
      "field-wantsPct",
      "field-savingsPct",
      "field-actualNeeds",
      "field-actualWants",
      "field-actualSavings",
      "error-income",
      "error-needsPct",
      "error-wantsPct",
      "error-savingsPct",
      "error-actualNeeds",
      "error-actualWants",
      "error-actualSavings",
      "status",
      "summary",
      "allocation-rows",
      "variance-block",
      "variance-rows",
      "totals-block",
      "totals",
      "advice",
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
