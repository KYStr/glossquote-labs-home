import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const zh = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const en = await readFile(new URL("../public/en/index.html", import.meta.url), "utf8");

test("zh-Hant page carries the pinned head and identity", () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes("<title>工作日計算機｜Gloss Tools</title>"));
  assert.ok(zh.includes('<h1 id="page-title">工作日計算機</h1>'));
  assert.ok(
    zh.includes(
      '<meta name="description" content="計算兩個日期之間的工作日（扣除週末與自訂假日），或從某日起加減 N 個工作日得到目標日期；起日不計、訖日計入。">',
    ),
  );
});

test("en page carries the pinned head and identity", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>Workdays Calculator | Gloss Tools</title>"));
  assert.ok(en.includes('<h1 id="page-title">Workdays Calculator</h1>'));
  assert.ok(
    en.includes(
      '<meta name="description" content="Count business days between two dates (excluding weekends and your own holidays), or add and subtract business days from a date. The start date is excluded and the end date is included.">',
    ),
  );
});

test("both pages are preview candidates: noindex, no production canonical or hreflang links", () => {
  for (const html of [zh, en]) {
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
    assert.ok(!html.includes('rel="canonical"'));
    assert.ok(!html.includes('rel="alternate"'));
    assert.ok(!html.includes("http://") && !html.includes("https://"));
  }
});

test("both pages link home in the same language and cross-link languages by path only", () => {
  assert.ok(zh.includes('<a class="home-link" href="../../index.html">'));
  assert.ok(zh.includes('<a href="en/index.html" hreflang="en" lang="en">English</a>'));
  assert.ok(en.includes('<a class="home-link" href="../../en/index.html">'));
  assert.ok(en.includes('<a href="../index.html" hreflang="zh-Hant" lang="zh-Hant">繁體中文</a>'));
});

test("both pages present the rules and the three pinned FAQs", () => {
  assert.ok(zh.includes("起日不計入、訖日計入"));
  assert.ok(zh.includes("假日落在週末會重複扣嗎？"));
  assert.ok(zh.includes("有內建國定假日嗎？"));
  assert.ok(zh.includes("本工具不含任何官方行事曆"));
  assert.ok(en.includes("The start date is excluded and the end date is included"));
  assert.ok(en.includes("Is a holiday on a weekend subtracted twice?"));
  assert.ok(en.includes("Are national holidays built in?"));
  assert.ok(en.includes("no official calendar is included"));
});

test("both pages expose the full control set with matching ids", () => {
  for (const html of [zh, en]) {
    for (const id of [
      "workdays-form",
      "mode-count",
      "mode-shift",
      "start-date",
      "end-date",
      "days",
      "holidays",
      "run-btn",
      "cancel-btn",
      "example-btn",
      "reset-btn",
      "download-btn",
      "status",
      "result-panel",
      "result-count",
      "result-shift",
      "business-days-value",
      "result-date-value",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    }
    assert.ok(html.includes('type="module"'));
  }
});
