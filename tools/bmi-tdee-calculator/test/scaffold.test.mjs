// Static invariants over the shipped files (SPEC §5/§6): privacy, security,
// bilingual completeness, honesty gate. Complements scripts/check.mjs.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('both pages carry lang, noindex, canonical/hreflang and home links', async () => {
  const zh = await read('public/index.html');
  const en = await read('public/en/index.html');
  assert.match(zh, /<html lang="zh-Hant-TW">/);
  assert.match(en, /<html lang="en">/);
  for (const html of [zh, en]) {
    assert.ok(html.includes('noindex'));
    assert.ok(html.includes('rel="canonical"'));
    assert.ok(html.includes('hreflang'));
    assert.ok(html.includes('Mifflin'));
    assert.ok(!/src\s*=\s*"https?:/i.test(html), 'no external scripts');
    assert.ok(!/href\s*=\s*"https?:/i.test(html), 'no external links');
  }
  assert.ok(zh.includes('href="../../"')); // same-language homepage
  assert.ok(en.includes('href="../../../en/"'));
});

test('not-medical-advice statement and unrounded rule present in both languages', async () => {
  const zh = await read('public/index.html');
  const en = await read('public/en/index.html');
  assert.ok(zh.includes('不是醫療建議'));
  assert.ok(en.includes('not medical advice'));
  assert.ok(zh.includes('未四捨五入'));
  assert.ok(en.includes('unrounded'));
  assert.ok(zh.includes('刻意不提供')); // deliberately gives no eating target
  assert.ok(en.includes('deliberately gives no calorie target'));
});

test('app renders text only and nothing ships network/storage calls', async () => {
  const app = await read('public/js/app.js');
  const core = await read('public/js/core/bmi.mjs');
  for (const src of [app, core]) {
    assert.ok(!src.includes('innerHTML'));
    assert.ok(!src.includes('fetch('));
    assert.ok(!src.includes('localStorage'));
    assert.ok(!src.includes('eval('));
  }
  assert.ok(app.includes('textContent'));
  assert.ok(!core.includes('document'));
});

test('constants live once in the core and match SPEC §4', async () => {
  const core = await read('public/js/core/bmi.mjs');
  const app = await read('public/js/app.js');
  for (const token of ['0.45359237', '2.54', '1.375', '1.55', '1.725']) {
    assert.ok(core.includes(token), `core has ${token}`);
    assert.ok(!app.includes(token), `app must not duplicate ${token}`);
  }
});
