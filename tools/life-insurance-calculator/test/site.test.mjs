// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// bilingual disclaimer, the pinned FAQ answers, the draft-loss note,
// the form controls, and the download button that only appears on
// success.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const DISCLAIMER_ZH =
  "本工具僅供教育試算參考，不構成保險建議、招攬或商品推薦。實際保額請諮詢合格保險業務員或理財顧問，並以保單條款為準。";
const DISCLAIMER_EN =
  "This tool is an educational estimate only. It is not insurance advice, a solicitation, or a product recommendation. Consult a licensed insurance professional for advice on your own situation.";

const FIELDS = [
  "annualIncome",
  "supportYears",
  "dependents",
  "educationPerChild",
  "mortgageBalance",
  "otherDebts",
  "finalExpenses",
  "existingCoverage",
  "liquidAssets",
];

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>壽險保額試算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="以需求法試算家人需要的壽險保額：加總收入替代、房貸、負債、喪葬與教育費用，再扣掉現有保障與資產，並以 10 倍年收入法則對照。僅供教育參考，不構成保險建議。">',
    ),
  );
  assert.ok(zh.includes("<h1>壽險保額試算</h1>"));
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
  assert.ok(en.includes("<title>Life Insurance Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Estimate the life insurance coverage your family needs with the needs approach: add income replacement, mortgage, debts, final expenses and education costs, then subtract existing coverage and assets, with a 10× income benchmark for comparison. Educational estimate only, not insurance advice.">',
    ),
  );
  assert.ok(en.includes("<h1>Life Insurance Calculator</h1>"));
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
  assert.ok(zh.includes("10 倍年收入法則和需求法有什麼不同？"));
  assert.ok(zh.includes("10 倍法則只用年收入乘 10，是快速對照；需求法按你家的負債、房貸、教育與既有保障逐項加總扣抵，建議保額以需求法為準。"));
  assert.ok(zh.includes("為什麼建議保額可能是 0？"));
  assert.ok(zh.includes("現有保障加可動用資產已大於或等於需求總額時，缺口為零，狀態顯示已足夠。"));
  assert.ok(zh.includes("扶養年數怎麼選？"));
  assert.ok(zh.includes("通常是收入需要被替代的年數，例如到最年幼的扶養人成年或完成學業為止；常見參考為 10 年，本工具允許 0–40 年。"));
  assert.ok(zh.includes("試算有考慮通膨或投資報酬嗎？"));
  assert.ok(zh.includes("沒有。各項以名目金額直接相加，不做折現或複利，這是刻意的簡化；實際規劃請諮詢專業人士。"));
  assert.ok(en.includes("How do the 10× income rule and the needs approach differ?"));
  assert.ok(en.includes("The 10× rule multiplies annual income by 10 as a quick benchmark; the needs approach adds up your debts, mortgage, education and final expenses, then subtracts existing coverage and assets. The recommended coverage follows the needs approach."));
  assert.ok(en.includes("Why can the recommended coverage be zero?"));
  assert.ok(en.includes("When existing coverage plus liquid assets already meet or exceed the total need, there is no shortfall and the status shows covered."));
  assert.ok(en.includes("How do I choose the support years?"));
  assert.ok(en.includes("Usually the number of years the income would need replacing, for example until the youngest dependent reaches adulthood or finishes education; 10 years is a common reference and this tool allows 0–40 years."));
  assert.ok(en.includes("Does the estimate account for inflation or investment returns?"));
  assert.ok(en.includes("No. Items are added at face value with no discounting or compounding, as a deliberate simplification; consult a professional for actual planning."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    for (const field of FIELDS) {
      assert.ok(page.includes(`id="field-${field}"`), `field-${field}`);
      assert.ok(page.includes(`id="error-${field}"`), `error-${field}`);
    }
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="breakdown-rows"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});

test("both pages group the nine fields in the SPEC's three groups", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes("<fieldset"));
    assert.ok(page.includes("</fieldset>"));
  }
  assert.ok(zh.includes("年收入、扶養年數與人數"));
  assert.ok(zh.includes("房貸餘額、其他負債、喪葬與處理費用"));
  assert.ok(zh.includes("每位扶養人教育費用、現有保障、可動用資產"));
  assert.ok(en.includes("Annual income, support years and dependents"));
  assert.ok(en.includes("Mortgage balance, other debts and final expenses"));
  assert.ok(en.includes("Education cost per dependent, existing coverage and liquid assets"));
});
