// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// bilingual structural disclaimer, the pinned FAQ answers, the
// draft-loss note, the form controls, and the download button that
// only appears on success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const DISCLAIMER_ZH =
  "這是採購估算，不是結構設計；承重、配比與施工請依專業設計。";
const DISCLAIMER_EN =
  "This is a purchasing estimate, not a structural design; follow professional design for load-bearing, mix and workmanship.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>磚塊用量計算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入牆長、牆高、門窗開口、磚種、灰縫與損耗率，算出淨磚數、應購磚數與砂漿體積。">',
    ),
  );
  assert.ok(zh.includes("<h1>磚塊用量計算</h1>"));
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
  assert.ok(en.includes("<title>Brick Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter wall size, openings, brick type, joint and waste to get net bricks, bricks to buy and mortar volume.">',
    ),
  );
  assert.ok(en.includes("<h1>Brick Calculator</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages show the structural disclaimer in both languages", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes(DISCLAIMER_ZH));
    assert.ok(page.includes(DISCLAIMER_EN));
  }
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("損耗加在哪裡？"));
  assert.ok(zh.includes("損耗加在未捨入的淨磚數上再無條件進位，不是加在已進位的整數上。"));
  assert.ok(zh.includes("灰縫 0 時砂漿為什麼是 0？"));
  assert.ok(zh.includes("本工具的砂漿是牆體減磚體的差值，灰縫為 0 代表磚與磚之間沒有砂漿空間。"));
  assert.ok(zh.includes("這是結構設計嗎？"));
  assert.ok(zh.includes("不是。這是採購估算，不做結構設計；承重、配比與施工請依專業設計。"));
  assert.ok(en.includes("Where is waste applied?"));
  assert.ok(en.includes("Waste is added to the unrounded net brick count, then rounded up — never to the already-rounded integer."));
  assert.ok(en.includes("Why is mortar zero with a 0 mm joint?"));
  assert.ok(en.includes("Mortar here is wall volume minus brick volume, so a zero joint leaves no mortar space."));
  assert.ok(en.includes("Is this a structural design?"));
  assert.ok(en.includes("No. This is a purchasing estimate, not a structural design; follow professional design for load-bearing, mix and workmanship."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, openings, custom dims, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-wallLengthM"'));
    assert.ok(page.includes('id="field-wallHeightM"'));
    assert.ok(page.includes('id="field-brickPreset"'));
    assert.ok(page.includes('id="field-brickLengthMm"'));
    assert.ok(page.includes('id="field-brickHeightMm"'));
    assert.ok(page.includes('id="field-brickWidthMm"'));
    assert.ok(page.includes('id="field-jointMm"'));
    assert.ok(page.includes('id="field-wastePct"'));
    assert.ok(page.includes('id="error-wallLengthM"'));
    assert.ok(page.includes('id="error-openings"'));
    assert.ok(page.includes('id="openings-list"'));
    assert.ok(page.includes('id="add-opening-btn"'));
    assert.ok(page.includes('id="custom-dims"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="detail-rows"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
