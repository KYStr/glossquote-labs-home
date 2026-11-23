// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links,
// same-language home links, the estimate statement in both the input
// and results areas, the pinned FAQ answers, the results heading, and
// all form control and error-slot ids.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "登山時間預估｜Gloss Tools",
    description:
      "輸入距離與爬升，用 Naismith's rule 估算登山移動時間，含下降調整、平均配速與等效平路距離。",
    h1: "登山時間預估",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    resultsHeading: "預估移動時間與分段耗時",
    estimateNote:
      "移動時間估算，不含休息；Naismith's rule 假設體能良好、路況正常。",
    faq: [
      "不含，這是移動時間；請自行另加休息。",
      "陡降按 Langmuir 修正每 300 m 加 10 分鐘；緩降才減時間。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "Hiking Time Estimator | Gloss Tools",
    description:
      "Estimate hiking moving time from distance and ascent with Naismith's rule, including descent adjustment, average pace and equivalent flat distance.",
    h1: "Hiking Time Estimator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    resultsHeading: "Estimated moving time and segment times",
    estimateNote:
      "Moving-time estimate only, excluding breaks; Naismith's rule assumes reasonable fitness and normal conditions.",
    faq: [
      "No, this is moving time only; add breaks separately.",
      "The Langmuir correction adds 10 minutes per 300 m on steep descents; only gentle descents save time.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
  },
];

const FIELD_IDS = ["field-distanceKm", "field-ascentM", "field-descentM", "field-descentType"];
const ERROR_IDS = ["error-distanceKm", "error-ascentM", "error-descentM", "error-descentType"];

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
    assert.ok(html.includes(page.draftNote));
    const noteCount = html.split(page.estimateNote).length - 1;
    assert.ok(noteCount >= 2, "estimate statement appears in input and results areas");
    assert.ok(html.includes(page.resultsHeading), "results heading");
    for (const text of page.faq) {
      assert.ok(html.includes(text), `FAQ text: ${text.slice(0, 24)}`);
    }
    for (const id of FIELD_IDS) {
      assert.ok(html.includes(`id="${id}"`), `input ${id}`);
    }
    for (const id of ERROR_IDS) {
      assert.ok(html.includes(`id="${id}"`), `error slot ${id}`);
    }
    assert.ok(html.includes('id="download-btn"'), "download button exists");
    assert.ok(html.includes('id="details-list"'), "details list exists");
  });
}
