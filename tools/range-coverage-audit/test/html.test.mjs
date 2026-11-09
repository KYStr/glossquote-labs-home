// Static page tests: both language pages must carry the exact SPEC-pinned
// metadata, controls, and safety properties. No browser is involved.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFile(path.join(root, rel), 'utf8');

// Explicit event-attribute list: a bare /on\w+=/ false-positives on content=.
const INLINE_HANDLER = /\s(onclick|ondblclick|onmousedown|onmouseup|onmouseover|onmousemove|onmouseout|onmouseenter|onmouseleave|onkeydown|onkeyup|onkeypress|onfocus|onblur|oninput|onchange|onsubmit|onload|onerror|onresize|onscroll|oncontextmenu|onpaste|oncopy|oncut|ondrag|ondrop|ontouchstart|ontouchend|onpointerdown|onpointerup|onwheel|onselect|onreset|onsearch)\s*=/i;

const REQUIRED_IDS = [
  'domain-start', 'domain-end', 'intervals',
  'run-btn', 'load-example-btn', 'reset-btn', 'cancel-btn', 'download-btn',
  'status-badge', 'status-text', 'error-box', 'error-text', 'example-note',
  'results', 'empty-state', 'summary-covered', 'summary-uncovered',
  'summary-overlapped', 'spans-body', 'spans-region', 'prev-page', 'next-page', 'page-info',
];

test('zh page carries the exact SPEC metadata and controls', async () => {
  const zh = await read('public/index.html');
  assert.ok(zh.includes('lang="zh-Hant"'));
  assert.ok(zh.includes('<title>數值區間覆蓋檢查｜Gloss Tools</title>'));
  assert.ok(zh.includes('資料工程師在切分資料處理責任、掃描門檻或連續索引區段前，想核對整個定義域內有沒有漏段或重複工作，並指回原列。'));
  assert.ok(zh.includes('<h1>數值區間覆蓋檢查</h1>'));
  assert.ok(zh.includes('相接端點算重疊嗎？'));
  assert.ok(zh.includes('區間右端不含，兩段相接不重疊。'));
  assert.ok(zh.includes('三段重合會乘三嗎？'));
  assert.ok(zh.includes('該區段長度只計一次，深度另列 3。'));
  assert.ok(zh.includes('href="./en/index.html"'));
  assert.ok(zh.includes('href="../../"'));
  for (const id of REQUIRED_IDS) assert.ok(zh.includes(`id="${id}"`), `zh missing #${id}`);
  assert.ok(zh.includes('name="robots" content="noindex,nofollow"'));
  assert.ok(zh.includes('worker-src blob:'));
  assert.ok(!INLINE_HANDLER.test(zh), 'zh page has an inline event handler');
});

test('en page carries the exact SPEC metadata and controls', async () => {
  const en = await read('public/en/index.html');
  assert.ok(en.includes('lang="en"'));
  assert.ok(en.includes('<title>Numeric Range Coverage Audit | Gloss Tools</title>'));
  assert.ok(en.includes('Check half-open decimal ranges for gaps and overlaps. Review exact lengths and the source rows active in each span.'));
  assert.ok(en.includes('<h1>Numeric Range Coverage Audit</h1>'));
  assert.ok(en.includes('Do touching endpoints overlap?'));
  assert.ok(en.includes('The right endpoint is excluded, so touching ranges do not overlap.'));
  assert.ok(en.includes('Is a three-way overlap counted three times?'));
  assert.ok(en.includes('Its length is counted once, with depth shown as three.'));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  for (const id of REQUIRED_IDS) assert.ok(en.includes(`id="${id}"`), `en missing #${id}`);
  assert.ok(en.includes('name="robots" content="noindex,nofollow"'));
  assert.ok(!INLINE_HANDLER.test(en), 'en page has an inline event handler');
});

test('pages use relative canonical/hreflang only — no fabricated production domain', async () => {
  for (const rel of ['public/index.html', 'public/en/index.html']) {
    const text = await read(rel);
    assert.ok(!text.includes('glossquote.com'), `${rel} fabricates a production domain`);
    assert.ok(text.includes('rel="canonical"'));
    assert.ok(text.includes('hreflang="x-default"'));
  }
});

test('app.js carries the worker placeholder and no dangerous sinks', async () => {
  const app = await read('public/js/app.js');
  assert.equal(app.split('"__WORKER_SOURCE_PLACEHOLDER__"').length - 1, 1);
  for (const sink of ['innerHTML', 'document.write', 'eval(', 'new Function', 'fetch(', 'localStorage', 'sessionStorage', 'XMLHttpRequest', 'WebSocket']) {
    assert.ok(!app.includes(sink), `app.js contains ${sink}`);
  }
  assert.ok(app.includes('textContent'));
  assert.ok(app.includes('URL.createObjectURL'));
  assert.ok(app.includes("new Worker("));
});

test('package.json declares the file contract', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.type, 'module');
  assert.ok(pkg.engines.node.includes('24'));
  assert.equal(pkg.dependencies, undefined);
  for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
    assert.ok(pkg.scripts[script], `missing script ${script}`);
  }
});
