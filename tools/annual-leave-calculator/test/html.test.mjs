import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const zh = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const en = await readFile(new URL("../public/en/index.html", import.meta.url), "utf8");

test("zh-Hant page carries the pinned head and identity", () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes("<title>特休假計算機｜Gloss Tools</title>"));
  assert.ok(zh.includes('<h1 id="page-title">特休假計算機</h1>'));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入到職日與基準日，依勞動基準法第 38 條算出本週期特休天數、本週期起訖與剩餘天數。">',
    ),
  );
});

test("en page carries the pinned head and identity", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>Annual Leave Calculator | Gloss Tools</title>"));
  assert.ok(en.includes('<h1 id="page-title">Annual Leave Calculator</h1>'));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter a start date and a reference date to get statutory annual leave days, the current leave period and remaining days under Article 38 of Taiwan\'s Labor Standards Act.">',
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

test("both pages present the statutory table, legal basis, and FAQ", () => {
  assert.ok(zh.includes("勞動基準法第 38 條"));
  assert.ok(zh.includes("非閏年以 2 月 28 日為周年日"));
  assert.ok(zh.includes("這是公司正式的請假系統嗎？"));
  assert.ok(en.includes("Labor Standards Act Article 38"));
  assert.ok(en.includes("In non-leap years the anniversary falls on Feb 28."));
  assert.ok(en.includes("Is this an official leave system?"));
});

test("both pages expose the full control set with matching ids", () => {
  for (const html of [zh, en]) {
    for (const id of [
      "leave-form",
      "start-date",
      "reference-date",
      "used-days",
      "run-btn",
      "cancel-btn",
      "example-btn",
      "today-btn",
      "reset-btn",
      "status",
      "result-panel",
      "result-body",
      "remaining-value",
      "feb29-note",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    }
    assert.ok(html.includes('type="module"'));
  }
});
