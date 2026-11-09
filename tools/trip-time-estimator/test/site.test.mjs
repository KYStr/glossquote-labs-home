// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links,
// same-language home links, the fixed-offset note in both the input
// and results areas, the pinned FAQ answers, the preset group label
// and standard-time note, the results heading, and all form control
// and error-slot ids.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "旅程時間估算｜Gloss Tools",
    description:
      "輸入出發地日期時間、兩地 UTC 偏移與飛行時間（或抵達時間），換算抵達地日期時間與跨日變化；固定偏移，不含日光節約時間。",
    h1: "旅程時間估算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    resultsHeading: "抵達時間與旅程長度",
    fixedNote:
      "本工具使用固定 UTC 偏移，不含日光節約時間與時區資料庫；實際航班與行程時間請以航空公司或營運單位公布為準。",
    faq: [
      "因為抵達地時區可能在出發地之後，鐘面讀數會倒退，甚至回到前一天；請看跨日標籤與抵達日期。",
      "沒有。本工具只用你輸入的固定 UTC 偏移；夏令時間期間請把偏移改成當地當時實際的偏移，實際航班時間以航空公司公布為準。",
    ],
    presetLabel: "常用航線（標準時間）",
    presetNote: "標準時間，夏令時間請自行調整偏移",
    nextDayLabel: "抵達日期為出發日期的次日",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "Trip Time Estimator | Gloss Tools",
    description:
      "Convert a departure date and time across fixed UTC offsets with a travel duration or an arrival time, and see the arrival date, day shift and duration. Fixed offsets; no daylight-saving database.",
    h1: "Trip Time Estimator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    resultsHeading: "Arrival and duration",
    fixedNote:
      "This tool uses fixed UTC offsets with no daylight-saving or time-zone database; check your flight's actual times with the carrier.",
    faq: [
      "The destination may be in a later-offset zone, so the clock reading moves backwards, even to the day before; check the day-shift label and the arrival date.",
      "No. It uses only the fixed UTC offsets you enter; during daylight saving time, enter the offset actually in effect, and always confirm real flight times with the carrier.",
    ],
    presetLabel: "Common routes (standard time)",
    presetNote: "Standard time; adjust the offset yourself during daylight saving time",
    nextDayLabel: "Arrival is on the day after the departure date",
    draftNote: "Switching language or leaving this page discards the current draft.",
  },
];

const FIELD_IDS = [
  "field-mode",
  "field-departureDate",
  "field-departureTime",
  "field-departureOffset",
  "field-arrivalOffset",
  "field-duration",
  "field-arrivalTime",
  "field-arrivalNextDay",
];
const ERROR_IDS = [
  "error-mode",
  "error-departureDate",
  "error-departureTime",
  "error-departureOffset",
  "error-arrivalOffset",
  "error-duration",
  "error-arrivalTime",
  "error-arrivalNextDay",
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
    const noteCount = html.split(page.fixedNote).length - 1;
    assert.ok(noteCount >= 2, "fixed-offset note appears in input and results areas");
    assert.ok(html.includes(page.resultsHeading), "results heading");
    for (const text of page.faq) {
      assert.ok(html.includes(text), `FAQ text: ${text.slice(0, 24)}`);
    }
    assert.ok(html.includes(page.presetLabel), "preset group label");
    assert.ok(html.includes(page.presetNote), "standard-time note");
    assert.ok(html.includes(page.nextDayLabel), "mode-B next-day toggle label");
    for (const id of FIELD_IDS) {
      assert.ok(html.includes(`id="${id}"`), `input ${id}`);
    }
    for (const id of ERROR_IDS) {
      assert.ok(html.includes(`id="${id}"`), `error slot ${id}`);
    }
    assert.ok(html.includes('id="download-btn"'), "download button exists");
    assert.ok(html.includes('id="preset-row"'), "preset row exists");
  });
}
