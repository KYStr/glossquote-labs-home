#!/usr/bin/env node
// Static checks for the Oven Temperature Converter (source tree).
// Usage: node scripts/check.mjs
// Verifies the package contract, required files, core purity, forbidden
// sinks, preview CSP/robots metadata, bilingual id parity, the pinned
// SPEC strings, the pinned Gas Mark chart, and i18n key parity.
// Exit 0 = pass.

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MESSAGES } from '../public/js/i18n.mjs';
import { GAS_CHART } from '../public/js/core/convert.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function fail(messageText) {
  failures.push(messageText);
  console.error(`FAIL: ${messageText}`);
}

function pass(messageText) {
  console.log(`ok: ${messageText}`);
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
  'public/js/core/convert.mjs',
  'public/styles/app.css',
  'scripts/build.mjs',
  'scripts/check.mjs',
  'scripts/check-generated.mjs',
  'scripts/serve.mjs',
  'test/core.test.mjs',
  'test/controller.test.mjs',
  'test/html.test.mjs',
  'test/build.test.mjs',
  'test/fixtures.mjs',
  'HANDOFF.md',
  'VERIFICATION.md',
];

const REQUIRED_IDS = [
  'value-input', 'unit-select',
  'basis-conventional', 'basis-fan', 'basis-note',
  'run-button', 'example-button', 'reset-button', 'cancel-button',
  'status', 'status-text', 'error-box', 'error-text', 'example-note',
  'result-section', 'result-summary',
  'conv-celsius', 'conv-fahrenheit', 'conv-gas',
  'fan-celsius', 'fan-fahrenheit', 'fan-gas',
  'chart-table',
];

// Forbidden anywhere in public/js: dynamic execution, network, storage,
// clipboard, console output, markup sinks.
const FORBIDDEN_JS = [
  'innerHTML', 'outerHTML', 'document.write', 'eval(', 'new Function',
  'fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon',
  'localStorage', 'sessionStorage', 'indexedDB', 'clipboard',
  'console.',
];

const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

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
  const core = await read('public/js/core/convert.mjs');
  if (/^\s*import\s/m.test(core) || /\bfrom\s+['"]/.test(core)) {
    fail('core: must not import anything');
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
    'public/js/core/convert.mjs',
  ];
  for (const file of jsFiles) {
    const text = await read(file);
    for (const token of FORBIDDEN_JS) {
      if (text.includes(token)) fail(`${file}: forbidden token ${token}`);
    }
    if (/import\(/.test(text)) fail(`${file}: dynamic import is not allowed`);
  }
  pass('no forbidden sinks in public/js');

  // Pinned chart in the core data.
  const expectedChart = [
    ['¼', 110, 225], ['½', 120, 250], ['1', 140, 275], ['2', 150, 300],
    ['3', 170, 325], ['4', 180, 350], ['5', 190, 375], ['6', 200, 400],
    ['7', 220, 425], ['8', 230, 450], ['9', 240, 475], ['10', 260, 500],
  ];
  if (GAS_CHART.length !== expectedChart.length) {
    fail(`core chart: expected ${expectedChart.length} rows, got ${GAS_CHART.length}`);
  }
  expectedChart.forEach(([label, c, f], i) => {
    const row = GAS_CHART[i];
    if (!row || row.gasMark !== label || row.celsius !== c || row.fahrenheit !== f) {
      fail(`core chart row ${i}: expected ${label}/${c}/${f}`);
    }
  });
  pass('pinned Gas Mark chart data');

  // HTML checks for both languages.
  const zh = await read('public/index.html');
  const en = await read('public/en/index.html');
  let zhIds = null;
  for (const [name, html] of [['zh', zh], ['en', en]]) {
    if (!html.includes('<meta name="robots" content="noindex,nofollow">')) {
      fail(`${name}: missing robots noindex,nofollow meta`);
    }
    if (!html.includes(`content="${CSP}"`)) fail(`${name}: missing or wrong CSP meta`);
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
    // Static chart rows match the pinned table cell for cell.
    for (const [label, c, f] of expectedChart) {
      const rowHtml = `<td>${label}</td><td>${c}</td><td>${f}</td>`;
      if (!html.includes(rowHtml)) fail(`${name}: chart row missing or wrong: ${label}/${c}/${f}`);
    }
  }
  pass('HTML metadata, id parity and static chart');

  // Exact SPEC strings.
  if (!zh.includes('<html lang="zh-Hant">')) fail('zh: lang must be zh-Hant');
  if (!zh.includes('<title>烤箱溫度換算｜Gloss Tools</title>')) fail('zh: title mismatch');
  if (!zh.includes('<h1>烤箱溫度換算</h1>')) fail('zh: h1 mismatch');
  if (!zh.includes('食譜寫 °C、°F 還是 Gas Mark？一次換算三種標示，還能對照一般烤箱與旋風烤箱的設定，附完整 Gas Mark 對照表。')) {
    fail('zh: description mismatch');
  }
  if (!en.includes('<html lang="en">')) fail('en: lang must be en');
  if (!en.includes('<title>Oven Temperature Converter | Gloss Tools</title>')) fail('en: title mismatch');
  if (!en.includes('<h1>Oven Temperature Converter</h1>')) fail('en: h1 mismatch');
  if (!en.includes('Convert oven temperatures between Celsius, Fahrenheit and Gas Mark, with conventional and fan-assisted settings and the full Gas Mark chart.')) {
    fail('en: description mismatch');
  }
  if (!zh.includes('旋風烤箱為什麼要調低？') || !zh.includes('溫度超出對照表怎麼辦？')) {
    fail('zh: FAQ questions missing');
  }
  if (!en.includes('Why lower the temperature for a fan oven?') || !en.includes('What if the temperature is outside the chart?')) {
    fail('en: FAQ questions missing');
  }
  if (MESSAGES['zh-Hant'].statusDirty !== '輸入已變更，請重新執行'
    || MESSAGES['zh-Hant'].statusCancelled !== '已取消，可重新執行'
    || MESSAGES.en.statusDirty !== 'Input changed. Run again.'
    || MESSAGES.en.statusCancelled !== 'Cancelled. You can run again.') {
    fail('i18n: pinned status strings mismatch');
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
