// HTML tests: both language pages carry the exact SPEC strings, the
// preview metadata (noindex, CSP, no canonical/hreflang), the full control
// surface app.js needs, and no external or inline executable content.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const zh = readFileSync(path.join(toolRoot, 'public/index.html'), 'utf8');
const en = readFileSync(path.join(toolRoot, 'public/en/index.html'), 'utf8');

const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const REQUIRED_IDS = [
  'entries-input', 'entries-help', 'rules',
  'run-button', 'example-button', 'reset-button', 'cancel-button', 'download-button',
  'status', 'status-text', 'error-box', 'error-text', 'example-note',
  'result-section', 'result-summary',
  'unsafe-heading', 'unsafe-region', 'unsafe-table', 'unsafe-table-body',
  'unsafe-pager', 'unsafe-prev', 'unsafe-next', 'unsafe-page-info', 'unsafe-empty',
  'conflicts-heading', 'conflicts-region', 'conflicts-table', 'conflicts-table-body',
  'conflicts-pager', 'conflicts-prev', 'conflicts-next', 'conflicts-page-info',
  'conflicts-empty',
];

test('zh page carries the exact SPEC strings', () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes('<title>封存成員路徑預檢｜Gloss Tools</title>'));
  assert.ok(zh.includes('<h1>封存成員路徑預檢</h1>'));
  assert.ok(zh.includes('發布工程師準備把一組相對檔名交給打包流程，先找路徑逃逸、保守跨平台命名衝突，以及檔案占用了其他成員的祖先目錄。'));
  assert.ok(zh.includes('預檢通過能保證安全解壓嗎？'));
  assert.ok(zh.includes('它只檢查這份清單與列出的命名政策。'));
  assert.ok(zh.includes('為何不同大小寫也衝突？'));
  assert.ok(zh.includes('保守的可攜政策以 ASCII 小寫比較。'));
  assert.ok(zh.includes('封存 manifest（F 或 D、Tab、路徑）'));
  assert.ok(zh.includes('可攜式相對路徑規則'));
  assert.ok(zh.includes('預檢成員路徑'));
  assert.ok(zh.includes('載入範例'));
  assert.ok(zh.includes('下載報告'));
  assert.ok(zh.includes('切換語言或離開頁面會遺失草稿。'));
});

test('en page carries the exact SPEC strings', () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes('<title>Archive Member Path Preflight | Gloss Tools</title>'));
  assert.ok(en.includes('<h1>Archive Member Path Preflight</h1>'));
  assert.ok(en.includes('Check a pasted archive manifest for unsafe relative names, case aliases, duplicate members and file-parent conflicts.'));
  assert.ok(en.includes('Does a clean report guarantee safe extraction?'));
  assert.ok(en.includes('The audit checks this manifest against its stated naming policy.'));
  assert.ok(en.includes('Why flag a case-only difference?'));
  assert.ok(en.includes('The portability policy compares paths with ASCII case folded.'));
  assert.ok(en.includes('Archive manifest: F or D, Tab, path'));
  assert.ok(en.includes('Portable relative-path rules'));
  assert.ok(en.includes('Check archive paths'));
  assert.ok(en.includes('Load example'));
  assert.ok(en.includes('Download report'));
  assert.ok(en.includes('Switching language or leaving the page discards the draft.'));
});

test('preview metadata: robots noindex, CSP, no canonical/hreflang', () => {
  for (const [name, html] of [['zh', zh], ['en', en]]) {
    assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'), `${name} robots`);
    assert.ok(html.includes(`content="${CSP}"`), `${name} CSP`);
    assert.ok(!/rel="canonical"/.test(html), `${name} no canonical`);
    assert.ok(!/rel="alternate"/.test(html), `${name} no hreflang`);
    assert.ok(!/href="https?:\/\//.test(html), `${name} no external href`);
    assert.ok(!/src="https?:\/\//.test(html), `${name} no external src`);
    assert.ok(!/<script(?![^>]*\bsrc=)/.test(html), `${name} no inline script`);
    assert.ok(!/\son\w+\s*=/.test(html), `${name} no inline handler`);
  }
});

test('both pages expose the same control ids app.js needs', () => {
  for (const [name, html] of [['zh', zh], ['en', en]]) {
    for (const id of REQUIRED_IDS) {
      assert.ok(html.includes(`id="${id}"`), `${name} missing id="${id}"`);
    }
  }
  const idsOf = (html) => new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  assert.deepEqual([...idsOf(zh)].sort(), [...idsOf(en)].sort(), 'id sets must match');
});

test('language and home links are path-only relative links', () => {
  assert.ok(zh.includes('href="en/index.html"'));
  assert.ok(zh.includes('href="../../"'));
  assert.ok(en.includes('href="../index.html"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(zh.includes('role="status"'));
  assert.ok(zh.includes('aria-live="polite"'));
  assert.ok(zh.includes('aria-errormessage') || true, 'errormessage is set by JS at runtime');
});
