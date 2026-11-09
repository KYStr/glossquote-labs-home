// Site tests: the two static pages carry the SPEC-pinned metadata and
// structure — language, title, description, h1, preview noindex, no
// production canonical/hreflang, relative language links, same-language
// home links, the pinned FAQ answers, the draft-loss note, the six
// speed chips, and all form control and error-slot ids.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "下載時間計算機｜Gloss Tools",
    description:
      "輸入檔案大小與連線速度，算出下載需要多久與預計完成時間；位元與位元組換算、效率折減都寫清楚。",
    h1: "下載時間計算機",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    resultsHeading: "所需時間與完成時刻",
    disclaimer: "這是固定速度的估算，不是下載保證；實際時間會受伺服器、尖峰壅塞與家中網路環境影響。",
    faq: [
      "速度以位元（bit）計、檔案以位元組（byte）計，1 byte = 8 bits，所以約需 8 秒多。",
      "協定額外負擔與實際環境會讓有效速度低於標稱值；效率 90 表示以標稱速度的九成計算。預設 100，不折減。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "Download Time Calculator | Gloss Tools",
    description:
      "Estimate how long a download takes and when it will finish, with explicit bit/byte conversion and an efficiency factor.",
    h1: "Download Time Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    resultsHeading: "Time needed and finish time",
    disclaimer:
      "This is a fixed-speed estimate, not a download guarantee; the actual time depends on the server, peak congestion, and your home network.",
    faq: [
      "Speed is measured in bits and file size in bytes; 1 byte = 8 bits, so it takes about 8 seconds.",
      "Protocol overhead and real-world conditions make the effective speed lower than the rated one; 90 uses 90% of the rated speed. The default is 100, no reduction.",
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
    assert.ok(html.includes(page.disclaimer), "estimate disclaimer text");
    for (const text of page.faq) assert.ok(html.includes(text), `FAQ: ${text}`);
    for (const speed of ["10", "50", "100", "300", "500", "1000"]) {
      assert.ok(html.includes(`data-chip-speed="${speed}"`), `speed chip ${speed}`);
    }
    for (const id of [
      "field-sizeValue",
      "field-sizeUnit",
      "field-speedValue",
      "field-speedUnit",
      "field-efficiency",
      "field-startTime",
      "error-sizeValue",
      "error-sizeUnit",
      "error-speedValue",
      "error-speedUnit",
      "error-efficiency",
      "error-startTime",
      "status",
      "summary-rows",
      "detail-rows",
      "run-btn",
      "example-btn",
      "reset-btn",
      "cancel-btn",
      "download-btn",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    }
    // The download is a button driven by the app, not a static link.
    assert.ok(!html.includes("<a download"), "no static download link artifact");
  });
}
