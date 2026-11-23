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
  "本工具僅供參考，不能取代專業醫療建議、診斷或治療。如有疑慮，請諮詢醫師或醫療專業人員。";
const DISCLAIMER_EN =
  "This tool is for reference only and is not a substitute for professional medical advice, diagnosis, or treatment. If you have concerns, consult a physician or healthcare professional.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>血壓分級｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入收縮壓與舒張壓，對照 AHA/ACC 2017 分級表，立即知道這次量測落在哪一級。僅供參考，非醫療建議。">',
    ),
  );
  assert.ok(zh.includes("<h1>血壓分級</h1>"));
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
  assert.ok(en.includes("<title>Blood Pressure Checker | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter systolic and diastolic pressure to see the AHA/ACC 2017 category for a single reading. For reference only, not medical advice.">',
    ),
  );
  assert.ok(en.includes("<h1>Blood Pressure Checker</h1>"));
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
  assert.ok(zh.includes("單次量測就能診斷高血壓嗎？"));
  assert.ok(zh.includes("不能；分級以單次量測對照，高血壓診斷需多次量測與醫師評估。"));
  assert.ok(zh.includes("收縮壓與舒張壓落在不同級時取哪一級？"));
  assert.ok(zh.includes("取較高者。"));
  assert.ok(zh.includes("180/120 算高血壓危象嗎？"));
  assert.ok(zh.includes("不算；危象是收縮壓高於 180 或舒張壓高於 120（嚴格大於），180/120 本身為第二期。"));
  assert.ok(en.includes("Can one reading diagnose hypertension?"));
  assert.ok(en.includes("No; this classifies a single reading. Diagnosis needs repeated measurements and a physician's evaluation."));
  assert.ok(en.includes("If systolic and diastolic fall in different categories, which one applies?"));
  assert.ok(en.includes("The higher category."));
  assert.ok(en.includes("Is 180/120 a hypertensive crisis?"));
  assert.ok(en.includes("No; a crisis is systolic above 180 or diastolic above 120 (strictly greater), so 180/120 itself is Stage 2."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-systolic"'));
    assert.ok(page.includes('id="field-diastolic"'));
    assert.ok(page.includes('id="error-systolic"'));
    assert.ok(page.includes('id="error-diastolic"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="advice-rows"'));
    assert.ok(page.includes('id="crisis-note"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
