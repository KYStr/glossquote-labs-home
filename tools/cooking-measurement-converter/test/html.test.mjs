// Static HTML checks for both language pages: language, title,
// description, h1, preview noindex, no canonical/hreflang, id parity,
// the pinned FAQ text, and the full pinned density table rendered
// statically. The strings below are copied from the SPEC, not from the
// implementation.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DENSITY } from "../public/js/core/convert.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const pages = [
  {
    name: "zh",
    file: "public/index.html",
    lang: "zh-Hant",
    title: "料理單位換算｜Gloss Tools",
    h1: "料理單位換算",
    description:
      "把杯、湯匙、茶匙、毫升與公克互相換算；麵粉、糖、奶油等 12 種食材的重量換算只經一張固定密度表。",
    home: 'href="../../"',
  },
  {
    name: "en",
    file: "public/en/index.html",
    lang: "en",
    title: "Cooking Measurement Converter | Gloss Tools",
    h1: "Cooking Measurement Converter",
    description:
      "Convert between cups, tablespoons, teaspoons, millilitres and grams, with weight conversions for 12 common ingredients through one fixed density table.",
    home: 'href="../../en/"',
  },
];

const htmlByName = {};
for (const page of pages) {
  htmlByName[page.name] = await readFile(path.join(root, page.file), "utf8");
}

for (const page of pages) {
  test(`${page.name}: metadata, h1, preview rules, home link`, () => {
    const html = htmlByName[page.name];
    assert.ok(html.includes(`<html lang="${page.lang}">`));
    assert.ok(html.includes(`<title>${page.title}</title>`));
    assert.ok(html.includes(`<meta name="description" content="${page.description}">`));
    assert.ok(html.includes(`<h1>${page.h1}</h1>`));
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
    assert.ok(!html.includes("canonical"), "no canonical in preview");
    assert.ok(!html.includes("hreflang"), "no hreflang in preview");
    assert.ok(html.includes(page.home), "same-language home link");
    assert.ok(!/<script(?![^>]*\bsrc=)/.test(html), "no inline script");
    assert.ok(!/\son\w+\s*=/.test(html), "no inline event handlers");
  });

  test(`${page.name}: every density row is rendered statically`, () => {
    const html = htmlByName[page.name];
    for (const row of DENSITY) {
      assert.ok(
        html.includes(`<td>${row.zh}</td><td>${row.en}</td><td>${row.gramsPerCup}</td>`),
        `${page.name} row ${row.id}`,
      );
    }
  });

  test(`${page.name}: all unit and ingredient options exist`, () => {
    const html = htmlByName[page.name];
    for (const unit of ["ml", "tsp", "tbsp", "cup", "g"]) {
      assert.ok(html.includes(`<option value="${unit}"`), `${page.name} unit ${unit}`);
    }
    for (const row of DENSITY) {
      assert.ok(html.includes(`<option value="${row.id}"`), `${page.name} ingredient ${row.id}`);
    }
    assert.ok(html.includes('<option value="none"'));
  });
}

test("both pages expose the same element ids", () => {
  const ids = (html) => new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  assert.deepEqual(ids(htmlByName.en), ids(htmlByName.zh));
});

test("the pinned FAQ text appears verbatim", () => {
  const zh = htmlByName.zh;
  assert.ok(zh.includes("這裡的 1 杯是幾毫升？"));
  assert.ok(zh.includes("釘版 240 ml（FDA 家用量測定義）；美國習慣單位的精確值是 236.588 ml，本工具不採用。"));
  assert.ok(zh.includes("為什麼 1 杯水不是 240 公克？"));
  assert.ok(zh.includes("密度表全表同源 King Arthur 食材重量表，水在該表為 227 g／杯；純體積換算（杯↔毫升）不查表。"));
  assert.ok(zh.includes("沒有我要的食材怎麼辦？"));
  assert.ok(zh.includes("重量與體積互換只能用表內 12 種食材；只換體積時選「不指定」即可，不需食材。"));
  const en = htmlByName.en;
  assert.ok(en.includes("How many millilitres is a cup here?"));
  assert.ok(en.includes("A pinned 240 ml (the FDA household measure); the exact US customary cup is 236.588 ml and is not used."));
  assert.ok(en.includes("Why isn't a cup of water 240 grams?"));
  assert.ok(en.includes("The density table follows one source, King Arthur's ingredient weight chart, which lists water at 227 g per cup; pure volume conversions never use the table."));
  assert.ok(en.includes("What if my ingredient is not listed?"));
  assert.ok(en.includes('Weight-to-volume conversion only works for the 12 table ingredients; for volume-only conversions choose "None".'));
});
