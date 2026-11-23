// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// bilingual sizing-only disclaimer, the pinned FAQ answers, the
// draft-loss note, the form controls, and the download button that
// only appears on success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const DISCLAIMER_ZH =
  "本工具只做選型試算，不量測空氣品質、不提供醫療建議。全部計算都在這個頁面本機進行，不上傳、不儲存、不記錄你的輸入。";
const DISCLAIMER_EN =
  "This tool only estimates purifier sizing. It does not measure air quality and gives no medical advice. All calculation happens locally on this page; nothing is uploaded, stored, or logged.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>空氣清淨機選型試算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="填房間面積與天花板高度，依 AHAM 規則算出需要的煙霧 CADR 與建議適用面積，確認手邊那台清淨機夠不夠用。">',
    ),
  );
  assert.ok(zh.includes("<h1>空氣清淨機選型試算</h1>"));
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
  assert.ok(en.includes("<title>Air Purifier Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter room area and ceiling height to find the smoke CADR your room needs under the AHAM rule, with the suggested room size, and check whether your purifier is big enough.">',
    ),
  );
  assert.ok(en.includes("<h1>Air Purifier Calculator</h1>"));
  assert.ok(en.includes('content="noindex, nofollow"'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../styles/app.css"'));
  assert.ok(en.includes('src="../js/app.js"'));
});

test("both pages show the disclaimer in both languages", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes(DISCLAIMER_ZH));
    assert.ok(page.includes(DISCLAIMER_EN));
  }
});

test("both pages carry the pinned FAQ answers", () => {
  assert.ok(zh.includes("為什麼用煙霧 CADR 而不是粉塵或花粉 CADR？"));
  assert.ok(zh.includes("煙霧是三種粒徑中最小的、最嚴格的；AHAM 的適用面積規則就是以煙霧 CADR 寫的。"));
  assert.ok(zh.includes("1.55 和 2/3 是同一條規則嗎？"));
  assert.ok(zh.includes("是同一條關係的兩個方向：所需 CADR = 面積 × 2/3，建議面積 = CADR × 1.55；前者是 5.0 ACH，後者是 4.8 ACH，相差約 3%，本工具以較嚴格的 5.0 為預設。"));
  assert.ok(zh.includes("盒子上寫的適用坪數比 AHAM 建議的大，可以信嗎？"));
  assert.ok(zh.includes("廠商標示的適用面積常以每小時換氣 1–2 次計，AHAM 以 4.8–5.0 次計；比煙霧 CADR，不要只比適用坪數。"));
  assert.ok(zh.includes("天花板比 8 呎高怎麼辦？"));
  assert.ok(zh.includes("所需 CADR 按天花板高度等比提高（天花板呎數 ÷ 8）；挑高房間要買更大台。"));
  assert.ok(en.includes("Why smoke CADR, not dust or pollen CADR?"));
  assert.ok(en.includes("Smoke is the smallest of the three particle sizes and the strictest; the AHAM room-size rule is written against smoke CADR."));
  assert.ok(en.includes("Are 1.55 and 2/3 the same rule?"));
  assert.ok(en.includes("They are two directions of one relationship: required CADR = area × 2/3, suggested room = CADR × 1.55; the first is 5.0 ACH, the second 4.8 ACH, about 3% apart, and this tool defaults to the stricter 5.0."));
  assert.ok(en.includes("The box claims a bigger coverage than AHAM suggests — can I trust it?"));
  assert.ok(en.includes("Marketing coverage is often quoted at 1–2 air changes per hour, while AHAM uses 4.8–5.0; compare smoke CADR, not coverage claims."));
  assert.ok(en.includes("What if my ceiling is higher than 8 ft?"));
  assert.ok(en.includes("Required CADR scales with ceiling height (ceiling feet ÷ 8); a taller room needs a bigger purifier."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-areaValue"'));
    assert.ok(page.includes('id="field-areaUnit"'));
    assert.ok(page.includes('id="field-ceilingHeightM"'));
    assert.ok(page.includes('id="field-targetAch"'));
    assert.ok(page.includes('id="field-purifierCadrCfm"'));
    assert.ok(page.includes('id="error-areaValue"'));
    assert.ok(page.includes('id="error-areaUnit"'));
    assert.ok(page.includes('id="error-ceilingHeightM"'));
    assert.ok(page.includes('id="error-targetAch"'));
    assert.ok(page.includes('id="error-purifierCadrCfm"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="owned-rows"'));
    assert.ok(page.includes('id="owned-heading"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
