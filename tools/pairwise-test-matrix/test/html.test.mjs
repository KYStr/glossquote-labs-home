// Static HTML tests: both pages carry the SPEC-pinned metadata and
// strings, no inline scripts, no external URLs, and no production
// canonical/hreflang in the candidate (SPEC candidate rule).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const zh = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const en = await readFile(new URL('../public/en/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/styles/app.css', import.meta.url), 'utf8');

test('zh page: pinned metadata, H1, description, FAQ', () => {
  assert.ok(zh.includes('lang="zh-Hant"'));
  assert.ok(zh.includes('<title>兩兩覆蓋測試矩陣｜Gloss Tools</title>'));
  assert.ok(zh.includes('<h1>兩兩覆蓋測試矩陣</h1>'));
  assert.ok(zh.includes('測試工程師有幾個有限選項，需先挑一份能覆蓋任兩維選項配對的測試清單。成功是每個配對都有一個具體案例，且知道這份清單不證明更高階組合已測。'));
  assert.ok(zh.includes('這是最少案例的證明嗎？'));
  assert.ok(zh.includes('它是依新增覆蓋挑選的可重現案例集合。'));
  assert.ok(zh.includes('這代表每個組合都會測嗎？'));
  assert.ok(zh.includes('每兩維的所有配對都會出現，完整的多維組合可能未列入。'));
  assert.ok(zh.includes('建立兩兩覆蓋表'));
  assert.ok(zh.includes('載入範例'));
  assert.ok(zh.includes('下載報告'));
  assert.ok(zh.includes('切換語言或離開頁面會失去草稿。'));
});

test('en page: pinned metadata, H1, description, FAQ', () => {
  assert.ok(en.includes('lang="en"'));
  assert.ok(en.includes('<title>Pairwise Test Matrix | Gloss Tools</title>'));
  assert.ok(en.includes('<h1>Pairwise Test Matrix</h1>'));
  assert.ok(en.includes('Build a reproducible set of test cases that covers all pairs of values across the supplied dimensions.'));
  assert.ok(en.includes('Is this a minimum-case proof?'));
  assert.ok(en.includes('It selects a reproducible set based on newly covered pairs.'));
  assert.ok(en.includes('Does it include every combination?'));
  assert.ok(en.includes('All two-dimension pairs appear. Some full combinations may be absent.'));
  assert.ok(en.includes('Build pairwise cases'));
  assert.ok(en.includes('Load example'));
  assert.ok(en.includes('Download report'));
  assert.ok(en.includes('Switching language or leaving the page discards your draft.'));
});

test('both pages: robots, CSP, no inline scripts, no external URLs, no production canonical', () => {
  for (const [name, html] of [['zh', zh], ['en', en]]) {
    assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'), `${name} robots`);
    assert.ok(html.includes("default-src 'none'"), `${name} CSP default`);
    assert.ok(html.includes("script-src 'self'"), `${name} CSP script`);
    assert.ok(html.includes('worker-src blob:'), `${name} CSP worker`);
    assert.ok(!/<script(?![^>]*\ssrc=)/.test(html), `${name} no inline script`);
    assert.ok(!/https?:\/\//.test(html), `${name} no external URLs`);
    assert.ok(!/rel="canonical"/.test(html), `${name} no canonical`);
    assert.ok(!/hreflang/.test(html), `${name} no hreflang`);
    assert.ok(html.includes('aria-live="polite"'), `${name} polite status`);
    assert.ok(html.includes('role="alert"'), `${name} alert region`);
  }
  assert.ok(zh.includes('href="./en/index.html"') && zh.includes('href="../../"'), 'zh links');
  assert.ok(en.includes('href="../index.html"') && en.includes('href="../../en/"'), 'en links');
  assert.ok(zh.includes('src="./js/app.js"'), 'zh app script');
  assert.ok(en.includes('src="../js/app.js"'), 'en app script');
});

test('css uses the design-baseline paper/ink tokens', () => {
  assert.ok(css.includes('--gq-color-paper: #f3f0e8'));
  assert.ok(css.includes('--gq-color-ink: #111410'));
  assert.ok(css.includes('min-height: 44px'));
  assert.ok(css.includes('@media (min-width: 900px)'));
});
