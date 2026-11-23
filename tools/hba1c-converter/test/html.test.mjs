// HTML tests for the HbA1c Converter pages.
// Static, offline: reads the two language pages and checks the pinned
// metadata, strings, ids, the verbatim disclaimer, the ADA category
// table, and the four SPEC FAQs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const zh = await readFile(path.join(root, 'public/index.html'), 'utf8');
const en = await readFile(path.join(root, 'public/en/index.html'), 'utf8');

const DISCLAIMER = '本工具僅提供估算與單位換算，不構成醫療建議或診斷。請與醫師討論你的檢查結果。 / This tool provides estimates and unit conversions only. It is not medical advice or a diagnosis. Discuss your results with your clinician.';

test('language, title, h1 and description are the pinned SPEC strings', () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes('<title>糖化血色素換算｜Gloss Tools</title>'));
  assert.ok(zh.includes('<h1>糖化血色素換算</h1>'));
  assert.ok(zh.includes('輸入 HbA1c 或平均血糖的一個數值，一次對照 %、mmol/mol、mg/dL、mmol/L 四種表示法與 ADA 分級帶。'));
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes('<title>HbA1c Converter | Gloss Tools</title>'));
  assert.ok(en.includes('<h1>HbA1c Converter</h1>'));
  assert.ok(en.includes('Enter one HbA1c or average glucose value and see it in %, mmol/mol, mg/dL and mmol/L with the ADA category.'));
});

test('preview metadata: noindex, no canonical or hreflang, CSP with worker-src blob:', () => {
  for (const html of [zh, en]) {
    assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'));
    assert.ok(!/rel="canonical"/.test(html));
    assert.ok(!/rel="alternate"/.test(html));
    assert.ok(html.includes("default-src 'none'; script-src 'self'"));
    assert.ok(html.includes("worker-src 'blob:'"));
    assert.ok(!/href="https?:\/\//.test(html));
    assert.ok(!/src="https?:\/\//.test(html));
    assert.ok(!/<script(?![^>]*\bsrc=)/.test(html));
  }
});

test('both pages carry the identical id set', () => {
  const ids = (html) => [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(ids(zh), ids(en));
  for (const id of ['value-input', 'unit-select', 'run-button', 'download-button', 'result-section', 'res-a1c', 'res-category', 'disclaimer', 'category-table']) {
    assert.ok(ids(zh).includes(id), `missing id ${id}`);
  }
});

test('home links stay in the same language', () => {
  assert.ok(zh.includes('href="../../"'));
  assert.ok(zh.includes('href="en/index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../index.html"'));
});

test('verbatim disclaimer appears in both pages', () => {
  assert.ok(zh.includes(DISCLAIMER));
  assert.ok(en.includes(DISCLAIMER));
});

test('ADA category table rows are present in both pages', () => {
  for (const html of [zh, en]) {
    assert.ok(html.includes('<td>&lt; 5.7%</td>'));
    assert.ok(html.includes('<td>5.7–6.4%</td>'));
    assert.ok(html.includes('<td>≥ 6.5%</td>'));
  }
  assert.ok(zh.includes('<td>正常</td>'));
  assert.ok(zh.includes('<td>糖尿病前期</td>'));
  assert.ok(zh.includes('<td>糖尿病範圍</td>'));
  assert.ok(en.includes('<td>Normal</td>'));
  assert.ok(en.includes('<td>Prediabetes</td>'));
  assert.ok(en.includes('<td>Diabetes range</td>'));
});

test('all four SPEC FAQs are present in both languages', () => {
  assert.ok(zh.includes('eAG 是實測平均血糖嗎？'));
  assert.ok(zh.includes('為什麼 mmol/L 有時和 ADA 表格差 0.1？'));
  assert.ok(zh.includes('目標 A1c 是多少？'));
  assert.ok(zh.includes('可以用這個結果診斷糖尿病嗎？'));
  assert.ok(en.includes('Is eAG a measured average glucose?'));
  assert.ok(en.includes('Why does mmol/L sometimes differ from the ADA table by 0.1?'));
  assert.ok(en.includes('What A1c should I aim for?'));
  assert.ok(en.includes('Can this diagnose diabetes?'));
});

test('default draft is A1c 7% in both pages', () => {
  assert.ok(zh.includes('<input type="text" id="value-input" value="7"'));
  assert.ok(en.includes('<input type="text" id="value-input" value="7"'));
  assert.ok(zh.includes('<option value="a1c-percent" selected>'));
  assert.ok(en.includes('<option value="a1c-percent" selected>'));
});
