// Static page checks for both language entries: identity strings fixed by
// the SPEC, the fixed disclaimer in full, noindex candidate convention,
// same-language home links, and no production canonical/hreflang/sitemap
// artifacts.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const zh = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const en = await readFile(new URL("../public/en/index.html", import.meta.url), "utf8");

const ZH_DISCLAIMER =
  "此為依父母身高推估的統計估計，不是醫療建議，也不是對任何一位兒童的成長診斷或保證。遺傳只是影響成人身高的因素之一；實際身高還受營養、整體健康、睡眠與青春期時間等因素影響，個別兒童完全可能落在預估區間之外。";
const EN_DISCLAIMER =
  "This is a statistical estimate based on the parents' heights. It is not medical advice and is not a diagnosis or guarantee for any individual child. Genetics is only one of many factors that influence adult height; nutrition, overall health, sleep and the timing of puberty also matter, and an individual child may well finish outside the estimated range.";

test("zh page identity", () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes("<title>兒童身高預測｜Gloss Tools</title>"));
  assert.ok(zh.includes("<h1>兒童身高預測</h1>"));
  assert.ok(
    zh.includes(
      'content="輸入父親與母親的身高與孩子性別，以父母身高中值法估算孩子成年身高與 ±8.5 公分目標區間；僅為統計估計，不是醫療建議。"'
    )
  );
  assert.ok(zh.includes(ZH_DISCLAIMER), "fixed disclaimer in full on zh page");
});

test("en page identity", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>Child Height Predictor | Gloss Tools</title>"));
  assert.ok(en.includes("<h1>Child Height Predictor</h1>"));
  assert.ok(
    en.includes(
      'content="Estimate a child\'s adult height from the father\'s and mother\'s heights with the mid-parental (Tanner) method, shown with the ±8.5 cm target range. A statistical estimate, not medical advice."'
    )
  );
  assert.ok(en.includes(EN_DISCLAIMER), "fixed disclaimer in full on en page");
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
      "input-father",
      "input-mother",
      "btn-run",
      "btn-example",
      "btn-cancel",
      "btn-reset",
      "btn-download",
      "status",
      "result",
      "result-target",
      "result-low",
      "result-high",
      "result-disclaimer",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
    }
    assert.ok(html.includes('name="childSex" value="boy"'));
    assert.ok(html.includes('name="childSex" value="girl"'));
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-live="polite"'));
  }
});

test("both pages carry the four SPEC FAQs", () => {
  assert.ok(zh.includes("這個區間是什麼意思？"));
  assert.ok(zh.includes("為什麼男孩加 13 公分、女孩減 13 公分？"));
  assert.ok(zh.includes("需要輸入孩子現在的身高或年齡嗎？"));
  assert.ok(zh.includes("父母身高要填誰的？"));
  assert.ok(en.includes("What does the range mean?"));
  assert.ok(en.includes("Why add 13 cm for a boy and subtract it for a girl?"));
  assert.ok(en.includes("Do I need my child's current height or age?"));
  assert.ok(en.includes("Whose heights should I enter?"));
});
