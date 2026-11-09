// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links,
// the pinned FAQ answers, the tatami approximate label on the unit
// option, the quick-table region, the draft-loss note, the form
// controls, and the download button that only appears on success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>坪數換算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="在坪、平方公尺、平方英尺與畳之間換算：精確有理數運算、只在最後一步四捨五入，附 1–100 坪固定速查表；畳採 1.62 m² 廣告慣例值，為概略換算。">',
    ),
  );
  assert.ok(zh.includes("<h1>坪數換算</h1>"));
  assert.ok(zh.includes('content="noindex, nofollow"'));
  assert.ok(!zh.includes("canonical"));
  assert.ok(!zh.includes("hreflang"));
  assert.ok(zh.includes('href="./en/index.html"'));
  assert.ok(zh.includes('href="../../"'));
  assert.ok(zh.includes('href="./styles/app.css"'));
  assert.ok(zh.includes('src="./js/app.js"'));
});

test("en page carries the pinned metadata and candidate rules", () => {
  assert.match(en, /<html lang="en">/);
  assert.ok(en.includes("<title>Ping Area Converter | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Convert between ping, square metres, square feet and tatami with exact rational arithmetic and a single final rounding, plus a fixed 1–100 ping quick table; tatami uses the approximate 1.62 m² advertising convention.">',
    ),
  );
  assert.ok(en.includes("<h1>Ping Area Converter</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("為什麼 1 坪大約是 2 畳，畳卻寫 1.62 m²？"));
  assert.ok(zh.includes("畳的實際尺寸因地區而異（京間約 1.824 m²、江戸間約 1.549 m²）；本工具的畳採日本不動產廣告慣例 1 畳 = 1.62 m²，是概略換算，1 坪 = 400/121 m² ÷ 1.62 ≈ 2.04 畳。"));
  assert.ok(zh.includes("結果可以拿去簽約或登記嗎？"));
  assert.ok(zh.includes("不可以。建物登記以平方公尺為準，坪是民間慣用單位；本工具只供日常估算，正式文件請以權狀或謄本的平方公尺為準。"));
  assert.ok(en.includes("Why is 1 ping about 2 tatami when 1 tatami is 1.62 m²?"));
  assert.ok(en.includes("Physical tatami sizes vary by region (Kyoma ≈ 1.824 m², Edoma ≈ 1.549 m²); this tool uses the Japanese real-estate advertising convention 1 tatami = 1.62 m² as an approximate conversion, and 1 ping = 400/121 m² ÷ 1.62 ≈ 2.04 tatami."));
  assert.ok(en.includes("Can I use the result in a contract or registration?"));
  assert.ok(en.includes("No. Registered areas are recorded in square metres and ping is a customary unit; this tool is for everyday estimates only — use the square metres on the official title for formal documents."));
});

test("both pages label tatami as the approximate advertising convention", () => {
  assert.ok(zh.includes("畳（概略，1 畳 = 1.62 m² 廣告慣例）"));
  assert.ok(en.includes("Tatami (approximate; 1 tatami = 1.62 m² advertising convention)"));
});

test("both pages carry the quick table and the draft-loss note", () => {
  assert.ok(zh.includes("常見坪數速查表"));
  assert.ok(en.includes("Quick table (ping → m² / ft²)"));
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results region, table, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-amount"'));
    assert.ok(page.includes('id="field-unit"'));
    assert.ok(page.includes('id="error-amount"'));
    assert.ok(page.includes('id="error-unit"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="result-rows"'));
    assert.ok(page.includes('id="quick-table-body"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});

test("unit options appear in the SPEC order with the pinned codes", () => {
  for (const page of [zh, en]) {
    const codes = [...page.matchAll(/<option value="([a-z0-9]+)"/g)].map((match) => match[1]);
    assert.deepEqual(codes, ["ping", "m2", "ft2", "tatami"]);
  }
});
