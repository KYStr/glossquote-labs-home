// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links, same-language
// home links, the fixed disclaimer (both language halves), the pinned
// FAQ answers, the draft-loss note, and all form control and error-slot
// ids. The SPEC gives this tool no download or copy button.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "心率區間計算機｜Gloss Tools",
    description:
      "輸入年齡與靜止心率，用 Tanaka 公式估算最大心率，算出五個心率區間與 Karvonen 儲備心率區間。估算值因人而異，非醫療建議。",
    h1: "心率區間計算機",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    resultsHeading: "最大心率摘要",
    disclaimer:
      "本工具以公式估算最大心率，個人實際值可能不同；結果僅供運動參考，不是醫療建議。如有心血管疾病或身體不適，請先諮詢醫師。",
    faq: [
      "Fox（220 − 年齡）較舊、誤差較大；Tanaka（208 − 0.7 × 年齡）來自較新的研究，本工具以 Tanaka 計算區間，Fox 僅供對照。",
      "填入「實測最大心率」後會優先於公式估算，兩張區間表都改以實測值計算，年齡可不填。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "Heart Rate Zones Calculator | Gloss Tools",
    description:
      "Estimate maximum heart rate with the Tanaka formula and get five heart-rate zones plus Karvonen reserve zones from your age and resting heart rate. Estimates vary by person; not medical advice.",
    h1: "Heart Rate Zones Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    resultsHeading: "Maximum heart rate summary",
    disclaimer:
      "Maximum heart rate here is a formula estimate; your actual value may differ. Results are for exercise reference only and are not medical advice. If you have a cardiovascular condition or feel unwell, consult a doctor first.",
    faq: [
      "The Fox formula (220 − age) is older and less accurate; the Tanaka formula (208 − 0.7 × age) comes from newer research. This tool calculates zones with Tanaka and shows Fox for comparison only.",
      "Enter it as the measured maximum heart rate; it takes precedence over the formula estimates, both zone tables are calculated from it, and age may be left blank.",
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
    assert.ok(html.includes(page.disclaimer), "fixed disclaimer text");
    for (const text of page.faq) assert.ok(html.includes(text), `FAQ: ${text}`);
    for (const id of [
      "field-age",
      "field-measuredMaxHr",
      "field-restingHr",
      "error-age",
      "error-measuredMaxHr",
      "error-restingHr",
      "status",
      "summary-rows",
      "zone-rows",
      "karvonen-rows",
      "karvonen-missing",
      "run-btn",
      "example-btn",
      "reset-btn",
      "cancel-btn",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    }
    // The SPEC gives this tool no download or copy button: the only
    // buttons are the four pinned actions.
    for (const id of ["run-btn", "example-btn", "reset-btn", "cancel-btn"]) {
      assert.ok(html.includes(`id="${id}"`), `action button ${id}`);
    }
    assert.ok(!html.includes("<a download"), "no download link artifact");
  });
}
