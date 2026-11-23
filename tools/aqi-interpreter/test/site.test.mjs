// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// bilingual disclaimer, the pinned FAQ answers, the draft-loss note,
// the form controls, and the download button that only appears on
// success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const DISCLAIMER_ZH =
  "本工具僅提供空氣品質資訊解讀與一般性活動建議，不構成醫療建議；如有呼吸道或心血管症狀，請諮詢醫師。";
const DISCLAIMER_EN =
  "This tool provides air-quality information and general activity guidance only. It is not medical advice; consult a physician if you have respiratory or cardiovascular symptoms.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>空氣品質解讀｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入 AQI 或污染物濃度，對照台灣與美國 EPA 分級表，解讀空氣品質等級、顏色與健康活動建議。">',
    ),
  );
  assert.ok(zh.includes("<h1>空氣品質解讀</h1>"));
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
  assert.ok(en.includes("<title>AQI Interpreter | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter an AQI value or pollutant concentrations and read the air-quality level, colour and health activity guidance under the Taiwan or US EPA scales.">',
    ),
  );
  assert.ok(en.includes("<h1>AQI Interpreter</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages show the disclaimer in both languages", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes(DISCLAIMER_ZH));
    assert.ok(page.includes(DISCLAIMER_EN));
  }
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("同一個濃度在台灣和美國算出來的 AQI 為什麼不同？"));
  assert.ok(zh.includes("因為兩制的濃度斷點不同（例如 PM2.5 良好上限台灣為 12.4 µg/m³、美國為 9.0 µg/m³），詳見規格 §5 對照表。"));
  assert.ok(zh.includes("這個工具會預報明天的空氣嗎？"));
  assert.ok(zh.includes("不會。它只解讀你輸入的數字，不做預報、不查即時監測值。"));
  assert.ok(zh.includes("可以直接把即時濃度當成 24 小時平均輸入嗎？"));
  assert.ok(zh.includes("不行。PM2.5／PM10 的斷點以 24 小時平均定義，O3／CO 以 8 小時或 1 小時平均定義；即時讀數只能作為指示性參考，本工具不計算移動平均。"));
  assert.ok(zh.includes("為什麼 O3 8 小時濃度超過 0.200 ppm 沒有結果？"));
  assert.ok(zh.includes("依官方規定，AQI 301 以上改以 O3 1 小時值計算，請改輸入 O3 1 小時濃度。"));
  assert.ok(en.includes("Why does the same concentration give a different AQI in Taiwan vs the US?"));
  assert.ok(en.includes("Because the breakpoint tables differ (for example, the Good limit for PM2.5 is 12.4 µg/m³ in Taiwan and 9.0 µg/m³ in the US); see the comparison table in SPEC §5."));
  assert.ok(en.includes("Does this tool forecast tomorrow's air quality?"));
  assert.ok(en.includes("No. It only interprets the numbers you enter; it does not forecast or fetch live monitoring values."));
  assert.ok(en.includes("Can I enter a real-time reading as a 24-hour average?"));
  assert.ok(en.includes("No. PM2.5/PM10 breakpoints are defined on 24-hour averages and O3/CO on 8-hour or 1-hour averages; a real-time reading is indicative only, and this tool does not compute moving averages."));
  assert.ok(en.includes("Why is there no result when 8-hour O3 exceeds 0.200 ppm?"));
  assert.ok(en.includes("By the official rule, AQI values above 300 are computed from 1-hour O3; enter the 1-hour O3 concentration instead."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="mode-aqi"'));
    assert.ok(page.includes('id="mode-concentration"'));
    assert.ok(page.includes('id="system-tw"'));
    assert.ok(page.includes('id="system-us"'));
    assert.ok(page.includes('id="field-aqi"'));
    assert.ok(page.includes('id="error-aqi"'));
    assert.ok(page.includes('id="rows-list"'));
    assert.ok(page.includes('id="add-row-btn"'));
    assert.ok(page.includes('id="error-rows"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="level-swatch"'));
    assert.ok(page.includes('id="level-name"'));
    assert.ok(page.includes('id="result-aqi"'));
    assert.ok(page.includes('id="health-impact"'));
    assert.ok(page.includes('id="advice-general"'));
    assert.ok(page.includes('id="advice-sensitive"'));
    assert.ok(page.includes('id="dominant-value"'));
    assert.ok(page.includes('id="subindices-body"'));
    assert.ok(page.includes('id="notices-list"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});

test("both pages show the level colours with their pinned hex values", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes("#00E400"));
    assert.ok(page.includes("#FFFF00"));
    assert.ok(page.includes("#FF7E00"));
    assert.ok(page.includes("#FF0000"));
    assert.ok(page.includes("#99004C"));
    assert.ok(page.includes("#7E0023"));
  }
});
