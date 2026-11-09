// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links, same-language
// home links, the pinned FAQ answers, the draft-loss note, all form
// control and error-slot ids, and the seven ratio preset buttons.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "手沖咖啡沖煮比例｜Gloss Tools",
    description:
      "輸入咖啡粉量或總水量與沖煮比例，算出另一邊的量、悶蒸水量，以及悶蒸加三段注水的累計目標。",
    h1: "手沖咖啡沖煮比例",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    resultsHeading: "粉量、水量與分段注水",
    faq: [
      "每 1 克咖啡粉對 15 克水；本工具以 1 ml 水 ≈ 1 克計。",
      "粉量 × 悶蒸倍數，預設 2 倍，可改 0–5 倍。",
      "悶蒸後剩餘水量三等分，尾數以 0.1 ml 為單位補給較早的段，最後一段累計必等於總水量。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "Coffee Brew Ratio Calculator | Gloss Tools",
    description:
      "Enter a coffee dose or total water with a brew ratio to get the other amount, bloom water, and a four-step pour schedule with cumulative targets.",
    h1: "Coffee Brew Ratio Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    resultsHeading: "Dose, water and pour schedule",
    faq: [
      "1 g of coffee to 15 g of water; this tool treats 1 ml of water as 1 g.",
      "Dose × the bloom multiplier (default 2×, adjustable from 0 to 5×).",
      "The water left after blooming is split into three equal pours; leftover 0.1 ml units go to the earlier pours, so the final cumulative target equals the total exactly.",
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
    for (const text of page.faq) assert.ok(html.includes(text), `FAQ: ${text}`);
    for (const id of [
      "field-mode-dose",
      "field-mode-water",
      "field-amount",
      "field-ratio",
      "field-bloomMultiplier",
      "error-mode",
      "error-amount",
      "error-ratio",
      "error-bloomMultiplier",
      "status",
      "summary",
      "step-rows",
      "run-btn",
      "example-btn",
      "reset-btn",
      "cancel-btn",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    }
    for (const preset of [12, 13, 14, 15, 16, 17, 18]) {
      assert.ok(html.includes(`data-ratio-preset="${preset}"`), `missing preset ${preset}`);
    }
    assert.ok(!html.includes("download"), "this tool has no download artifact");
  });
}
