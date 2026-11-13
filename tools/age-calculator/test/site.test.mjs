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

const DISCLAIMER_ZH = "本工具依固定日曆規則推算年齡，不作入學、投票、兵役等法律資格判定。";
const DISCLAIMER_EN =
  "This tool calculates age by fixed calendar rules only; it does not determine legal eligibility for school entry, voting, or military service.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>年齡計算機｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入出生日期與參考日期（預設今天），得到足歲的年、月、日、總天數、出生星期與下一個生日倒數。">',
    ),
  );
  assert.ok(zh.includes("<h1>年齡計算機</h1>"));
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
  assert.ok(en.includes("<title>Age Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter a birth date and a reference date (today by default) to get the exact age in years, months and days, total days lived, the weekday of birth, and a countdown to the next birthday.">',
    ),
  );
  assert.ok(en.includes("<h1>Age Calculator</h1>"));
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
  assert.ok(zh.includes("2 月 29 日出生的人，非閏年幾號生日？"));
  assert.ok(zh.includes("本工具以 3 月 1 日為非閏年的觀察生日；閏年則為 2 月 29 日。"));
  assert.ok(zh.includes("年齡的「日」怎麼算？"));
  assert.ok(zh.includes("日數為負時，從參考月份往前逐月借完整天數。每借一次扣一個月，直到日數不再為負。"));
  assert.ok(zh.includes("參考日期可以是未來嗎？"));
  assert.ok(zh.includes("可以。例如先算孩子在入學日或某個紀念日的年齡；出生日期之後的任何合法日期都可以。"));
  assert.ok(en.includes("Born on February 29 — when is the birthday in a non-leap year?"));
  assert.ok(en.includes("This tool observes it on March 1 in non-leap years, and on February 29 in leap years."));
  assert.ok(en.includes("How are the days counted?"));
  assert.ok(en.includes("When the day count is negative, step backward from the reference month one month at a time. Add that month’s full length and subtract one month each time, until the day count is zero or more."));
  assert.ok(en.includes("Can the reference date be in the future?"));
  assert.ok(en.includes("Yes — for example, to find the age on a school-entry date or an anniversary; any valid date after the birth date works."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-birthDate"'));
    assert.ok(page.includes('id="field-referenceDate"'));
    assert.ok(page.includes('id="error-birthDate"'));
    assert.ok(page.includes('id="error-referenceDate"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="age-rows"'));
    assert.ok(page.includes('id="weekday-rows"'));
    assert.ok(page.includes('id="next-rows"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="today-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
