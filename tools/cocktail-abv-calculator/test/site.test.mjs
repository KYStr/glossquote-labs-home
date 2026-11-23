// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// bilingual disclaimer, guidance and contraction lines, the pinned
// FAQ answers, the draft-loss note, the form controls, and the
// download button that only appears on success. Ingredient rows are
// built by app.js, so the static pages carry the rows container
// (ingredient-rows) rather than per-row field ids.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const DISCLAIMER_ZH =
  "本結果為估算值，僅供參考，不構成醫療或法律建議；不估算血液酒精濃度。";
const DISCLAIMER_EN =
  "This result is an estimate for reference only and is not medical or legal advice; it does not estimate blood alcohol concentration.";
const GUIDANCE_ZH =
  "衛福部建議：男性每日不超過 2 單位、女性不超過 1 單位（1 單位＝10 g 純酒精）；不喝最健康。";
const GUIDANCE_EN =
  "MOHW guidance: no more than 2 units per day for men and 1 for women (1 unit = 10 g pure alcohol); not drinking is healthiest.";
const CONTRACTION_ZH = "體積以加法合計，未扣除混合體積收縮。";
const CONTRACTION_EN =
  "Volumes are summed additively; mixing contraction is not deducted.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>調酒酒精度｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="把配方裡 2–6 種材料的體積與酒精度加總，知道這一杯有多烈、相當於幾標準杯。">',
    ),
  );
  assert.ok(zh.includes("<h1>調酒酒精度</h1>"));
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
  assert.ok(en.includes("<title>Cocktail ABV Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Add up 2–6 ingredients by volume and ABV to see how strong a mixed drink is and how many standard drinks it holds.">',
    ),
  );
  assert.ok(en.includes("<h1>Cocktail ABV Calculator</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages show the disclaimer, guidance, and contraction lines in both languages", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes(DISCLAIMER_ZH));
    assert.ok(page.includes(DISCLAIMER_EN));
    assert.ok(page.includes(GUIDANCE_ZH));
    assert.ok(page.includes(GUIDANCE_EN));
    assert.ok(page.includes(CONTRACTION_ZH));
    assert.ok(page.includes(CONTRACTION_EN));
  }
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("總酒精度怎麼算？"));
  assert.ok(zh.includes("各材料純酒精體積加總除以總體積。"));
  assert.ok(zh.includes("標準杯是多少？"));
  assert.ok(zh.includes("台灣 1 標準杯＝10 g 純酒精。"));
  assert.ok(zh.includes("會估算血液酒精濃度嗎？"));
  assert.ok(zh.includes("不會，本工具只算調酒本身的酒精度。"));
  assert.ok(en.includes("How is total ABV calculated?"));
  assert.ok(en.includes("Total pure-alcohol volume divided by total volume."));
  assert.ok(en.includes("What is one standard drink?"));
  assert.ok(en.includes("In Taiwan, one standard drink is 10 g of pure alcohol."));
  assert.ok(en.includes("Does it estimate blood alcohol concentration?"));
  assert.ok(en.includes("No. It only calculates the mixed drink's own ABV."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="ingredient-rows"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="detail-rows"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="add-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
