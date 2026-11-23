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
  assert.ok(zh.includes("<title>紫外線指數指南｜Gloss Tools</title>"));
  assert.ok(zh.includes("<h1>紫外線指數指南</h1>"));
  assert.ok(
    zh.includes(
      'content="輸入紫外線指數與膚質，對照 WHO／中央氣象署分級，取得等級、顏色與防曬建議。"'
    )
  );
});

test("en page identity", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>UV Index Guide | Gloss Tools</title>"));
  assert.ok(en.includes("<h1>UV Index Guide</h1>"));
  assert.ok(
    en.includes(
      'content="Enter the UV index and your skin type to get the WHO / CWA category, colour and sun-protection advice."'
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
      "input-uv",
      "select-skin",
      "error-uv",
      "error-skin",
      "btn-run",
      "btn-example",
      "btn-cancel",
      "btn-reset",
      "btn-download",
      "status",
      "result",
      "result-sentence",
      "result-swatch",
      "result-category",
      "result-spf",
      "result-burn",
      "result-cwa",
      "result-advice",
      "result-skin",
      "result-disclaimer",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
    }
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-live="polite"'));
  }
  // Skin select offers all six Fitzpatrick types, default III.
  for (const html of [zh, en]) {
    for (const value of ["I", "II", "III", "IV", "V", "VI"]) {
      assert.ok(html.includes(`value="${value}"`), `missing skin option ${value}`);
    }
    assert.ok(html.includes('value="III" selected'));
  }
  // Default draft values are the SPEC defaults.
  assert.ok(zh.includes('value="5"'));
  assert.ok(en.includes('value="5"'));
});

test("both pages carry the verbatim disclaimer and the SPEC FAQs", () => {
  assert.ok(zh.includes("本工具僅供一般參考，不構成醫療建議。曬紅時間為估計值，個人差異很大；防曬請以官方建議為準。"));
  assert.ok(en.includes("This tool is for general reference only and is not medical advice. Time-to-redness is an estimate; individual variation is large. Follow official sun-protection guidance."));
  assert.ok(zh.includes("指數 3 以上就要防曬嗎？"));
  assert.ok(en.includes("Do I need protection at UV index 3 and above?"));
  assert.ok(zh.includes("曬紅時間是安全時間嗎？"));
  assert.ok(en.includes("Is the time to redness a safe time?"));
  assert.ok(zh.includes("不是，是未防護下出現紅斑的估計值，個人差異很大，不可當作可以曬多久的保證。"));
  assert.ok(en.includes("No — it is an estimate of when redness appears without protection; individual variation is large and it is not a guarantee of how long you can stay in the sun."));
  // The estimate is always negated as a safe time, never presented as one.
  assert.ok(zh.includes("不是安全曝曬時間"));
  assert.ok(en.includes("not a safe exposure time"));
  assert.ok(zh.includes("不是安全時間"));
  assert.ok(en.includes("not a safe time"));
});
