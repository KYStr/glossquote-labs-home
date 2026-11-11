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
  assert.ok(zh.includes("工具以 FDA 營養標示的家用量測定義換算，1 杯為 240 mL。美國習慣杯約為 236.588 mL。"));
  assert.ok(zh.includes("為什麼 1 杯水不是 240 公克？"));
  assert.ok(zh.includes("把水的體積換算成重量時，工具採食材重量表的 227 g／杯估值。純體積換算時，1 杯等於 240 mL。"));
  assert.ok(zh.includes("沒有我要的食材怎麼辦？"));
  assert.ok(zh.includes("重量與體積互換只能用表內 12 種食材；只換體積時選「不指定」即可，不需食材。"));
  const en = htmlByName.en;
  assert.ok(en.includes("How many millilitres is a cup here?"));
  assert.ok(en.includes("This tool uses the FDA household measure for nutrition labelling: 240 mL per cup. A US customary cup is about 236.588 mL."));
  assert.ok(en.includes("Why isn't a cup of water 240 grams?"));
  assert.ok(en.includes("For volume-to-weight conversions, the tool uses the ingredient chart’s estimate of 227 g per cup of water. For volume-only conversions, 1 cup equals 240 mL."));
  assert.ok(en.includes("What if my ingredient is not listed?"));
  assert.ok(en.includes('Weight-to-volume conversion only works for the 12 table ingredients; for volume-only conversions choose "None".'));
});

test("both locales link the same publisher references and explain the ingredient model", () => {
  const publisherLinks = [
    "https://www.kingarthurbaking.com/learn/ingredient-weight-chart",
    "https://shop.kingarthurbaking.com/content/class-pdfs/EasyAsPie_February2025.pdf#page=1",
  ];
  for (const [name, html] of Object.entries(htmlByName)) {
    const outbound = [...html.matchAll(/<a href="(https:\/\/[^"]+)" rel="noreferrer">([^<]+)<\/a>/g)];
    assert.deepEqual(outbound.map((match) => match[1]), publisherLinks, name);
    assert.ok(html.includes("336 g") && html.includes("89 g") && html.includes("1.4%"), name);
  }
  assert.match(htmlByName.zh, /教材 <a [^>]+>Easy As Pie<\/a> 第 1 頁的無鹽奶油值，1 杯為 227 g/);
  assert.match(htmlByName.en, /page 1 of King Arthur Baking’s <a [^>]+>Easy As Pie<\/a> gives 227 g per cup of unsalted butter/);
});
