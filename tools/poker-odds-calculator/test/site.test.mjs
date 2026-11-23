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
  "本工具僅供娛樂與機率教學參考，不構成任何投注建議。所有機率皆假設一副公平洗勻的 52 張牌，且對手手牌未知、均勻隨機；實際結果無法保證。";
const DISCLAIMER_EN =
  "This tool is for entertainment and probability education only, not betting advice. All probabilities assume a fair, randomly shuffled 52-card deck and that opponents' hole cards are unknown and uniformly random; actual outcomes are not guaranteed.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>德州撲克勝率｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入手牌與公共牌，算出 outs、命中率、對戰勝率與底池賠率提示。">',
    ),
  );
  assert.ok(zh.includes("<h1>德州撲克勝率</h1>"));
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
  assert.ok(en.includes("<title>Poker Odds Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Enter hole and board cards to get outs, hit rates, win equity against N opponents, and a pot-odds call/fold hint.">',
    ),
  );
  assert.ok(en.includes("<h1>Poker Odds Calculator</h1>"));
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
  assert.ok(zh.includes("2/4 法則準嗎？"));
  assert.ok(zh.includes("只是近似值，outs 越大誤差越大，精確命中率請看超幾何公式的數字。"));
  assert.ok(zh.includes("為什麼勝率假設對手是隨機手牌？"));
  assert.ok(zh.includes("因為對手的手牌未知，本工具不依行動推斷手牌範圍。"));
  assert.ok(zh.includes("河牌圈還能算 outs 嗎？"));
  assert.ok(zh.includes("沒有牌可發了，outs 為 0，勝率只由對手兩張牌的組合決定。"));
  assert.ok(zh.includes("跟注提示是保證嗎？"));
  assert.ok(zh.includes("不是。提示只是把權益與底池賠率的損益平衡點比較，屬於期望值參考。"));
  assert.ok(en.includes("Is the rule of 2/4 exact?"));
  assert.ok(en.includes("No, it is only an approximation; the error grows with more outs. See the exact hypergeometric hit rate."));
  assert.ok(en.includes("Why does equity assume random opponent hands?"));
  assert.ok(en.includes("Opponents' hole cards are unknown, and this tool does not infer hand ranges from actions."));
  assert.ok(en.includes("Are there outs on the river?"));
  assert.ok(en.includes("No cards are left to come, so outs are 0; equity comes only from opponents' hole-card combinations."));
  assert.ok(en.includes("Is the call/fold hint a guarantee?"));
  assert.ok(en.includes("No. It only compares equity with the pot-odds break-even point, as an expected-value reference."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-hole-cards"'));
    assert.ok(page.includes('id="field-board-cards"'));
    assert.ok(page.includes('id="field-opponents"'));
    assert.ok(page.includes('id="field-pot"'));
    assert.ok(page.includes('id="field-to-call"'));
    assert.ok(page.includes('id="error-hole-cards"'));
    assert.ok(page.includes('id="error-board-cards"'));
    assert.ok(page.includes('id="error-opponents"'));
    assert.ok(page.includes('id="error-pot"'));
    assert.ok(page.includes('id="error-to-call"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="equity-rows"'));
    assert.ok(page.includes('id="distribution-rows"'));
    assert.ok(page.includes('id="pot-rows"'));
    assert.ok(page.includes('id="monte-carlo-note"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});
