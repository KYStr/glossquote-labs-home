// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// bilingual disclaimer, the pinned FAQ answers, the draft-loss note,
// the bar quick-select buttons, the form controls, and the download
// button that only appears on success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const DISCLAIMER_ZH =
  "本工具只依目標總重選槓片，不估算任何人的最大重量，也不把結果當訓練處方或安全保證。全部計算都在這個頁面本機進行，不上傳、不儲存、不記錄你的輸入。";
const DISCLAIMER_EN =
  "This tool only picks plates for a target total. It never estimates anyone's maximum lift, and its result is not a training prescription or a safety guarantee. All calculation happens locally on this page; nothing is uploaded, stored, or logged.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>槓鈴配重｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入目標總重、槓鈴重與手邊槓片，算出每邊要掛哪幾片；掛不出來時告訴你差多少、最近能掛到幾公斤。">',
    ),
  );
  assert.ok(zh.includes("<h1>槓鈴配重</h1>"));
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
  assert.ok(en.includes("<title>Barbell Plate Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter a target total, bar weight and the plates you have, and see which plates go on each side — and how close you can get when the exact weight is not reachable.">',
    ),
  );
  assert.ok(en.includes("<h1>Barbell Plate Calculator</h1>"));
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
  assert.ok(zh.includes("掛不出來是什麼意思？"));
  assert.ok(zh.includes("每邊餘數大於 0，表示手邊槓片湊不出目標；頁面會顯示實際可達總重與下一個較重建議。"));
  assert.ok(zh.includes("這會估算我的最大重量（1RM）嗎？"));
  assert.ok(zh.includes("不會。這只依目標總重選槓片，不估算任何人的最大重量。"));
  assert.ok(zh.includes("槓鈴夾的重量算進去了嗎？"));
  assert.ok(zh.includes("沒有。槓鈴夾以 0 公斤計；若你的夾子有重量，請把它加進槓鈴重量欄。"));
  assert.ok(en.includes("What does “not reachable” mean?"));
  assert.ok(en.includes("A per-side remainder above 0 means your plates cannot make the target; the page shows the achievable total and the next heavier suggestion."));
  assert.ok(en.includes("Does it estimate my one-rep max (1RM)?"));
  assert.ok(en.includes("No. It only picks plates for a target total; it never estimates anyone's maximum lift."));
  assert.ok(en.includes("Are collar weights included?"));
  assert.ok(en.includes("No. Collars count as 0 kg; if yours have weight, add it to the bar weight field."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, bar presets, results regions, and success-only download", () => {
  const fieldIds = [
    "field-targetKg",
    "field-barKg",
    "field-pairs25",
    "field-pairs20",
    "field-pairs15",
    "field-pairs10",
    "field-pairs5",
    "field-pairs2_5",
    "field-pairs1_25",
  ];
  const errorIds = fieldIds.map((id) => id.replace("field-", "error-"));
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    for (const id of fieldIds) assert.ok(page.includes(`id="${id}"`), id);
    for (const id of errorIds) assert.ok(page.includes(`id="${id}"`), id);
    assert.ok(page.includes('id="bar-preset-20"'));
    assert.ok(page.includes('id="bar-preset-15"'));
    assert.ok(page.includes('id="bar-preset-10"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="plates-rows"'));
    assert.ok(page.includes('id="remainder-note"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
