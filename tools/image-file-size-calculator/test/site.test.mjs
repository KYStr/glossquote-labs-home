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

const ESTIMATE_NOTE_ZH = "估算值，非實際檔案大小";
const ESTIMATE_NOTE_EN = "Estimate, not the actual file size";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>圖片檔案大小估算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入圖片寬×高像素、色彩深度與格式，估算靜態圖片的檔案大小（KB／MB）。">',
    ),
  );
  assert.ok(zh.includes("<h1>圖片檔案大小估算</h1>"));
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
  assert.ok(en.includes("<title>Image File Size Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Estimate a still image\'s file size from its pixel dimensions, bit depth and format.">',
    ),
  );
  assert.ok(en.includes("<h1>Image File Size Calculator</h1>"));
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
    assert.ok(page.includes(ESTIMATE_NOTE_ZH));
    assert.ok(page.includes(ESTIMATE_NOTE_EN));
  }
});

test("both pages carry the pinned FAQ answers", () => {
  const zhFaq = [
    "估算值準嗎？",
    "實際檔案大小依圖片內容、編碼器與品質設定而異，本工具給的是典型估算值，不是實際檔案大小。",
    "1 KB 是 1000 還是 1024 bytes？",
    "本工具 1 KB = 1024 bytes、1 MB = 1024 KB。",
    "影片可以用嗎？",
    "不行。影片大小以位元率 × 時長估算，本工具只算靜態圖片。",
  ];
  const enFaq = [
    "Are estimates accurate?",
    "Actual file size depends on image content, encoder and quality settings; this tool gives a typical estimate, not the actual file size.",
    "Is 1 KB 1000 or 1024 bytes?",
    "This tool uses 1 KB = 1024 bytes and 1 MB = 1024 KB.",
    "Can I use it for video?",
    "No. Video size is estimated from bitrate × duration; this tool is for still images only.",
  ];
  for (const text of zhFaq) assert.ok(zh.includes(text), `zh FAQ missing: ${text}`);
  for (const text of enFaq) assert.ok(en.includes(text), `en FAQ missing: ${text}`);
});

test("both pages carry the draft-loss note", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages have the four form controls, error slots, and result regions", () => {
  for (const page of [zh, en]) {
    for (const id of ["field-widthPx", "field-heightPx", "field-bitDepth", "field-format"]) {
      assert.ok(page.includes(`id="${id}"`), `missing input ${id}`);
    }
    for (const id of ["error-widthPx", "error-heightPx", "error-bitDepth", "error-format"]) {
      assert.ok(page.includes(`id="${id}"`), `missing error slot ${id}`);
    }
    for (const id of ["summary-rows", "detail-rows", "estimate-note"]) {
      assert.ok(page.includes(`id="${id}"`), `missing results region ${id}`);
    }
    assert.ok(page.includes('id="download-btn"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('role="status"'));
  }
});

test("both pages list all seven formats and all seven bit depths as options", () => {
  for (const page of [zh, en]) {
    for (const value of ["uncompressed", "jpeg", "png", "webp-lossy", "webp-lossless", "gif", "avif"]) {
      assert.ok(page.includes(`value="${value}"`), `missing format option ${value}`);
    }
    for (const value of ["1", "8", "16", "24", "32", "48", "64"]) {
      assert.ok(page.includes(`value="${value}"`), `missing bit depth option ${value}`);
    }
    // The SPEC defaults: 24-bit and jpeg are preselected.
    assert.ok(page.includes('<option value="24" selected>'));
    assert.ok(page.includes('<option value="jpeg" selected>'));
  }
});

test("the pinned factor values appear on both pages", () => {
  for (const page of [zh, en]) {
    for (const factor of ["1.00", "0.10", "0.40", "0.07", "0.30", "0.25", "0.05"]) {
      assert.ok(page.includes(factor), `missing factor ${factor}`);
    }
  }
});
