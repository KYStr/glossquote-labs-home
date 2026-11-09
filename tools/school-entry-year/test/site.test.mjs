// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// fixed bilingual results note, the pinned FAQ answers, the
// draft-loss note, the form controls, and the download button that
// only appears on success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const NOTE_ZH =
  "公立幼兒園與國小依 9 月 1 日足歲劃分班級與入學年度；私立幼兒園收托月齡、提早入學與緩讀規定可能不同，實際請以各校及地方政府公告為準。";
const NOTE_EN =
  "Public kindergarten classes and elementary entry years are divided by age reached on September 1. Private kindergarten admission ages, early entry and delayed entry rules may differ; check the school and local government announcements.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>入學年度與年級推算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入孩子出生日期，依 9 月 1 日前足六歲的規則推算小一入學年月、學年度、入學時年齡、幼兒園入學年與十二年就學對照表。">',
    ),
  );
  assert.ok(zh.includes("<h1>入學年度與年級推算</h1>"));
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
  assert.ok(en.includes("<title>School Entry Year Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter a child\'s birth date to derive the Taiwan elementary entry September, school year, age at entry, kindergarten entry years and a 12-year grade projection from the September 1 age-six rule.">',
    ),
  );
  assert.ok(en.includes("<h1>School Entry Year Calculator</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages show the fixed results note in both languages", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes(NOTE_ZH));
    assert.ok(page.includes(NOTE_EN));
  }
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("差一天為什麼差一屆？"));
  assert.ok(zh.includes("9 月 1 日（含）前出生、當年 9 月 1 日已足六歲者當年入學；9 月 2 日出生者要等下一個 9 月。"));
  assert.ok(zh.includes("2 月 29 日出生怎麼算？"));
  assert.ok(zh.includes("非閏年以 3 月 1 日為生日屆滿日；入學仍以入學年 9 月 1 日前是否足六歲判定。"));
  assert.ok(en.includes("Why does one day change the cohort?"));
  assert.ok(en.includes("Children who have turned six on or before September 1 enter that September; a September 2 birthday waits until the next September."));
  assert.ok(en.includes("Born on February 29?"));
  assert.ok(en.includes("In non-leap years the birthday is observed on March 1; entry still turns on being six by September 1 of the entry year."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-birthDate"'));
    assert.ok(page.includes('id="field-asOfDate"'));
    assert.ok(page.includes('id="error-birthDate"'));
    assert.ok(page.includes('id="error-asOfDate"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="entry-rows"'));
    assert.ok(page.includes('id="current-rows"'));
    assert.ok(page.includes('id="kindergarten-rows"'));
    assert.ok(page.includes('id="projection-rows"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="today-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
