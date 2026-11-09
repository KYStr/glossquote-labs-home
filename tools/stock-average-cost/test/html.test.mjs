// HTML tests: both language pages carry the exact SPEC strings, preview
// metadata, CSP, and the full control set, with no external or inline
// scripts.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const zh = readFileSync(path.join(toolRoot, 'public/index.html'), 'utf8');
const en = readFileSync(path.join(toolRoot, 'public/en/index.html'), 'utf8');

const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const IDS = [
  'fee-input', 'fee-help', 'input-heading', 'trades-heading', 'trades-table', 'trades-body',
  'add-row-button', 'row-limit-note', 'rules', 'run-button', 'example-button', 'reset-button',
  'cancel-button', 'download-button', 'status', 'status-text', 'error-box', 'error-text',
  'example-note', 'result-section', 'result-heading', 'result-summary', 'average-note',
  'sells-heading', 'sells-empty', 'sells-region', 'sells-table', 'sells-table-body',
  'lots-heading', 'lots-empty', 'lots-region', 'lots-table', 'lots-table-body', 'faq-heading',
];

test('zh page carries the exact SPEC strings', () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes('<title>股票平均成本計算機｜Gloss Tools</title>'));
  assert.ok(zh.includes('<h1>股票平均成本計算機</h1>'));
  assert.ok(zh.includes('依成交順序輸入買賣股數與價格，用 FIFO 攤提成本，算出持股平均成本與每筆賣出的已實現損益，可含手續費率。'));
  assert.ok(zh.includes('賣出時成本怎麼攤？'));
  assert.ok(zh.includes('採 FIFO，先攤最早買進的批次；整批攤完時以該批剩餘成本全數結清。'));
  assert.ok(zh.includes('手續費怎麼算？'));
  assert.ok(zh.includes('每筆手續費 = 成交金額 × 費率，四捨五入到 0.0001；買進加進成本，賣出從所得扣除。費率以基點輸入，100 基點 = 1%。不含證交稅。'));
  assert.ok(zh.includes('持股摘要與賣出損益'));
});

test('en page carries the exact SPEC strings', () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes('<title>Stock Average Cost Calculator | Gloss Tools</title>'));
  assert.ok(en.includes('<h1>Stock Average Cost Calculator</h1>'));
  assert.ok(en.includes('Enter buys and sells in order to track FIFO cost basis, average cost per share and realized profit or loss per sell, with an optional fee rate.'));
  assert.ok(en.includes('How is sell cost relieved?'));
  assert.ok(en.includes('FIFO: the earliest buy lots are relieved first, and a lot that is fully relieved settles at exactly its remaining cost.'));
  assert.ok(en.includes('How are fees calculated?'));
  assert.ok(en.includes('Each trade\'s fee is its amount times the rate, rounded half-up to 0.0001; buy fees add to cost, sell fees reduce proceeds. The rate is entered in basis points (100 bps = 1%). Securities transaction tax is not included.'));
  assert.ok(en.includes('Holdings summary and sell results'));
});

test('both pages carry preview metadata and CSP, and no canonical/hreflang', () => {
  for (const [name, html] of [['zh', zh], ['en', en]]) {
    assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'), name);
    assert.ok(html.includes(`content="${CSP}"`), name);
    assert.ok(!/rel="canonical"/.test(html), name);
    assert.ok(!/rel="alternate"/.test(html), name);
  }
});

test('home and language links follow the same-language convention', () => {
  assert.ok(zh.includes('<a class="brand" href="../../">Gloss Tools</a>'));
  assert.ok(zh.includes('<a href="en/index.html" lang="en">English</a>'));
  assert.ok(en.includes('<a class="brand" href="../../en/">Gloss Tools</a>'));
  assert.ok(en.includes('<a href="../index.html" lang="zh-Hant">繁體中文</a>'));
});

test('both pages expose every control id', () => {
  for (const [name, html] of [['zh', zh], ['en', en]]) {
    for (const id of IDS) {
      assert.ok(html.includes(`id="${id}"`), `${name}: missing id ${id}`);
    }
  }
});

test('fee input defaults to "0" and the static first row is a buy row with empty numbers', () => {
  for (const [name, html] of [['zh', zh], ['en', en]]) {
    assert.ok(/id="fee-input"[^>]*value="0"/.test(html), name);
    assert.ok(html.includes('<option value="buy" selected>'), name);
    assert.ok(html.includes('class="shares-input"'), name);
    assert.ok(html.includes('class="price-input"'), name);
  }
});

test('scripts are external, relative, and module-typed only', () => {
  for (const [name, html] of [['zh', zh], ['en', en]]) {
    assert.ok(!/<script(?![^>]*\bsrc=)/.test(html), `${name}: inline script found`);
    assert.ok(!/src="https?:\/\//.test(html), name);
    assert.ok(!/href="https?:\/\//.test(html), name);
  }
  assert.ok(zh.includes('<script type="module" src="js/app.js"></script>'));
  assert.ok(zh.includes('<link rel="stylesheet" href="styles/app.css">'));
  assert.ok(en.includes('<script type="module" src="../js/app.js"></script>'));
  assert.ok(en.includes('<link rel="stylesheet" href="../styles/app.css">'));
});
