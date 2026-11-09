// Page tests: both static pages carry the SPEC-pinned metadata, the
// candidate noindex rule with no canonical/hreflang, the pinned FAQ
// answers, the full control inventory the app wires, and same-
// language home links. Strings are pinned by the SPEC's tests
// section, not taken from the implementation.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { OVERRIDABLE_CODES, SELECTABLE_CODES } from "../public/js/core/mahjong.mjs";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

test("zh-Hant page: pinned metadata, links, FAQ", () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes("<title>麻將台數計算機｜Gloss Tools</title>"));
  assert.ok(zh.includes("<h1>麻將台數計算機</h1>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="依台灣十六張麻將一般家庭場慣例，勾選胡牌的牌型與情境，自動處理門清自摸合併與不重複計台，算出總台數與自摸、放槍的每人付款金額。">',
    ),
  );
  assert.ok(zh.includes('<meta name="robots" content="noindex, nofollow">'));
  assert.ok(!zh.includes("canonical"));
  assert.ok(!zh.includes("hreflang"));
  assert.ok(zh.includes('href="./en/index.html"'));
  assert.ok(zh.includes('href="../../"'));
  assert.ok(zh.includes("門清自摸為什麼是 3 台，不是 2 台？"));
  assert.ok(zh.includes("本工具採一般家庭場慣例，門清與自摸合併計 3 台，不拆成 1＋1。"));
  assert.ok(zh.includes("我家的台數算法不一樣怎麼辦？"));
});

test("en page: pinned metadata, links, FAQ", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>Mahjong Score Calculator | Gloss Tools</title>"));
  assert.ok(en.includes("<h1>Mahjong Score Calculator</h1>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Score a Taiwan 16-tile mahjong winning hand from a fixed family-game tai table, with combined and non-stacking rules applied, and get the per-player payout for self-draw and discard wins.">',
    ),
  );
  assert.ok(en.includes('<meta name="robots" content="noindex, nofollow">'));
  assert.ok(!en.includes("canonical"));
  assert.ok(!en.includes("hreflang"));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes("Why is a concealed self-draw 3 tai, not 2?"));
  assert.ok(
    en.includes(
      "Under the common family rules used here, concealed hand and self draw combine into a single 3-tai item instead of 1 + 1.",
    ),
  );
  assert.ok(en.includes("What if our house counts differently?"));
});

test("both pages expose every control the app wires", () => {
  const ids = [
    "score-form",
    "win-self-draw",
    "win-discard",
    "winner-dealer",
    "discarder-dealer",
    "dealer-streak",
    "honor-flowers",
    "off-flowers",
    "kong-count",
    "base",
    "per-tai",
    "cap",
    "status",
    "error-box",
    "example-note",
    "run-btn",
    "example-btn",
    "reset-btn",
    "cancel-btn",
    "results",
    "summary-rows",
    "result-lines",
    "excluded-list",
    "download-btn",
    ...SELECTABLE_CODES.map((code) => `sel-${code}`),
    ...OVERRIDABLE_CODES.map((code) => `ovr-${code}`),
  ];
  for (const [name, html] of [
    ["zh", zh],
    ["en", en],
  ]) {
    for (const id of ids) {
      assert.ok(html.includes(`id="${id}"`), `${name} page missing id ${id}`);
    }
    // No inline handlers or remote references.
    assert.ok(!html.includes("onclick"), `${name} page has an inline handler`);
    assert.ok(!html.includes('src="http'), `${name} page references a remote script`);
  }
});
