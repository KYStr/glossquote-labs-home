// Page tests: both static pages carry the SPEC-pinned metadata and
// texts, the candidate carries no canonical/hreflang, and the core's
// bilingual message table matches the SPEC word for word.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ERROR_MESSAGES, messageFor } from "../public/js/core/one-rep-max.mjs";

const PAGES = [
  {
    path: new URL("../public/index.html", import.meta.url),
    lang: "zh-Hant",
    title: "最大肌力 1RM 計算機｜Gloss Tools",
    description:
      "輸入你能完成的重量與次數，用 Epley 與 Brzycki 兩個公式估算最大肌力（1RM），並列出各百分比對應的訓練重量。",
    h1: "最大肌力 1RM 計算機",
  },
  {
    path: new URL("../public/en/index.html", import.meta.url),
    lang: "en",
    title: "One-Rep Max Calculator | Gloss Tools",
    description:
      "Estimate your one-rep max from a weight and rep count with the Epley and Brzycki formulas, and see training loads for each percentage of your 1RM.",
    h1: "One-Rep Max Calculator",
  },
];

for (const page of PAGES) {
  test(`page ${page.lang}: pinned metadata, noindex, no canonical/hreflang`, async () => {
    const html = await readFile(page.path, "utf8");
    assert.ok(html.includes(`<html lang="${page.lang}">`));
    assert.ok(html.includes(`<title>${page.title}</title>`));
    assert.ok(html.includes(`<meta name="description" content="${page.description}">`));
    assert.ok(html.includes(`<h1>${page.h1}</h1>`));
    assert.ok(html.includes('content="noindex, nofollow"'));
    assert.ok(!html.includes("canonical"));
    assert.ok(!html.includes("hreflang"));
  });
}

test("the SPEC-pinned bilingual error table resolves through messageFor", () => {
  const flat = [
    ["SCHEMA", null, "輸入格式不正確", "The input is malformed."],
    ["INPUT_LIMIT", "weight", "輸入太長", "Input is too long."],
    ["UNICODE", "reps", "輸入含無效字元", "Input contains an invalid character."],
    ["DECIMAL_FORMAT", "weight", "重量必須是數字，最多兩位小數", "Weight must be a number with at most two decimal places."],
    ["INTEGER_FORMAT", "reps", "次數必須是整數", "Reps must be a whole number."],
    ["ENUM", "unit", "單位只能是公斤或磅", "Unit must be kilograms or pounds."],
    ["INTERNAL", null, "發生錯誤，請再試一次", "Something went wrong. Try again."],
    ["EMPTY", "weight", "請輸入重量", "Enter the weight."],
    ["EMPTY", "reps", "請輸入次數", "Enter the reps."],
    ["RANGE", "weight", "重量必須大於 0 且不超過 1500", "Weight must be greater than 0 and at most 1500."],
    ["RANGE", "reps", "次數必須介於 1 到 30", "Reps must be between 1 and 30."],
  ];
  for (const [code, field, zh, en] of flat) {
    assert.equal(messageFor({ code, field, row: null }, "zh-Hant"), zh, `${code}/${field} zh`);
    assert.equal(messageFor({ code, field, row: null }, "en"), en, `${code}/${field} en`);
  }
  assert.equal(ERROR_MESSAGES.EMPTY.weight.en, "Enter the weight.");
  assert.equal(ERROR_MESSAGES.RANGE.reps["zh-Hant"], "次數必須介於 1 到 30");
});
