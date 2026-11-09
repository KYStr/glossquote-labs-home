// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links, same-language
// home links, the fixed estimate note (both language halves), the
// pinned FAQ answers, the fixed per-option addition hints, the
// draft-loss note, and all form control and error-slot ids. This tool
// has a fixed report download, shown only on success.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "搬家紙箱估算｜Gloss Tools",
    description: "依住宅型態與生活習慣，估算搬家要買的小、中、大紙箱數量，以及膠帶和包裝紙的捲數。",
    h1: "搬家紙箱估算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    resultsHeading: "需要的紙箱與耗材",
    estimateNote:
      "這是依一般家庭物品量推估的參考值，實際數量會因每戶物品多寡而不同；建議寧可多備幾箱，也不要買太少。",
    faq: [
      "小箱裝書和重物，中箱裝一般雜物，大箱裝衣物、寢具等輕而蓬鬆的物品。",
      "住越久累積的物品通常越多，這個開關把小計上調 20%，無條件進位，上調的箱數全算中箱；東西少可以關掉。",
    ],
    hints: ["+8 小箱", "+6 中箱", "+5 中箱", "+4 小箱"],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "Moving Box Estimator | Gloss Tools",
    description:
      "Estimate how many small, medium and large moving boxes to buy for your home type and habits, plus the tape and packing-paper rolls to go with them.",
    h1: "Moving Box Estimator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    resultsHeading: "Boxes and supplies you need",
    estimateNote:
      "This is a rough estimate for a typical household. Actual needs vary from home to home, so keep a few spare boxes rather than too few.",
    faq: [
      "Small boxes are for books and heavy items, medium for general household goods, and large for light, bulky items like clothes and bedding.",
      "Homes accumulate belongings over time, so this option raises the subtotal by 20%, rounded up, with the extra boxes counted as medium. Turn it off if you own less than typical.",
    ],
    hints: ["+8 small boxes", "+6 medium boxes", "+5 medium boxes", "+4 small boxes"],
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
    assert.ok(html.includes(page.estimateNote), "fixed estimate note");
    for (const text of page.faq) assert.ok(html.includes(text), `FAQ: ${text}`);
    for (const text of page.hints) assert.ok(html.includes(text), `hint: ${text}`);
    for (const id of [
      "field-homeType",
      "field-manyBooks",
      "field-largeKitchen",
      "field-manyClothes",
      "field-fragileItems",
      "field-livedOver5Years",
      "error-homeType",
      "status",
      "summary-total",
      "result-rows",
      "run-btn",
      "example-btn",
      "reset-btn",
      "cancel-btn",
      "download-btn",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    }
    // Five home-type radios, one per pinned enum value.
    for (const value of ["studio", "one-bedroom", "two-bedroom", "three-bedroom", "four-bedroom"]) {
      assert.ok(html.includes(`value="${value}"`), `missing home type ${value}`);
    }
  });
}
