// HTML tests. Static checks on both language pages: metadata required by
// the SPEC, same-language home links, FAQ wording, and every element id the
// app reads. No browser is involved.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const zh = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const en = await readFile(new URL("../public/en/index.html", import.meta.url), "utf8");

const appSource = await readFile(
  new URL("../public/js/app.js", import.meta.url),
  "utf8"
);
// Every id the app looks up with getElementById must exist in both pages.
const appIds = [...appSource.matchAll(/\$\("([A-Za-z0-9-]+)"\)/g)].map((m) => m[1]);

test("zh page metadata matches the SPEC", () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes("<title>派對採購試算｜Gloss Tools</title>"));
  assert.ok(zh.includes("<h1>派對採購試算</h1>"));
  assert.ok(
    zh.includes(
      'content="輸入賓客人數、派對時長與餐型，算出食物、飲料、杯子、盤子與冰塊各要買多少。"'
    )
  );
  assert.ok(zh.includes('name="robots" content="noindex, nofollow"'));
  assert.ok(!zh.includes('rel="canonical"'));
  assert.ok(zh.includes('href="../../index.html"'));
  assert.ok(zh.includes('href="en/index.html"'));
  assert.ok(!/src="https?:|href="https?:/.test(zh));
});

test("en page metadata matches the SPEC", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>Party Supply Calculator | Gloss Tools</title>"));
  assert.ok(en.includes("<h1>Party Supply Calculator</h1>"));
  assert.ok(
    en.includes(
      'content="Enter guest count, party duration and meal type to work out how much food, drink, cups, plates and ice to buy."'
    )
  );
  assert.ok(en.includes('name="robots" content="noindex, nofollow"'));
  assert.ok(!en.includes('rel="canonical"'));
  assert.ok(en.includes('href="../../en/index.html"'));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(!/src="https?:|href="https?:/.test(en));
});

test("both pages carry the three SPEC FAQs in their own language", () => {
  for (const q of [
    "這些數字是保證嗎？",
    "飲料為什麼是首小時 2 份、之後每小時 1 份？",
    "冰塊 0.5 公斤是怎麼來的？",
  ]) {
    assert.ok(zh.includes(q), q);
  }
  for (const q of [
    "Are these quantities guaranteed?",
    "Why 2 drinks in the first hour and 1 per hour after?",
    "Where does 0.5 kg of ice per person come from?",
  ]) {
    assert.ok(en.includes(q), q);
  }
});

test("every id the app reads exists in both pages", () => {
  assert.ok(appIds.length > 0);
  for (const id of new Set(appIds)) {
    assert.ok(zh.includes(`id="${id}"`), `zh missing #${id}`);
    assert.ok(en.includes(`id="${id}"`), `en missing #${id}`);
  }
});

test("meal radio values are exactly the three SPEC values, full checked by default", () => {
  for (const page of [zh, en]) {
    for (const value of ["snacks", "light", "full"]) {
      assert.ok(page.includes(`name="mealType" value="${value}"`), value);
    }
    assert.ok(page.includes('name="mealType" value="full" checked'));
  }
});

test("both pages load the same app and stylesheet by relative path", () => {
  assert.ok(zh.includes('<script type="module" src="js/app.js"></script>'));
  assert.ok(en.includes('<script type="module" src="../js/app.js"></script>'));
  assert.ok(zh.includes('<link rel="stylesheet" href="styles/app.css">'));
  assert.ok(en.includes('<link rel="stylesheet" href="../styles/app.css">'));
});
