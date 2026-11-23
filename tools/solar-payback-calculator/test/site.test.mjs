// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// bilingual disclaimer, the pinned FAQ answers, the tariff citation
// and table values, the draft-loss note, the form controls with the
// SPEC's default values, and the download button that only appears
// on success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const DISCLAIMER_ZH =
  "本工具的結果是靜態試算估計，不是發電保證、報價或投資建議；實際發電量受方位、傾角、遮蔭、氣候與設備影響，實際費率以完工併網當期經濟部公告與台電購售電契約為準。";
const DISCLAIMER_EN =
  "Results are static estimates, not a generation guarantee, a quote, or investment advice. Actual generation depends on orientation, tilt, shading, climate, and equipment; the applicable tariff is the one announced for the period when the system is completed and grid-connected, per the Taipower contract.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>太陽能回本試算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入裝置容量、屋頂面積、年日照時數與建置成本，按台灣躉購費率算一年發多少電、一年拿回多少錢、幾年回本。">',
    ),
  );
  assert.ok(zh.includes("<h1>太陽能回本試算</h1>"));
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
  assert.ok(en.includes("<title>Solar Payback Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter system size, roof area, annual sun hours and installation cost to estimate annual generation, yearly benefit and payback years at Taiwan\'s feed-in tariff.">',
    ),
  );
  assert.ok(en.includes("<h1>Solar Payback Calculator</h1>"));
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
  assert.ok(zh.includes("躉購費率是哪一年的？"));
  assert.ok(zh.includes("2026 年（115 年度）經濟部公告的屋頂型費率，兩期相同；實際費率以完工併網當期的公告與台電契約為準。"));
  assert.ok(zh.includes("自用的電怎麼算錢？"));
  assert.ok(zh.includes("自用度數按你填的零售電價折算節省，預設每度 3.00 元是假設值，請按自家電費單的邊際單價改填；台電住宅用電是累進電價，本工具不做分段計算。"));
  assert.ok(zh.includes("屋頂不夠大怎麼辦？"));
  assert.ok(zh.includes("這是警告不是錯誤；頁面會顯示最大可裝容量，你可以改小裝置容量再算。"));
  assert.ok(en.includes("Which year's feed-in tariff is used?"));
  assert.ok(en.includes("The 2026 (ROC 115) MOEA-announced rooftop rates, identical in both phases; the rate that applies is the one announced for the period when the system is completed and grid-connected, per the Taipower contract."));
  assert.ok(en.includes("How is self-consumed electricity valued?"));
  assert.ok(en.includes("Self-used kWh are valued at the retail price you enter (default NT$3.00/kWh is an assumption — replace it with the marginal rate on your own bill; Taipower residential rates are inclining-block, which this tool does not compute)."));
  assert.ok(en.includes("What if my roof is too small?"));
  assert.ok(en.includes("That is a warning, not an error; the page shows the largest capacity that fits, so you can lower the system size and recalculate."));
});

test("both pages carry the tariff citation and all six band rates", () => {
  assert.ok(zh.includes("經能字第 11458005630 號"));
  assert.ok(en.includes("11458005630"));
  for (const rate of ["5.6279", "5.3819", "4.2505", "4.0459", "3.7152", "3.6236"]) {
    assert.ok(zh.includes(rate), `zh missing rate ${rate}`);
    assert.ok(en.includes(rate), `en missing rate ${rate}`);
  }
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  const fields = [
    "systemKwp",
    "roofAreaM2",
    "sunHours",
    "installCost",
    "fitRate",
    "selfUsePct",
    "retailPrice",
  ];
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    for (const field of fields) {
      assert.ok(page.includes(`id="field-${field}"`), `missing field-${field}`);
      assert.ok(page.includes(`id="error-${field}"`), `missing error-${field}`);
    }
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="detail-rows"'));
    assert.ok(page.includes('id="roof-note"'));
    assert.ok(page.includes('id="beyond-note"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});

test("both pages prefill the SPEC's default values", () => {
  for (const page of [zh, en]) {
    for (const value of ['value="9"', 'value="80"', 'value="1250"', 'value="540000"', 'value="5.6279"', 'value="30"', 'value="3.00"']) {
      assert.ok(page.includes(value), `missing default ${value}`);
    }
  }
});
