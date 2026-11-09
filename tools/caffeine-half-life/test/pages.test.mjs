// Page tests: both static entries carry the SPEC-pinned metadata
// (language, title, description, h1), the candidate preview rules
// (noindex, no canonical/hreflang, relative language links only,
// same-language home links), the pinned result disclaimer and FAQ
// answers, and every element id the app wires.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const IDS = [
  "calc-form",
  "entry-rows",
  "add-entry-btn",
  "half-life",
  "query-time",
  "bedtime",
  "run-btn",
  "example-btn",
  "cancel-btn",
  "reset-btn",
  "status",
  "results",
  "result-entries",
  "result-series",
  "result-bedtime",
];

const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "咖啡因代謝計算機｜Gloss Tools",
    description:
      "輸入今天喝下的咖啡、茶或能量飲料的時間與咖啡因量，用你設定的半衰期估算查詢時間與就寢時體內還剩多少咖啡因。",
    h1: "咖啡因代謝計算機",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    disclaimer: "半衰期因人而異（約 3–8 小時），本工具以你設定的半衰期估算，數值僅供參考，不是醫療建議。",
    faqAnswer: "在那杯之前它不計入；之後的小時數列會在它的時間過後開始計入。",
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Caffeine Half-Life Calculator | Gloss Tools",
    description:
      "Enter when you had each coffee, tea or energy drink and estimate how much caffeine remains at a query time and at bedtime, using a half-life you choose.",
    h1: "Caffeine Half-Life Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    disclaimer:
      "Half-life varies by person (roughly 3–8 hours). This tool estimates with the half-life you set; values are for reference only and are not medical advice.",
    faqAnswer:
      "It contributes nothing before its intake time; the hourly series starts counting it once its time passes.",
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
    assert.ok(html.includes(page.disclaimer));
    assert.ok(html.includes(page.faqAnswer));
    for (const id of IDS) {
      assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    }
  });
}
