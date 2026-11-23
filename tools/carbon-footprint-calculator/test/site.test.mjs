// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// bilingual disclaimer, the pinned FAQ answers, the factor table, the
// Taiwan context line, the draft-loss note, the form controls, and
// the download button that only appears on success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const DISCLAIMER_ZH =
  "本工具結果為估算值，僅供個人參考，不構成正式碳盤查、碳足跡查證或任何申報依據。";
const DISCLAIMER_EN =
  "Results are estimates for personal reference only and are not a formal carbon inventory, verified footprint, or reporting basis.";

const FIELDS = [
  "electricityKwhPerMonth",
  "carKmPerYear",
  "carFuelLPer100Km",
  "carFuelType",
  "busKmPerYear",
  "railKmPerYear",
  "flightShortKmPerYear",
  "flightLongKmPerYear",
  "dietBeefKgPerWeek",
  "dietPorkKgPerWeek",
  "dietPoultryKgPerWeek",
  "dietFishKgPerWeek",
  "dietEggsKgPerWeek",
  "dietRiceKgPerWeek",
];

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>碳足跡計算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入用電、交通與飲食，以官方排放係數估算一年碳足跡（公斤 CO2e），並看到六大類別的拆解。">',
    ),
  );
  assert.ok(zh.includes("<h1>碳足跡計算</h1>"));
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
  assert.ok(en.includes("<title>Carbon Footprint Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Estimate your annual carbon footprint in kg CO2e from electricity, transport and diet using official emission factors, with a breakdown by category.">',
    ),
  );
  assert.ok(en.includes("<h1>Carbon Footprint Calculator</h1>"));
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
  assert.ok(zh.includes("結果是正式碳盤查嗎？"));
  assert.ok(zh.includes("不是，這是估算值，僅供個人參考。"));
  assert.ok(zh.includes("為什麼牛肉的係數這麼高？"));
  // The page carries the pinned text HTML-escaped (&amp;); the
  // visible text after parsing is the SPEC's "Poore & Nemecek ...".
  assert.ok(zh.includes("飲食係數取 Poore &amp; Nemecek (2018) 全球平均（含土地利用變化），生產方式差異極大，數值僅供比較參考。"));
  assert.ok(zh.includes("機車怎麼算？"));
  assert.ok(zh.includes("機車用同一組車輛欄位，填機車里程與油耗即可。"));
  assert.ok(en.includes("Is this a formal carbon inventory?"));
  assert.ok(en.includes("No, it is an estimate for personal reference only."));
  assert.ok(en.includes("Why is the beef factor so high?"));
  assert.ok(en.includes("Diet factors are Poore &amp; Nemecek (2018) global averages including land-use change; production methods vary widely, so treat the figures as comparative estimates."));
  assert.ok(en.includes("How do I count a scooter?"));
  assert.ok(en.includes("Use the same vehicle fields with your scooter's distance and fuel use."));
});

test("both pages carry the factor table and the Taiwan context line", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes("0.471"));
    assert.ok(page.includes("2.31"));
    assert.ok(page.includes("2.68"));
    assert.ok(page.includes("0.102"));
    assert.ok(page.includes("0.035"));
    assert.ok(page.includes("0.153"));
    assert.ok(page.includes("0.148"));
    assert.ok(page.includes("99.5"));
    assert.ok(page.includes("11.7"));
  }
  assert.ok(zh.includes("台灣 2024 年人均溫室氣體排放約 11.7 公噸 CO2e"));
  assert.ok(en.includes("Taiwan's 2024 per-capita greenhouse gas emissions were about 11.7 tonnes CO2e"));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    for (const field of FIELDS) {
      assert.ok(page.includes(`id="field-${field}"`), `missing input ${field}`);
      assert.ok(page.includes(`id="error-${field}"`), `missing error slot ${field}`);
    }
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="category-rows"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
