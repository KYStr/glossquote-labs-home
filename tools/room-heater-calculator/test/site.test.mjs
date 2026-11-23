// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// bilingual estimate note, the pinned FAQ answers, the draft-loss
// note, the form controls, and the download button that only appears
// on success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const NOTE_ZH =
  "本工具是選型估算，不是專業熱損失計算；結果僅供購買參考。大坪數、挑高或特殊格局請諮詢專業人員。";
const NOTE_EN =
  "This tool is a sizing estimate, not a professional heat-loss calculation; the result is for purchase guidance only. For large rooms, high ceilings or unusual layouts, consult a professional.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>暖氣功率試算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="冬天買電暖器前，先確認房間需要幾瓦：填入面積、天花板高度與隔熱等級，算出所需瓦數與建議規格。">',
    ),
  );
  assert.ok(zh.includes("<h1>暖氣功率試算</h1>"));
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
  assert.ok(en.includes("<title>Room Heater Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Before buying a space heater, check how many watts your room needs from its area, ceiling height and insulation level.">',
    ),
  );
  assert.ok(en.includes("<h1>Room Heater Calculator</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages show the estimate note in both languages", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes(NOTE_ZH));
    assert.ok(page.includes(NOTE_EN));
  }
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("坪怎麼換算？"));
  assert.ok(zh.includes("1 坪＝400/121 平方公尺（約 3.305785 m²）。"));
  assert.ok(zh.includes("這是專業熱損失計算嗎？"));
  assert.ok(zh.includes("不是，這是依隔熱等級的經驗法則估算，僅供選購參考；大坪數、挑高或特殊格局請諮詢專業人員。"));
  assert.ok(zh.includes("為什麼建議規格比所需瓦數大？"));
  assert.ok(zh.includes("市售電暖器只有固定瓦數檔位，建議取大於等於所需瓦數的最小檔位；超過 3000 W 時建議分裝多台 2000 W。"));
  assert.ok(en.includes("How is 坪 converted?"));
  assert.ok(en.includes("1 坪 = 400/121 m² (about 3.305785 m²)."));
  assert.ok(en.includes("Is this a professional heat-loss calculation?"));
  assert.ok(en.includes("No, it is a rule-of-thumb estimate by insulation level, for sizing guidance only; consult a professional for large rooms, high ceilings or unusual layouts."));
  assert.ok(en.includes("Why is the recommended size larger than the required wattage?"));
  assert.ok(en.includes("Heaters are sold in fixed wattage steps, so the recommendation is the smallest step at or above the required wattage; above 3000 W, use multiple 2000 W units."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-area"'));
    assert.ok(page.includes('id="field-area-unit"'));
    assert.ok(page.includes('id="field-ceiling-height"'));
    assert.ok(page.includes('id="field-insulation"'));
    assert.ok(page.includes('id="error-area"'));
    assert.ok(page.includes('id="error-area-unit"'));
    assert.ok(page.includes('id="error-ceiling-height"'));
    assert.ok(page.includes('id="error-insulation"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="detail-rows"'));
    assert.ok(page.includes('id="multi-note"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
