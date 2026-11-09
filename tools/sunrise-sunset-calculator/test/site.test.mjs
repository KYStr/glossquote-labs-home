// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links,
// same-language home links, the fixed accuracy note, the pinned FAQ
// answers, the eight preset options, the draft-loss note, and all form
// control and error-slot ids.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "日出日落時間計算｜Gloss Tools",
    description:
      "輸入日期與地點的緯度、經度、UTC 偏移，以 NOAA 近似公式計算日出、太陽正午、日落與日長，並辨識極晝與極夜。",
    h1: "日出日落時間計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    resultsHeading: "日出、太陽正午、日落與日長",
    accuracy:
      "本工具採 NOAA 近似公式，結果可能與實際觀測或官方曆象相差數分鐘。無時區資料庫、不處理日光節約時間；偏移請依當地當日實際時制自行確認。",
    faq: [
      "本工具是 NOAA 近似公式，γ 只以當地正午取值，且只用固定偏移，不含當地時區規則與更精確的曆算，差數分鐘屬預期。",
      "偏移是固定輸入；夏令時間請自行把偏移加一小時，例如雪梨夏季改填 +11:00。",
      "太陽通過當地子午線的時刻，在固定偏移下通常不是 12:00。",
    ],
    presets: ["自訂", "台北", "台中", "高雄", "東京", "雪梨", "倫敦", "紐約", "雷克雅維克"],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "Sunrise &amp; Sunset Calculator | Gloss Tools",
    description:
      "Compute sunrise, solar noon, sunset and day length for a date, latitude, longitude and UTC offset with the NOAA approximation, including polar day and polar night detection.",
    h1: "Sunrise &amp; Sunset Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    resultsHeading: "Sunrise, solar noon, sunset and day length",
    accuracy:
      "This tool uses the NOAA approximation; results may differ from observed or official times by a few minutes. There is no time-zone database and no daylight-saving handling; confirm the offset in force for your place and date.",
    faq: [
      "This tool uses the NOAA approximation with γ evaluated at local noon and a single fixed offset; official almanacs use more precise ephemerides and local time-zone rules, so a difference of a few minutes is expected.",
      "The offset is a fixed input; for daylight-saving time add an hour yourself, e.g. use +11:00 for Sydney in summer.",
      "The moment the sun crosses the local meridian; under a fixed offset it is usually not 12:00.",
    ],
    presets: ["Custom", "Taipei", "Taichung", "Kaohsiung", "Tokyo", "Sydney", "London", "New York", "Reykjavík"],
    draftNote: "Switching language or leaving this page discards the current draft.",
  },
];

const FIELD_IDS = ["field-date", "field-preset", "field-latitude", "field-longitude", "field-utcOffset"];
const ERROR_IDS = ["error-date", "error-latitude", "error-longitude", "error-utcOffset"];

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
    assert.ok(html.includes(page.accuracy), "fixed accuracy note");
    assert.ok(html.includes(page.resultsHeading), "results heading");
    for (const text of page.faq) {
      assert.ok(html.includes(text), `FAQ text: ${text.slice(0, 24)}`);
    }
    for (const name of page.presets) {
      assert.ok(html.includes(`>${name}</option>`), `preset option: ${name}`);
    }
    for (const id of FIELD_IDS) {
      assert.ok(html.includes(`id="${id}"`), `input ${id}`);
    }
    for (const id of ERROR_IDS) {
      assert.ok(html.includes(`id="${id}"`), `error slot ${id}`);
    }
    assert.ok(html.includes('id="download-btn"'), "download button exists");
  });
}
