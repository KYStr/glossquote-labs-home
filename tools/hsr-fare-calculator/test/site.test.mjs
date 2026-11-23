// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// bilingual fare note, the pinned FAQ answers, the draft-loss note,
// the form controls, and the download button that only appears on
// success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const FARE_NOTE_ZH =
  "票價以 2026-11-21 查核的台灣高鐵官方公告為準；官方調價後以新版為準，本工具不自動跟價。早鳥與大學生優惠只限指定車次且限量，買得到該折數時才適用表列價格。";
const FARE_NOTE_EN =
  "Fares follow the Taiwan High Speed Rail official tables as checked on 2026-11-21; later official fare changes apply instead, and this tool does not track them automatically. Early Bird and student discounts apply only to designated trains with limited quotas; the listed price applies only when that discount is available.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>高鐵票價試算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="選出發站與到達站、車廂與票種，依台灣高鐵官方公告票價表試算單張與多張總票價。">',
    ),
  );
  assert.ok(zh.includes("<h1>高鐵票價試算</h1>"));
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
  assert.ok(en.includes("<title>HSR Fare Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Pick origin and destination stations, cabin and fare type to estimate per-ticket and total Taiwan High Speed Rail fares from the official fare tables.">',
    ),
  );
  assert.ok(en.includes("<h1>HSR Fare Calculator</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages show the fare note in both languages", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes(FARE_NOTE_ZH));
    assert.ok(page.includes(FARE_NOTE_EN));
  }
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("票價是即時查詢嗎？"));
  assert.ok(zh.includes("不是，本工具依官方公告票價表靜態試算，不查班次與剩餘座位。"));
  assert.ok(zh.includes("早鳥或大學生優惠一定買得到嗎？"));
  assert.ok(zh.includes("不一定，只限指定車次且限量，買得到該折數時才適用表列價格。"));
  assert.ok(zh.includes("身高未滿 115 公分的兒童要買票嗎？"));
  assert.ok(zh.includes("不需佔位時得免票，每位全票或成年旅客最多帶 2 名；需要座位時應依規定購票。"));
  assert.ok(zh.includes("為什麼南港─台北沒有商務車廂票價？"));
  assert.ok(zh.includes("南港─台北、南港─板橋、台北─板橋三組短區間不發售商務車廂車票。"));
  assert.ok(en.includes("Is this a live fare lookup?"));
  assert.ok(en.includes("No. It estimates from the published official fare tables and does not check trains or seat availability."));
  assert.ok(en.includes("Are Early Bird or student discounts always available?"));
  assert.ok(en.includes("No. They apply only to designated trains with limited quotas; the listed price applies only when that discount is available."));
  assert.ok(en.includes("Does a child under 115 cm need a ticket?"));
  assert.ok(en.includes("No ticket is needed when no seat is used, up to 2 children per full-fare adult; a seat requires a ticket under the rules."));
  assert.ok(en.includes("Why is there no business fare for Nangang–Taipei?"));
  assert.ok(en.includes("Business class is not sold on the Nangang–Taipei, Nangang–Banqiao and Taipei–Banqiao short segments."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-origin"'));
    assert.ok(page.includes('id="field-destination"'));
    assert.ok(page.includes('id="field-cabin"'));
    assert.ok(page.includes('id="field-fareKind"'));
    assert.ok(page.includes('id="field-quantity"'));
    assert.ok(page.includes('id="error-origin"'));
    assert.ok(page.includes('id="error-destination"'));
    assert.ok(page.includes('id="error-cabin"'));
    assert.ok(page.includes('id="error-fareKind"'));
    assert.ok(page.includes('id="error-quantity"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="compare-rows"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});

test("both pages list all 12 stations in both selects", () => {
  for (const page of [zh, en]) {
    for (const code of ["NAG", "TPE", "BAQ", "TAY", "HSC", "MIL", "TAC", "CHH", "YUL", "CHY", "TAN", "ZUY"]) {
      assert.ok(page.includes(`value="${code}"`), `${code} missing`);
    }
    assert.ok(page.includes('value="TPE" selected'), "origin default must be TPE");
    assert.ok(page.includes('value="TAC" selected'), "destination default must be TAC");
    assert.ok(page.includes('value="standard" selected'), "cabin default must be standard");
    assert.ok(page.includes('value="full" selected'), "fareKind default must be full");
  }
});
