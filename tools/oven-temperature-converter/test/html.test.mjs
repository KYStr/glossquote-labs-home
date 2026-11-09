// HTML tests for the Oven Temperature Converter pages.
// Static, offline: reads the two language pages and checks the pinned
// metadata, strings, ids, and the static Gas Mark chart cell for cell.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const zh = await readFile(path.join(root, 'public/index.html'), 'utf8');
const en = await readFile(path.join(root, 'public/en/index.html'), 'utf8');

const CHART_ROWS = [
  ['¼', '110', '225'], ['½', '120', '250'], ['1', '140', '275'],
  ['2', '150', '300'], ['3', '170', '325'], ['4', '180', '350'],
  ['5', '190', '375'], ['6', '200', '400'], ['7', '220', '425'],
  ['8', '230', '450'], ['9', '240', '475'], ['10', '260', '500'],
];

test('language, title, h1 and description are the pinned SPEC strings', () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes('<title>烤箱溫度換算｜Gloss Tools</title>'));
  assert.ok(zh.includes('<h1>烤箱溫度換算</h1>'));
  assert.ok(zh.includes('食譜寫 °C、°F 還是 Gas Mark？一次換算三種標示，還能對照一般烤箱與旋風烤箱的設定，附完整 Gas Mark 對照表。'));
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes('<title>Oven Temperature Converter | Gloss Tools</title>'));
  assert.ok(en.includes('<h1>Oven Temperature Converter</h1>'));
  assert.ok(en.includes('Convert oven temperatures between Celsius, Fahrenheit and Gas Mark, with conventional and fan-assisted settings and the full Gas Mark chart.'));
});

test('preview metadata: noindex, no canonical or hreflang, CSP present', () => {
  for (const html of [zh, en]) {
    assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'));
    assert.ok(!/rel="canonical"/.test(html));
    assert.ok(!/rel="alternate"/.test(html));
    assert.ok(html.includes("default-src 'none'; script-src 'self'"));
    assert.ok(!/href="https?:\/\//.test(html));
    assert.ok(!/src="https?:\/\//.test(html));
  }
});

test('both pages carry the identical id set', () => {
  const ids = (html) => [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(ids(zh), ids(en));
  for (const id of ['value-input', 'unit-select', 'run-button', 'chart-table']) {
    assert.ok(ids(zh).includes(id), `missing id ${id}`);
  }
});

test('static chart matches the pinned table cell for cell in both pages', () => {
  for (const html of [zh, en]) {
    for (const [label, c, f] of CHART_ROWS) {
      assert.ok(
        html.includes(`<td>${label}</td><td>${c}</td><td>${f}</td>`),
        `chart row ${label}/${c}/${f} missing`,
      );
    }
  }
});

test('home links stay in the same language', () => {
  assert.ok(zh.includes('href="../../"'));
  assert.ok(zh.includes('href="en/index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../index.html"'));
});

test('FAQ questions are present in both languages', () => {
  assert.ok(zh.includes('旋風烤箱為什麼要調低？'));
  assert.ok(zh.includes('溫度超出對照表怎麼辦？'));
  assert.ok(en.includes('Why lower the temperature for a fan oven?'));
  assert.ok(en.includes('What if the temperature is outside the chart?'));
});
