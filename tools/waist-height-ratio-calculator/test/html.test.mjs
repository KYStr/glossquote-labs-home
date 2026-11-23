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
  assert.ok(zh.includes("<title>腰高比計算機｜Gloss Tools</title>"));
  assert.ok(zh.includes("<h1>腰高比計算機</h1>"));
  assert.ok(
    zh.includes(
      'content="輸入腰圍與身高，算出腰高比，對照 NICE 分級判斷中心肥胖程度，並算出腰圍維持不到身高一半還差幾公分。"'
    )
  );
});

test("en page identity", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>Waist-to-Height Ratio Calculator | Gloss Tools</title>"));
  assert.ok(en.includes("<h1>Waist-to-Height Ratio Calculator</h1>"));
  assert.ok(
    en.includes(
      'content="Enter your waist and height to get your waist-to-height ratio, its NICE category, and how far your waist is from staying under half your height."'
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
      "input-waist",
      "input-height",
      "btn-run",
      "btn-example",
      "btn-cancel",
      "btn-reset",
      "btn-download",
      "status",
      "result",
      "result-sentence",
      "result-whtr",
      "result-category",
      "result-range",
      "result-lose",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
    }
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-live="polite"'));
  }
});

test("both pages carry the fixed disclaimer and the SPEC FAQs", () => {
  assert.ok(zh.includes("本工具僅供一般健康資訊參考，不是醫療診斷或建議；如有疑慮請諮詢醫事人員。"));
  assert.ok(en.includes("This tool provides general health information only. It is not a medical diagnosis or advice; consult a healthcare professional if you have concerns."));
  assert.ok(zh.includes("顯示 0.50 卻是健康，為什麼？"));
  assert.ok(en.includes("Why does it show 0.50 but say healthy?"));
  assert.ok(zh.includes("84.9 ÷ 170 = 0.4994…"));
  assert.ok(en.includes("84.9 ÷ 170 = 0.4994…"));
  assert.ok(zh.includes("站立放鬆，自然呼氣末量測"));
  assert.ok(en.includes("Stand relaxed and measure at the end of a normal breath out"));
});
