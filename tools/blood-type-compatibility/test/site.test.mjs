import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Page expectations come from the spec's pinned preview convention and
// pinned bilingual strings (SPEC user flow + BRIEF), not from the built
// pages themselves.
const zh = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const en = await readFile(new URL("../public/en/index.html", import.meta.url), "utf8");

test("both pages are noindex previews with no canonical link", () => {
  for (const html of [zh, en]) {
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
    assert.ok(!html.includes("canonical"));
  }
});

test("language and home links stay relative and same-language", () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes('href="./en/index.html"'));
  assert.ok(zh.includes('href="../../"'));
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../../"'));
});

test("titles and headings are pinned per language", () => {
  assert.ok(zh.includes("<title>血型相容查詢｜Gloss Tools</title>"));
  assert.ok(zh.includes("<h1>血型相容查詢</h1>"));
  assert.ok(en.includes("<title>Blood Type Compatibility | Gloss Tools</title>"));
  assert.ok(en.includes("<h1>Blood Type Compatibility</h1>"));
});

test("the four single-mode section headings are pinned verbatim", () => {
  for (const heading of ["紅血球可捐給", "紅血球可接受自", "血漿可捐給", "血漿可接受自"]) {
    assert.ok(zh.includes(`<h3>${heading}</h3>`), heading);
  }
  for (const heading of [
    "Red cells you can give to",
    "Red cells you can receive from",
    "Plasma you can give to",
    "Plasma you can receive from",
  ]) {
    assert.ok(en.includes(`<h3>${heading}</h3>`), heading);
  }
});

test("plasma note and medical disclaimer are pinned verbatim", () => {
  assert.ok(zh.includes("血漿相容不看 Rh 因子，名單以 ABO 血型判定，同 ABO 的 Rh 陰性與陽性一併列出。"));
  assert.ok(zh.includes("本工具僅供教育參考，依標準血型相容表整理；實際輸血以血庫交叉配血與醫療專業判斷為準。"));
  assert.ok(en.includes("Plasma compatibility does not depend on the Rh factor; lists are decided by ABO group and include both Rh variants of each ABO group."));
  assert.ok(en.includes("For education only, based on the standard blood-type compatibility chart. Actual transfusion always follows blood-bank crossmatching and clinical judgement."));
});

test("field, group and error ids exist on both pages", () => {
  for (const html of [zh, en]) {
    for (const id of [
      "field-mode-single",
      "field-mode-pair",
      "field-bloodType",
      "field-donor",
      "field-recipient",
      "error-bloodType",
      "error-donor",
      "error-recipient",
      "group-single",
      "group-pair",
      "action-run",
      "action-download",
    ]) {
      assert.ok(html.includes(`id="${id}"`), id);
    }
  }
});

test("primary action labels are pinned", () => {
  assert.ok(zh.includes(">查詢相容性</button>"));
  assert.ok(zh.includes(">載入範例</button>"));
  assert.ok(en.includes(">Check compatibility</button>"));
  assert.ok(en.includes(">Load example</button>"));
});
