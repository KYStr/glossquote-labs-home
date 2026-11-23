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
  "本工具是體積估算，不是實際裝載規劃；結果僅供選租參考，實際能否裝入還受物品形狀、門寬與堆疊方式影響。";
const DISCLAIMER_EN =
  "This tool estimates volume; it is not a loading plan. Results are for choosing a unit size only — whether everything actually fits also depends on item shapes, door width, and how things are stacked.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>倉儲空間估算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="搬家或裝修前，先算東西總共多大：加入家具、家電與箱子，算出總體積與推薦的倉儲單位尺寸。">',
    ),
  );
  assert.ok(zh.includes("<h1>倉儲空間估算</h1>"));
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
  assert.ok(en.includes("<title>Storage Unit Estimator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Before moving or renovating, work out how much space your things need: add furniture, appliances and boxes to get the total volume and a recommended storage unit size.">',
    ),
  );
  assert.ok(en.includes("<h1>Storage Unit Estimator</h1>"));
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
  assert.ok(zh.includes("體積怎麼算？"));
  assert.ok(zh.includes("每件物品以釘版典型外形尺寸的長×寬×高換算成立方公尺，再乘以數量加總；自訂物品以輸入的長寬高計算。"));
  assert.ok(zh.includes("為什麼需要體積比總體積大 25%？"));
  assert.ok(zh.includes("物品不是完美立方體，堆疊會有空隙，單位內還要留走道；本工具以固定 25% 預留估算，不是實測裝載效率。"));
  assert.ok(zh.includes("推薦的單位一定裝得下嗎？"));
  assert.ok(zh.includes("不一定。推薦以體積比較，實際還受物品形狀、門寬與堆疊方式影響；超大或不規則物品請先量門寬並向業者確認。"));
  assert.ok(en.includes("How is volume calculated?"));
  assert.ok(en.includes("Each item uses its pinned typical outer dimensions (length × width × height) converted to cubic metres, multiplied by quantity and summed; custom items use the dimensions you enter."));
  assert.ok(en.includes("Why is the required volume 25% more than the total?"));
  assert.ok(en.includes("Items are not perfect cubes, stacking leaves gaps, and you need an aisle inside the unit; the tool applies a fixed 25% allowance, not a measured packing efficiency."));
  assert.ok(en.includes("Will the recommended unit definitely fit everything?"));
  assert.ok(en.includes("Not necessarily. The recommendation compares volumes only; shape, door width and stacking also matter. Measure the door and check with the facility for oversized or irregular items."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, rows region, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="rows-list"'));
    assert.ok(page.includes('id="add-row-btn"'));
    assert.ok(page.includes('id="row-limit-note"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="rows-table-body"'));
    assert.ok(page.includes('id="overflow-note"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
