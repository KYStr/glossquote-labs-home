// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links,
// same-language home links, the precision statement in both the input
// and results areas, the pinned FAQ answers, the results heading, and
// all form control and error-slot ids.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "黃金時刻計算｜Gloss Tools",
    description:
      "輸入日期與地點的緯度、經度、UTC 偏移，以 NOAA 近似公式計算日出、日落與黃金時刻、藍調時刻，標示正午仰角與各時段長度。",
    h1: "黃金時刻計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    resultsHeading: "日出、太陽正午、日落、日長與四個攝影時段",
    precisionNote:
      "本工具採 NOAA 近似公式，結果可能與實際觀測或官方曆象相差數分鐘。無時區資料庫、不處理日光節約時間；偏移請依當地當日實際時制自行確認。黃金／藍調時刻以太陽幾何仰角定義（黃金 −4° 至 +6°、藍調 −6° 至 −4°），不另作大氣折射修正。",
    faq: [
      "本工具是 NOAA 近似公式，γ 只以當地正午取值，且只用固定偏移，不含當地時區規則與更精確的曆算，差數分鐘屬預期。",
      "黃金時刻是太陽仰角 −4° 至 +6° 的一段，太陽升落的速度隨緯度與季節而變：赤道約 40 分鐘，倫敦夏至約 83 分鐘，固定一小時在兩地都會錯。",
      "偏移是固定輸入；夏令時間請自行把偏移加一小時，例如倫敦夏季改填 +01:00、雪梨夏季改填 +11:00。",
      "太陽通過當地子午線的時刻，在固定偏移下通常不是 12:00。",
      "太陽整夜不曾降到 −4° 以下（例如雷克雅維克夏至最低約 −2.4°），仰角窗口不存在，不是計算錯誤；反之冬至正午仰角不到 +6° 時也沒有黃金時刻，但仍可能有藍調時刻。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "Golden Hour Calculator | Gloss Tools",
    description:
      "Compute sunrise, sunset, golden hour and blue hour for a date, latitude, longitude and UTC offset with the NOAA approximation, including solar noon elevation and window lengths.",
    h1: "Golden Hour Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    resultsHeading: "Sunrise, solar noon, sunset, day length and the four photography windows",
    precisionNote:
      "This tool uses the NOAA approximation; results may differ from observed or official times by a few minutes. There is no time-zone database and no daylight-saving handling; confirm the offset in force for your place and date. Golden and blue hours are defined by geometric solar elevation (golden −4° to +6°, blue −6° to −4°) with no extra refraction correction.",
    faq: [
      "This tool uses the NOAA approximation with γ evaluated at local noon and a single fixed offset; official almanacs use more precise ephemerides and local time-zone rules, so a difference of a few minutes is expected.",
      "Golden hour is the span while the sun is between −4° and +6° in elevation, and the sun climbs at different rates by latitude and season: about 40 minutes at the equator, about 83 minutes in London at midsummer. A fixed hour would be wrong in both places.",
      "The offset is a fixed input; for daylight-saving time add an hour yourself, e.g. use +01:00 for London in summer and +11:00 for Sydney in summer.",
      "The moment the sun crosses the local meridian; under a fixed offset it is usually not 12:00.",
      "The sun never drops below −4° overnight (about −2.4° at lowest in Reykjavík at midsummer), so the elevation window does not exist; that is not a calculation error. Likewise, when the noon elevation stays below +6° in winter there is no golden hour, though there may still be a blue hour.",
    ],
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
    const noteCount = html.split(page.precisionNote).length - 1;
    assert.ok(noteCount >= 2, "precision statement appears in input and results areas");
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
    assert.ok(html.includes('id="windows-list"'), "windows list exists");
    assert.ok(html.includes('id="polar-note"'), "polar note exists");
  });
}
