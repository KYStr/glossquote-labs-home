// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// pinned FAQ answers, the pinned common-scales table, the draft-loss
// note, the form controls, and the download button that only appears
// on success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>地圖比例尺換算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入地圖比例尺與圖上距離，換算實際距離；反向也可由實際距離算回圖上距離，並附常用比例尺對照表。">',
    ),
  );
  assert.ok(zh.includes("<h1>地圖比例尺換算</h1>"));
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
  assert.ok(en.includes("<title>Map Scale Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Convert map distance to real distance from a map scale, or real distance back to map distance, with a common-scales reference table.">',
    ),
  );
  assert.ok(en.includes("<h1>Map Scale Calculator</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("比例尺 1:25000 是什麼意思？"));
  assert.ok(zh.includes("圖上 1 公分等於實際 250 公尺（25,000 公分）。"));
  assert.ok(zh.includes("為什麼實際距離同時顯示公尺和公里？"));
  assert.ok(zh.includes("短距離讀公尺較直覺，長距離讀公里較方便；主要單位以精確值 1000 公尺為界切換。"));
  assert.ok(zh.includes("可以輸入不是整數的圖上距離嗎？"));
  assert.ok(zh.includes("可以，小數點後最多 3 位，例如 2.5 公分。"));
  assert.ok(en.includes("What does a 1:25000 scale mean?"));
  assert.ok(en.includes("1 cm on the map equals 250 m (25,000 cm) in reality."));
  assert.ok(en.includes("Why show both metres and kilometres?"));
  assert.ok(en.includes("Metres read better for short distances and kilometres for long ones; the primary unit switches at exactly 1000 m on the unrounded value."));
  assert.ok(en.includes("Can I enter a non-integer map distance?"));
  assert.ok(en.includes("Yes, up to 3 decimal places, for example 2.5 cm."));
});

test("both pages carry the pinned common-scales table", () => {
  const zhCells = [
    "1:1000", "10 公尺", "100 公分",
    "1:5000", "50 公尺", "20 公分",
    "1:10000", "100 公尺", "10 公分",
    "1:25000", "250 公尺", "4 公分",
    "1:50000", "500 公尺", "2 公分",
    "1:100000", "1 公里", "1 公分",
    "1:200000", "2 公里", "0.5 公分",
  ];
  const enCells = [
    "1:1000", "10 m", "100 cm",
    "1:5000", "50 m", "20 cm",
    "1:10000", "100 m", "10 cm",
    "1:25000", "250 m", "4 cm",
    "1:50000", "500 m", "2 cm",
    "1:100000", "1 km", "1 cm",
    "1:200000", "2 km", "0.5 cm",
  ];
  for (const cell of zhCells) assert.ok(zh.includes(cell), `zh table cell: ${cell}`);
  for (const cell of enCells) assert.ok(en.includes(cell), `en table cell: ${cell}`);
  for (const scale of [1000, 5000, 10000, 25000, 50000, 100000, 200000]) {
    assert.ok(zh.includes(`data-scale="${scale}"`), `zh button 1:${scale}`);
    assert.ok(en.includes(`data-scale="${scale}"`), `en button 1:${scale}`);
  }
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-mode-map"'));
    assert.ok(page.includes('id="field-mode-real"'));
    assert.ok(page.includes('id="field-scale"'));
    assert.ok(page.includes('id="field-map-cm"'));
    assert.ok(page.includes('id="field-real-value"'));
    assert.ok(page.includes('id="field-unit-m"'));
    assert.ok(page.includes('id="field-unit-km"'));
    assert.ok(page.includes('id="error-scale"'));
    assert.ok(page.includes('id="error-map-cm"'));
    assert.ok(page.includes('id="error-real-value"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="detail-rows"'));
    assert.ok(page.includes('id="scale-table"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
