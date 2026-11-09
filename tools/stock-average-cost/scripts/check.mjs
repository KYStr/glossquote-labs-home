#!/usr/bin/env node
// Static checks for Stock Average Cost Calculator (source tree).
// Usage: node scripts/check.mjs
// Verifies the package contract, required files, core purity, forbidden
// sinks, preview CSP/robots metadata, bilingual parity, and that no
// external assets or runtime dependencies are referenced. Exit 0 = pass.

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MESSAGES } from '../public/js/i18n.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`FAIL: ${message}`);
}

function pass(message) {
  console.log(`ok: ${message}`);
}

async function exists(relative) {
  try {
    await stat(path.join(root, relative));
    return true;
  } catch {
    return false;
  }
}

async function read(relative) {
  return readFile(path.join(root, relative), 'utf8');
}

const REQUIRED_FILES = [
  'package.json',
  'public/index.html',
  'public/en/index.html',
  'public/js/app.js',
  'public/js/controller.mjs',
  'public/js/i18n.mjs',
  'public/js/core/calculate.mjs',
  'public/styles/app.css',
  'scripts/build.mjs',
  'scripts/check.mjs',
  'scripts/check-generated.mjs',
  'scripts/serve.mjs',
  'scripts/worker-handler.mjs',
  'test/fixtures.json',
  'HANDOFF.md',
  'VERIFICATION.md',
];

const REQUIRED_IDS = [
  'input-heading', 'fee-input', 'fee-help', 'rules',
  'trades-heading', 'trades-table', 'trades-body', 'add-row-button', 'row-limit-note',
  'run-button', 'example-button', 'reset-button', 'cancel-button', 'download-button',
  'status', 'status-text', 'error-box', 'error-text', 'example-note',
  'result-section', 'result-heading', 'result-summary', 'average-note',
  'sells-heading', 'sells-region', 'sells-table', 'sells-table-body', 'sells-empty',
  'lots-heading', 'lots-region', 'lots-table', 'lots-table-body', 'lots-empty',
  'faq-heading',
];

// Forbidden anywhere in public/js: dynamic execution, network, storage,
// clipboard, console logging of user content, markup sinks.
const FORBIDDEN_JS = [
  'innerHTML', 'outerHTML', 'document.write', 'eval(', 'new Function',
  'fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon',
  'localStorage', 'sessionStorage', 'indexedDB', 'clipboard',
  'console.',
];

async function main() {
  // Package contract.
  const pkg = JSON.parse(await read('package.json'));
  if (pkg.type !== 'module') fail('package.json: type must be "module"');
  if (!/^>=24/.test(pkg.engines?.node ?? '')) fail('package.json: engines.node must be >=24');
  if (pkg.dependencies !== undefined || pkg.devDependencies !== undefined) {
    fail('package.json: no runtime or dev dependencies allowed');
  }
  for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
    if (typeof pkg.scripts?.[script] !== 'string') fail(`package.json: missing script "${script}"`);
  }
  pass('package contract');

  // Required files.
  for (const file of REQUIRED_FILES) {
    if (!(await exists(file))) fail(`missing file: ${file}`);
  }
  pass('required files present');

  // Core purity: no imports, no DOM/network/storage globals.
  const core = await read('public/js/core/calculate.mjs');
  if (/^\s*import\s/m.test(core) || /\bfrom\s+['"]/.test(core)) {
    fail('core: must not import anything (it is embedded into the Worker)');
  }
  for (const token of ['document', 'window', 'navigator', 'fetch(', 'localStorage', 'XMLHttpRequest']) {
    if (core.includes(token)) fail(`core: forbidden token ${token}`);
  }
  pass('core purity');

  // Forbidden sinks in all public/js files.
  const jsFiles = [
    'public/js/app.js',
    'public/js/controller.mjs',
    'public/js/i18n.mjs',
    'public/js/core/calculate.mjs',
  ];
  for (const file of jsFiles) {
    const text = await read(file);
    for (const token of FORBIDDEN_JS) {
      if (text.includes(token)) fail(`${file}: forbidden token ${token}`);
    }
  }
  // Exactly one dynamic import, and only the generated worker source.
  const app = await read('public/js/app.js');
  const dynamicImports = [...app.matchAll(/import\(/g)];
  if (dynamicImports.length !== 1 || !app.includes("import('./worker-source.mjs')")) {
    fail('app.js: exactly one dynamic import allowed (./worker-source.mjs)');
  }
  pass('no forbidden sinks in public/js');

  // HTML checks for both languages.
  const zh = await read('public/index.html');
  const en = await read('public/en/index.html');
  const csp = "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
  let zhIds = null;
  for (const [name, html] of [['zh', zh], ['en', en]]) {
    if (!html.includes('<meta name="robots" content="noindex,nofollow">')) {
      fail(`${name}: missing robots noindex,nofollow meta`);
    }
    if (!html.includes(`content="${csp}"`)) fail(`${name}: missing or wrong CSP meta`);
    if (/rel="canonical"/.test(html) || /rel="alternate"/.test(html)) {
      fail(`${name}: preview must not carry canonical/hreflang links`);
    }
    if (/href="https?:\/\//.test(html) || /src="https?:\/\//.test(html)) {
      fail(`${name}: external http(s) URL referenced`);
    }
    if (/<script(?![^>]*\bsrc=)/.test(html)) fail(`${name}: inline script found`);
    if (/\son\w+\s*=/.test(html)) fail(`${name}: inline event handler found`);
    for (const id of REQUIRED_IDS) {
      if (!html.includes(`id="${id}"`)) fail(`${name}: missing id="${id}"`);
    }
    const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    if (name === 'zh') zhIds = ids;
    else {
      const missing = [...zhIds].filter((id) => !ids.has(id));
      const extra = [...ids].filter((id) => !zhIds.has(id));
      if (missing.length > 0) fail(`en: ids missing vs zh: ${missing.join(', ')}`);
      if (extra.length > 0) fail(`en: extra ids vs zh: ${extra.join(', ')}`);
    }
  }
  pass('HTML metadata and id parity');

  // Exact SPEC strings.
  if (!zh.includes('<html lang="zh-Hant">')) fail('zh: lang must be zh-Hant');
  if (!zh.includes('<title>股票平均成本計算機｜Gloss Tools</title>')) fail('zh: title mismatch');
  if (!zh.includes('<h1>股票平均成本計算機</h1>')) fail('zh: h1 mismatch');
  if (!zh.includes('依成交順序輸入買賣股數與價格，用 FIFO 攤提成本，算出持股平均成本與每筆賣出的已實現損益，可含手續費率。')) {
    fail('zh: description mismatch');
  }
  if (!en.includes('<html lang="en">')) fail('en: lang must be en');
  if (!en.includes('<title>Stock Average Cost Calculator | Gloss Tools</title>')) fail('en: title mismatch');
  if (!en.includes('<h1>Stock Average Cost Calculator</h1>')) fail('en: h1 mismatch');
  if (!en.includes('Enter buys and sells in order to track FIFO cost basis, average cost per share and realized profit or loss per sell, with an optional fee rate.')) {
    fail('en: description mismatch');
  }
  if (!zh.includes('賣出時成本怎麼攤？') || !zh.includes('手續費怎麼算？')) {
    fail('zh: FAQ questions missing');
  }
  if (!en.includes('How is sell cost relieved?') || !en.includes('How are fees calculated?')) {
    fail('en: FAQ questions missing');
  }
  pass('SPEC title/description/FAQ strings');

  // i18n key parity.
  const zhKeys = Object.keys(MESSAGES['zh-Hant']).sort();
  const enKeys = Object.keys(MESSAGES.en).sort();
  if (JSON.stringify(zhKeys) !== JSON.stringify(enKeys)) {
    fail(`i18n key mismatch: zh-only=${zhKeys.filter((k) => !enKeys.includes(k))} en-only=${enKeys.filter((k) => !zhKeys.includes(k))}`);
  }
  pass('i18n key parity');

  if (failures.length > 0) {
    console.error(`${failures.length} check(s) failed`);
    process.exit(1);
  }
  console.log('all static checks passed');
}

main().catch((error) => {
  console.error(`check failed: ${error.message}`);
  process.exit(1);
});
