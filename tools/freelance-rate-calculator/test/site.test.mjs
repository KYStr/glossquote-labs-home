// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// bilingual quote note, the pinned FAQ answers, the draft-loss note,
// the form controls with pre-filled SPEC defaults, and the download
// button that only appears on success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const QUOTE_ZH =
  "這只是試算參考，實際報價還要考慮稅費、勞健保、議價空間與市場行情。";
const QUOTE_EN =
  "This is an estimate only; actual quotes should also account for tax, insurance, negotiation room and market rates.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>接案費率試算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="自由工作者從目標年收入出發，計入可計費使用率與間接成本，算出應報的時薪與日薪。">',
    ),
  );
  assert.ok(zh.includes("<h1>接案費率試算</h1>"));
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
  assert.ok(en.includes("<title>Freelance Rate Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Set your freelance hourly and day rate from a target annual income, billable utilization and overhead.">',
    ),
  );
  assert.ok(en.includes("<h1>Freelance Rate Calculator</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages show the quote note in both languages", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes(QUOTE_ZH));
    assert.ok(page.includes(QUOTE_EN));
  }
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("時薪是怎麼算出來的？"));
  assert.ok(zh.includes("先把目標年收入加上間接成本，再除以計費時數（年工作天數 × 可計費使用率 × 每日工時）。"));
  assert.ok(zh.includes("這個費率可以直接拿去報價嗎？"));
  assert.ok(zh.includes("這只是試算參考，實際報價還要考慮稅費、勞健保、議價空間與市場行情。"));
  assert.ok(en.includes("How is the hourly rate calculated?"));
  assert.ok(en.includes("Add overhead to the target annual income, then divide by billable hours (working days × utilization × hours per day)."));
  assert.ok(en.includes("Can I quote this rate directly?"));
  assert.ok(en.includes("This is an estimate only; actual quotes should also account for tax, insurance, negotiation room and market rates."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results region, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-targetAnnualIncome"'));
    assert.ok(page.includes('id="field-workingDaysPerYear"'));
    assert.ok(page.includes('id="field-hoursPerDay"'));
    assert.ok(page.includes('id="field-billableUtilizationPercent"'));
    assert.ok(page.includes('id="field-overheadPercent"'));
    assert.ok(page.includes('id="error-targetAnnualIncome"'));
    assert.ok(page.includes('id="error-workingDaysPerYear"'));
    assert.ok(page.includes('id="error-hoursPerDay"'));
    assert.ok(page.includes('id="error-billableUtilizationPercent"'));
    assert.ok(page.includes('id="error-overheadPercent"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});

test("both pages pre-fill the SPEC reset defaults", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('value="1200000"'));
    assert.ok(page.includes('value="220"'));
    assert.ok(page.includes('value="8"'));
    assert.ok(page.includes('value="70"'));
    assert.ok(page.includes('value="20"'));
  }
});
