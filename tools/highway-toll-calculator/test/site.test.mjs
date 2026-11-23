// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links,
// same-language home links, the disclosure statement in both the input
// and results areas, the pinned FAQ answers, the results heading, and
// all form control and error-slot ids.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const INTERCHANGE_IDS = [
  "keelung",
  "xizhi",
  "neihu",
  "taipei",
  "wugu",
  "linkou",
  "taoyuan",
  "zhongli",
  "yangmei",
  "hukou",
  "taichung",
  "changhua",
  "tainan",
  "kaohsiung_end",
];

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "國道通行費試算｜Gloss Tools",
    description:
      "輸入里程或上下交流道，依台灣 ETC 計程收費規則試算國道通行費：每日 20 公里免費、200 公里以上長途 75 折、eTag 9 折。",
    h1: "國道通行費試算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    resultsHeading: "應繳通行費與分段明細",
    disclosure: "門架牌價合計 389.6 元",
    faq: [
      "不是，每車每日一次，依車號每日歸戶合併計算。",
      "預儲帳戶餘額足夠扣款，或在通行次日起第 3–5 日內自行繳費；先打折、再四捨五入到元。",
      "不適用。連假另行公告單一費率，取消 20 公里優惠與長途折扣；本工具只算平常日／一般假日費率。",
      "實際按門架牌價加總，本工具以交流道里程估算；實際扣款以遠通電收帳務為準。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    vehicleOptions: ["小型車", "大型車", "聯結車"],
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "Highway Toll Calculator | Gloss Tools",
    description:
      "Estimate Taiwan freeway ETC tolls from distance or entry and exit interchanges: 20 km free per day, 25% off beyond 200 km, 10% off with eTag.",
    h1: "Highway Toll Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    resultsHeading: "Toll due and breakdown",
    disclosure: "gantry prices total 389.6 dollars",
    faq: [
      "No — once per vehicle per day; all trips on the same day are settled together by licence plate.",
      "Keep a prepaid eTag balance high enough to cover the toll, or pay by yourself within 3–5 days after passage; the discount applies before rounding to the nearest dollar.",
      "No. Holidays use a separately announced flat rate with no free kilometres or long-distance discount; this tool covers normal and regular weekend rates only.",
      "Actual bills sum per-gantry prices; this tool estimates from interchange distances. The amount charged by the toll operator is authoritative.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    vehicleOptions: ["Small vehicle", "Large vehicle", "Articulated vehicle"],
  },
];

const FIELD_IDS = [
  "field-mode-distance",
  "field-mode-pair",
  "field-vehicleType",
  "field-entry",
  "field-exit",
  "field-distanceKm",
  "field-priorKm",
  "field-etag",
];
const ERROR_IDS = [
  "error-mode",
  "error-vehicleType",
  "error-entry",
  "error-exit",
  "error-distanceKm",
  "error-priorKm",
  "error-etag",
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
    assert.ok(html.includes(page.draftNote));
    const noteCount = html.split(page.disclosure).length - 1;
    assert.ok(noteCount >= 2, "disclosure statement appears in input and results areas");
    assert.ok(html.includes(page.resultsHeading), "results heading");
    for (const text of page.faq) {
      assert.ok(html.includes(text), `FAQ text: ${text.slice(0, 24)}`);
    }
    for (const option of page.vehicleOptions) {
      assert.ok(html.includes(option), `vehicle option: ${option}`);
    }
    for (const id of INTERCHANGE_IDS) {
      assert.ok(html.includes(`value="${id}"`), `interchange option ${id}`);
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
