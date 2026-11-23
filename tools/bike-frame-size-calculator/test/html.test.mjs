// Static page checks for both language entries: identity strings fixed by
// the SPEC, noindex candidate convention, same-language home links, and no
// production canonical/hreflang/sitemap artifacts.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const zh = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const en = await readFile(new URL("../public/en/index.html", import.meta.url), "utf8");

test("zh page identity", () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes("<title>單車車架尺寸計算｜Gloss Tools</title>"));
  assert.ok(zh.includes("<h1>單車車架尺寸計算</h1>"));
  assert.ok(
    zh.includes(
      'content="輸入身高與跨高，算出公路車、登山車、混合車的建議車架尺寸範圍（公分與英吋對照），再對品牌尺寸表與實車試騎確認。"'
    )
  );
});

test("en page identity", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>Bike Frame Size Calculator | Gloss Tools</title>"));
  assert.ok(en.includes("<h1>Bike Frame Size Calculator</h1>"));
  assert.ok(
    en.includes(
      'content="Enter your height and inseam to get a recommended frame-size range in centimetres and inches for road, mountain and hybrid bikes, then confirm against the brand size chart and a test ride."'
    )
  );
});

test("candidate conventions on both pages", () => {
  for (const html of [zh, en]) {
    assert.ok(html.includes('name="robots" content="noindex, nofollow"'));
    assert.ok(!html.includes('rel="canonical"'), "no production canonical in candidate");
    assert.ok(!html.includes('rel="alternate"'), "no production hreflang in candidate");
    assert.ok(!/src="https?:/.test(html), "no external scripts");
    assert.ok(!/href="https?:/.test(html), "no external links");
  }
  // Same-language home links use ../../ per the house convention.
  assert.ok(zh.includes('href="../../index.html"'));
  assert.ok(en.includes('href="../../en/index.html"'));
  // Cross-language links keep to paths only.
  assert.ok(zh.includes('href="en/index.html"'));
  assert.ok(en.includes('href="../index.html"'));
});

test("both pages expose the full control set", () => {
  for (const html of [zh, en]) {
    for (const id of [
      "calc-form",
      "input-height",
      "input-inseam",
      "input-type-road",
      "input-type-mountain",
      "input-type-hybrid",
      "btn-run",
      "btn-example",
      "btn-cancel",
      "btn-reset",
      "btn-download",
      "status",
      "result",
      "result-sentence",
      "result-centre",
      "result-range-cm",
      "result-range-in",
      "result-letter",
      "result-saddle",
      "result-warning",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
    }
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-live="polite"'));
  }
});

test("both pages carry the fixed disclaimer and the SPEC FAQs", () => {
  assert.ok(zh.includes("這是建議起點；品牌幾何不同，最終以品牌尺寸表與實車試騎為準。"));
  assert.ok(en.includes("This is a starting point. Brands differ in geometry; confirm against the brand size chart and a test ride."));
  assert.ok(zh.includes("這個尺寸可以直接下單嗎？"));
  assert.ok(en.includes("Can I order this size directly?"));
  assert.ok(zh.includes("英吋欄是店家標示的尺寸嗎？"));
  assert.ok(en.includes("Is the inch figure the shop size?"));
  assert.ok(zh.includes("褲子內長可以直接填嗎？"));
  assert.ok(en.includes("Can I enter my trouser inseam?"));
  assert.ok(zh.includes("褲子內長比騎乘跨高短約 1–2 英吋"));
  assert.ok(en.includes("a trouser inseam runs about 1–2 inches shorter than a cycling inseam"));
  assert.ok(zh.includes("赤腳、背貼牆、雙腳相距約 15–20 公分"));
  assert.ok(en.includes("Barefoot, back against a wall, feet about 15–20 cm apart"));
});
