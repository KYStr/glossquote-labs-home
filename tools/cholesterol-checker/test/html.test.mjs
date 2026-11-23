// Static page checks for both language entries: identity strings fixed by
// the SPEC, noindex candidate convention, same-language home links, the
// pinned disclaimer verbatim, and no production canonical/hreflang/sitemap
// artifacts.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const zh = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const en = await readFile(new URL("../public/en/index.html", import.meta.url), "utf8");

const DISCLAIMER_ZH =
  "本工具僅供參考，不能取代專業醫療建議、診斷或治療。如有疑問，請諮詢醫師或合格醫療人員。";
const DISCLAIMER_EN =
  "This tool is for reference only and is not a substitute for professional medical advice, diagnosis, or treatment. If you have questions, consult a physician or qualified healthcare professional.";

test("zh page identity", () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes("<title>膽固醇分級｜Gloss Tools</title>"));
  assert.ok(zh.includes("<h1>膽固醇分級</h1>"));
  assert.ok(
    zh.includes(
      'content="輸入健檢報告上的總膽固醇、LDL、HDL 與三酸甘油脂，對照 NCEP ATP III 分級表，逐項查看分級與整體摘要。僅供參考，非醫療建議。"'
    )
  );
});

test("en page identity", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>Cholesterol Checker | Gloss Tools</title>"));
  assert.ok(en.includes("<h1>Cholesterol Checker</h1>"));
  assert.ok(
    en.includes(
      'content="Enter total cholesterol, LDL, HDL and triglycerides from a lab report and see each value classified against the NCEP ATP III table, with an overall summary. For reference only — not medical advice."'
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

test("pinned disclaimer appears verbatim on both pages", () => {
  assert.ok(zh.includes(DISCLAIMER_ZH), "zh disclaimer");
  assert.ok(en.includes(DISCLAIMER_EN), "en disclaimer");
  // The disclaimer is pinned above the results and again in the footer.
  assert.ok(zh.split(DISCLAIMER_ZH).length - 1 >= 2, "zh disclaimer twice");
  assert.ok(en.split(DISCLAIMER_EN).length - 1 >= 2, "en disclaimer twice");
});

test("both pages expose the full control set", () => {
  for (const html of [zh, en]) {
    for (const id of [
      "calc-form",
      "input-total",
      "input-ldl",
      "input-hdl",
      "input-triglycerides",
      "btn-run",
      "btn-example",
      "btn-cancel",
      "btn-reset",
      "btn-download",
      "status",
      "result",
      "result-overall",
      "result-total",
      "result-ldl",
      "result-hdl",
      "result-triglycerides",
      "result-nonhdl",
      "result-hdl-note",
    ]) {
      assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
    }
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-live="polite"'));
  }
});

test("both pages carry the four SPEC FAQ answers", () => {
  assert.ok(zh.includes("NCEP ATP III（美國 National Cholesterol Education Program）"));
  assert.ok(en.includes("NCEP ATP III (U.S. National Cholesterol Education Program)"));
  assert.ok(zh.includes("9–12 小時空腹血脂檢查"));
  assert.ok(en.includes("9–12 hour fasting lipid profile"));
  assert.ok(zh.includes("這是診斷嗎？"));
  assert.ok(en.includes("Is this a diagnosis?"));
});
