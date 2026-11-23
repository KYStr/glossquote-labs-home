// Bilingual page contract: both pages carry the SPEC-pinned
// metadata, preview noindex, the candidate rules (no canonical, no
// hreflang, path-only language links), same-language home links, the
// bilingual disclaimer, the pinned FAQ answers, the draft-loss note,
// the form controls, and the download button that only appears on
// success. Privacy: neither page prints the example password
// literal, and neither page offers a copy-password affordance.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const zh = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const en = readFileSync(new URL("../public/en/index.html", import.meta.url), "utf8");

const DISCLAIMER_ZH =
  "強度數字是模型估算，不是保證；再強的密碼也可能因外洩、釣魚或重複使用而失效。密碼絕不離開本頁、不儲存。";
const DISCLAIMER_EN =
  "Strength figures are model estimates, not a guarantee — even a strong password can fail through leaks, phishing, or reuse. Your password never leaves this page and is never stored.";

test("zh page carries the pinned metadata and candidate rules", () => {
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.ok(zh.includes("<title>密碼強度檢查｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      '<meta name="description" content="輸入密碼，立即看到熵、強度等級、預估破解時間與改進建議；密碼絕不離開本頁、不儲存。">',
    ),
  );
  assert.ok(zh.includes("<h1>密碼強度檢查</h1>"));
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
  assert.ok(en.includes("<title>Password Strength Checker | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      '<meta name="description" content="Check a password\'s entropy, strength band, estimated crack time, and concrete improvements — computed locally, never sent or stored.">',
    ),
  );
  assert.ok(en.includes("<h1>Password Strength Checker</h1>"));
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
  assert.ok(zh.includes("這個等級是保證嗎？"));
  assert.ok(zh.includes("不是保證，是依本文公開模型的估算。"));
  assert.ok(zh.includes("我的密碼會被傳送或儲存嗎？"));
  assert.ok(zh.includes("不會。全部計算都在你的瀏覽器本機完成，不傳送、不儲存、不寫入網址或紀錄。"));
  assert.ok(zh.includes("為什麼 `P@ssw0rd!` 只有「普通」？"));
  assert.ok(zh.includes("本工具不做 leet 還原（`@` 不視為 `a`），該密碼 9 碼、四類字元，基礎熵 59.0 bits，落在 36–59.9 的「普通」區間。"));
  assert.ok(en.includes("Is this band a guarantee?"));
  assert.ok(en.includes("No — it is an estimate under this page's published model."));
  assert.ok(en.includes("Is my password sent or stored?"));
  assert.ok(en.includes("No. All computation runs locally in your browser; nothing is sent, stored, or written to the URL or logs."));
  assert.ok(en.includes("Why is `P@ssw0rd!` only “fair”?"));
  assert.ok(en.includes("This tool does no leet substitution (`@` is not read as `a`); at 9 characters across four classes its base entropy is 59.0 bits, inside the 36–59.9 “fair” band."));
});

test("both pages carry the draft-loss note beside the language link", () => {
  assert.ok(zh.includes("切換語言或離開頁面會失去目前草稿。"));
  assert.ok(en.includes("Switching language or leaving this page discards the current draft."));
});

test("both pages expose the form, results regions, and success-only download", () => {
  for (const page of [zh, en]) {
    assert.ok(page.includes('id="entry-form"'));
    assert.ok(page.includes('id="field-password"'));
    assert.ok(page.includes('type="password"'));
    assert.ok(page.includes('autocomplete="off"'));
    assert.ok(page.includes('id="show-btn"'));
    assert.ok(page.includes('id="error-password"'));
    assert.ok(page.includes('id="status"'));
    assert.ok(page.includes('id="summary-rows"'));
    assert.ok(page.includes('id="penalty-rows"'));
    assert.ok(page.includes('id="suggestion-rows"'));
    assert.ok(page.includes('id="band-fill"'));
    assert.ok(page.includes('id="run-btn"'));
    assert.ok(page.includes('id="example-btn"'));
    assert.ok(page.includes('id="reset-btn"'));
    assert.ok(page.includes('id="cancel-btn"'));
    assert.ok(page.includes('id="download-btn"'));
  }
});

test("neither page prints the example password or offers a copy-password affordance", () => {
  // The example password literal lives only in the core EXAMPLE
  // constant and the vendored fixtures; page text, notes, and
  // evidence must never carry it. There is deliberately no copy
  // affordance: the user already holds the password, and copying
  // would leave it in the clipboard.
  for (const page of [zh, en]) {
    assert.ok(!page.includes("Tr0ub4dor&3"));
    assert.ok(!/copy/i.test(page));
    assert.ok(!page.includes("clipboard"));
  }
});
