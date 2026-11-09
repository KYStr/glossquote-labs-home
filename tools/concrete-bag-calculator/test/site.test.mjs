// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links,
// same-language home links, the pinned FAQ answers, the fixed results
// note, the draft-loss note, and all form control and error-slot ids.
// The SPEC gives this tool no download or export artifact.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "混凝土用量計算機｜Gloss Tools",
    description:
      "輸入平板、條形基礎或圓柱的尺寸、數量與損耗率，算出混凝土體積（m³ 與 yd³）與 40／60／80 lb 預拌袋裝的需要包數。",
    h1: "混凝土用量計算機",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    resultsHeading: "體積與袋數",
    note: "袋數以未捨入的含損耗體積計算並無條件進位到整包。結果是採購估算，不是結構設計；實際用量受現場整平與厚度誤差影響。",
    faq: [
      "先加在總體積上，再換算三種袋數；袋數本身不再另加損耗。",
      "不是，這是依廠商公布的每包約略產量換算的採購估算，實際用量受現場整平與厚度誤差影響。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "Concrete Bag Calculator | Gloss Tools",
    description:
      "Enter slab, strip footing or cylinder dimensions, count and waste allowance to get concrete volume in m³ and yd³ plus the premix bags needed in 40, 60 and 80 lb bag sizes.",
    h1: "Concrete Bag Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    resultsHeading: "Volume and bags",
    note: "Bag counts are computed from the unrounded waste-adjusted volume and rounded up to whole bags. The result is a purchasing estimate, not a structural design; site grading and thickness variation change actual usage.",
    faq: [
      "It is added once to the total volume before converting to bags; the bag counts get no second allowance.",
      "No. They are a purchasing estimate converted from the manufacturers' published per-bag yields; site grading and thickness variation change actual usage.",
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
    assert.ok(html.includes(page.note), "fixed results note");
    for (const text of page.faq) assert.ok(html.includes(text), `FAQ: ${text}`);
    for (const id of [
      "concrete-form",
      "shape-group",
      "field-shape-slab",
      "field-shape-footing",
      "field-shape-cylinder",
      "field-lengthCm",
      "field-widthCm",
      "field-thicknessCm",
      "field-depthCm",
      "field-diameterCm",
      "field-heightCm",
      "field-count",
      "field-wastePct",
      "error-shape",
      "error-lengthCm",
      "error-widthCm",
      "error-thicknessCm",
      "error-depthCm",
      "error-diameterCm",
      "error-heightCm",
      "error-count",
      "error-wastePct",
      "status",
      "summary-rows",
      "bag-rows",
      "run-btn",
      "example-btn",
      "reset-btn",
      "cancel-btn",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    }
    assert.ok(!html.includes("<a download"), "no download link artifact");
  });
}
