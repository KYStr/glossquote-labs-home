// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links,
// same-language home links, the fixed model note in the results area,
// the SPEC-pinned FAQ answers, the draft-loss note, the offset help
// text (offset affects local dates only), and all form control and
// error-slot ids, including the download button the SPEC pins.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "月相計算機｜Gloss Tools",
    description: "輸入西元日期，查當天月齡、照亮比與月相名稱，以及下一個朔與滿月落在哪一天。",
    h1: "月相計算機",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    resultsHeading: "月相結果",
    modelNote: "本工具以平均朔望月推算，實際朔望時刻可相差數小時；月相以所選日期 UTC 正午為準。",
    faq: [
      "所選日期的 UTC 正午；同一晚前半夜與後半夜可能跨段，日期級結果是代表值。",
      "本工具以平均朔望月推算，實際朔望時刻可相差數小時，跨過午夜就差一天。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    offsetHelp: "只影響下一個朔／滿月的「當地日期」顯示，不影響評估時刻與其他輸出。",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "Moon Phase Calculator | Gloss Tools",
    description:
      "Enter a date to see the Moon's age, illumination and phase name, plus the dates of the next new and full moons.",
    h1: "Moon Phase Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    resultsHeading: "Moon phase result",
    modelNote:
      "This tool uses the average synodic month; actual new and full moon times can differ by several hours. The phase is evaluated at 12:00 UTC on the chosen date.",
    faq: [
      "Noon UTC on the chosen date; a single night can straddle a boundary, so the daily value is representative.",
      "The average synodic month is an approximation; actual times vary by hours and can fall on the other side of midnight.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    offsetHelp:
      "It only changes the local dates shown for the next new and full moons; it does not affect the evaluation moment or any other output.",
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
    assert.ok(html.includes(page.modelNote), "fixed model note");
    assert.ok(html.includes(page.offsetHelp), "offset scope note beside the field");
    for (const text of page.faq) assert.ok(html.includes(text), `FAQ: ${text}`);
    for (const id of [
      "field-date",
      "field-utcOffset",
      "error-date",
      "error-utcOffset",
      "status",
      "summary-rows",
      "run-btn",
      "example-btn",
      "reset-btn",
      "cancel-btn",
      "download-btn",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    }
    // The default draft is the SPEC default: no date, +08:00 offset.
    assert.ok(html.includes('id="field-utcOffset"'), "offset field present");
    assert.ok(html.includes('value="+08:00"'), "offset default +08:00");
  });
}
