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
  "本工具僅依你輸入的假設與 28/36 負擔比率試算；月付只計房貸本金加利息，不含稅金、保險、管理費與房貸成數限制，不是財務建議、銀行報價或核貸保證。";
const DISCLAIMER_EN =
  "This tool estimates only from the assumptions you enter and the 28/36 debt-to-income guideline. The monthly payment counts mortgage principal and interest only, excluding taxes, insurance, management fees and loan-to-value limits, and is not financial advice, a bank quotation or a loan approval guarantee.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>購屋能力試算｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入年收入、頭期款、房貸利率、年期與其他債務，依 28/36 負擔比率算出最高房價與最高月付。">',
    ),
  );
  assert.ok(zh.includes("<h1>購屋能力試算</h1>"));
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
  assert.ok(en.includes("<title>Home Affordability Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter annual income, down payment, mortgage rate, term and other debts to find your maximum home price and monthly payment under the 28/36 debt-to-income guideline.">',
    ),
  );
  assert.ok(en.includes("<h1>Home Affordability Calculator</h1>"));
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
  assert.ok(zh.includes("28/36 是銀行的硬性上限嗎？"));
  assert.ok(
    zh.includes(
      "不是。28/36 是傳統經驗法則：住房支出不超過稅前月收入 28%，全部債務不超過 36%。美國 CFPB 說不同貸款產品與銀行的 DTI 上限各不相同；舊的 43% 合格房貸上限已改為價格制。本工具以 28/36 為預設，你可以在範圍內調整。",
    ),
  );
  assert.ok(zh.includes("為什麼最高房價只算本金加利息？"));
  assert.ok(
    zh.includes(
      "因為稅金、保險、管理費因地而異、無法由收入反推；本工具的月付只計房貸本金加利息，試算聲明已明載，實際每月支出會更高。",
    ),
  );
  assert.ok(zh.includes("其他債務太多、算出來沒有貸款額度，代表什麼？"));
  assert.ok(
    zh.includes(
      "代表在你設定的後端上限下，其他債務已經吃掉全部額度；最高房價等於頭期款，只能全現金購屋，或先降低其他債務、再調高上限假設重算。",
    ),
  );
  assert.ok(en.includes("Is 28/36 a hard bank limit?"));
  assert.ok(
    en.includes(
      "No. It is a traditional guideline: housing costs at or below 28% of gross monthly income, and all debts at or below 36%. The US CFPB says different loan products and lenders set different DTI limits, and the old 43% Qualified Mortgage cap was replaced with a price-based standard. This tool uses 28/36 as the default, and you can adjust it within the allowed range.",
    ),
  );
  assert.ok(en.includes("Why does the maximum price only count principal and interest?"));
  assert.ok(
    en.includes(
      "Taxes, insurance and management fees vary by location and cannot be derived from income, so this tool's monthly payment counts mortgage principal and interest only, as the disclaimer states; your actual monthly cost will be higher.",
    ),
  );
  assert.ok(en.includes("What does it mean when other debts leave no loan room?"));
  assert.ok(
    en.includes(
      "Under your back-end cap, your other debts already use up the whole allowance, so the maximum home price equals your down payment: a cash-only purchase, unless you lower other debts or raise the cap assumption and recalculate.",
    ),
  );
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  const fields = [
    "annualIncome",
    "downPayment",
    "mortgageRate",
    "years",
    "otherDebts",
    "frontEndCapPct",
    "backEndCapPct",
  ];
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    for (const field of fields) {
      assert.ok(page.includes(`id="field-${field}"`), `field ${field}`);
      assert.ok(page.includes(`id="error-${field}"`), `error ${field}`);
    }
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="no-room-note"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});

test("both pages show the SPEC preset defaults as the initial values", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('value="1200000"'));
    assert.ok(page.includes('value="2000000"'));
    assert.ok(page.includes('value="2"'));
    assert.ok(page.includes('value="30"'));
    assert.ok(page.includes('value="0"'));
    assert.ok(page.includes('value="28"'));
    assert.ok(page.includes('value="36"'));
  }
});
