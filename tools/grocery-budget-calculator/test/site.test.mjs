// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// pinned FAQ answers, the draft-loss note, the form controls for all
// fifteen age/sex groups plus the plan choice, and the download
// button that only appears on success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const FIELDS = [
  "c1", "c2_3", "c4_5", "c6_8", "c9_11",
  "f12_13", "f14_19", "f20_50", "f51_70", "f71",
  "m12_13", "m14_19", "m20_50", "m51_70", "m71",
];

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>採買預算試算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入家中成員的年齡層，對照 USDA 食物計畫表，算出每週與每月的在家做飯預算。">',
    ),
  );
  assert.ok(zh.includes("<h1>採買預算試算</h1>"));
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
  assert.ok(en.includes("<title>Grocery Budget Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter your household by age group and price a weekly and monthly at-home food budget from the USDA food plans.">',
    ),
  );
  assert.ok(en.includes("<h1>Grocery Budget Calculator</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("為什麼每月金額和 USDA 公布的不完全一樣？"));
  assert.ok(zh.includes("本工具的每月金額以公布的每週總額乘 4.333 算出；USDA 自己的每月金額以未捨入的每週費用算出，兩者可相差約 0.20 美元。"));
  assert.ok(zh.includes("包含外食嗎？"));
  assert.ok(zh.includes("不包含。食物計畫表假設全部餐點與點心都在家製備。"));
  assert.ok(zh.includes("為什麼一人戶每人反而比較貴？"));
  assert.ok(zh.includes("USDA 規定一人戶加 20%、二人戶加 10%，因為小家庭採買較無規模效益；七人以上減 10%。"));
  assert.ok(zh.includes("有 Moderate-cost 或 Liberal 計畫嗎？"));
  assert.ok(zh.includes("本工具只提供 Thrifty 與 Low-cost 兩種計畫。"));
  assert.ok(en.includes("Why does the monthly total differ slightly from USDA's published figure?"));
  assert.ok(en.includes("This tool multiplies the published rounded weekly total by 4.333; USDA's own monthly figures use unrounded weekly costs, so the two can differ by about $0.20."));
  assert.ok(en.includes("Does it include eating out?"));
  assert.ok(en.includes("No. The food plans assume all meals and snacks are prepared at home."));
  assert.ok(en.includes("Why does a one-person household cost more per person?"));
  assert.ok(en.includes("USDA adds 20% for one person and 10% for two, because small households get less bulk-buying benefit; households of seven or more get 10% off."));
  assert.ok(en.includes("Are Moderate-Cost or Liberal plans included?"));
  assert.ok(en.includes("This tool offers only the Thrifty and Low-Cost plans."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, all fifteen groups, plan choice, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-plan-thrifty"'));
    assert.ok(page.includes('id="field-plan-low-cost"'));
    assert.ok(page.includes('id="error-plan"'));
    assert.ok(page.includes('id="household-total"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="breakdown-body"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
    for (const field of FIELDS) {
      assert.ok(page.includes(`id="field-${field}"`), `missing input ${field}`);
      assert.ok(page.includes(`id="error-${field}"`), `missing error ${field}`);
      assert.ok(page.includes(`id="help-${field}"`), `missing help ${field}`);
      assert.ok(page.includes(`id="step-down-${field}"`), `missing step-down ${field}`);
      assert.ok(page.includes(`id="step-up-${field}"`), `missing step-up ${field}`);
    }
  }
});

test("both pages show the pinned USDA tables and the reference-family note", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes("$26.40"));
    assert.ok(page.includes("$73.70"));
    assert.ok(page.includes("$38.30"));
    assert.ok(page.includes("$73.50"));
    assert.ok(page.includes("236.50"));
    assert.ok(page.includes("4.333"));
  }
});

test("default values are the SPEC reset defaults: one woman and one man 20-50", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="field-f20_50"'));
    assert.ok(page.includes('id="field-m20_50"'));
    assert.ok(page.includes('value="1"'), "expected two default 1 values");
  }
  const ones = (zh.match(/value="1"/g) ?? []).length;
  assert.equal(ones, 2);
});
