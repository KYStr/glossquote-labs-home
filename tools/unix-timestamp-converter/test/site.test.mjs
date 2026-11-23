// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// pinned FAQ answers, the draft-loss note, the form controls, and the
// download button that only appears on success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>Unix 時間戳轉換｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="把 Unix 時間戳換成人類可讀的日期時間，或把日期時間換回時間戳；UTC 與台北時間對照，支援秒／毫秒與多種輸出格式。">',
    ),
  );
  assert.ok(zh.includes("<h1>Unix 時間戳轉換</h1>"));
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
  assert.ok(en.includes("<title>Unix Timestamp Converter | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Convert a Unix timestamp to a human-readable date-time, or a date-time back to a timestamp; shown in UTC and Taipei time, with seconds/milliseconds and several output formats.">',
    ),
  );
  assert.ok(en.includes("<h1>Unix Timestamp Converter</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("毫秒和秒怎麼分？"));
  assert.ok(zh.includes("13 位數通常是毫秒，10 位數通常是秒；中間地帶請明確選擇單位。"));
  assert.ok(zh.includes("閏秒怎麼處理？"));
  assert.ok(zh.includes("Unix 時間不計閏秒，23:59:60 沒有獨立的時間戳。"));
  assert.ok(zh.includes("1970 年以前可以嗎？"));
  assert.ok(zh.includes("可以，負時間戳代表紀元之前。"));
  assert.ok(en.includes("How are milliseconds and seconds told apart?"));
  assert.ok(en.includes("13-digit values are usually milliseconds and 10-digit values seconds; values in between need an explicit unit choice."));
  assert.ok(en.includes("How are leap seconds handled?"));
  assert.ok(en.includes("Unix time does not count leap seconds, so 23:59:60 has no timestamp of its own."));
  assert.ok(en.includes("Can I convert dates before 1970?"));
  assert.ok(en.includes("Yes, negative timestamps are before the epoch."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-direction-timestamp"'));
    assert.ok(page.includes('id="field-direction-datetime"'));
    assert.ok(page.includes('id="field-timestamp"'));
    assert.ok(page.includes('id="field-unit"'));
    assert.ok(page.includes('id="field-date"'));
    assert.ok(page.includes('id="field-time"'));
    assert.ok(page.includes('id="field-milliseconds"'));
    assert.ok(page.includes('id="field-timezone"'));
    assert.ok(page.includes('id="field-format"'));
    assert.ok(page.includes('id="field-custom-pattern"'));
    assert.ok(page.includes('id="error-timestamp"'));
    assert.ok(page.includes('id="error-date"'));
    assert.ok(page.includes('id="error-time"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="displays-rows"'));
    assert.ok(page.includes('id="ambiguous-note"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="now-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});

test("both pages list all nine fixed time zones", () => {
  for (const page of [zh, en]) {
    for (const zone of [
      "UTC",
      "Asia/Taipei",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Europe/London",
      "Europe/Paris",
      "America/New_York",
      "America/Los_Angeles",
      "Australia/Sydney",
    ]) {
      assert.ok(page.includes(`value="${zone}"`), `${zone} missing`);
    }
  }
});
