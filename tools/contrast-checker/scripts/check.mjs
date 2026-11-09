// Static checks for the Contrast Checker (SPEC sections 2, 5, 6):
// required files, exact npm script interface, zero dependencies, core
// purity (no DOM/network/storage), app DOM safety (no innerHTML), HTML
// hygiene (lang/title/description/noindex/canonical/hreflang/home link),
// and the forbidden-claim audit: no product text may claim this is the
// collection's only contrast evaluator (SPEC section 2 - the Color Palette
// tool evaluates opaque pairs).

import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (m) => failures.push(m);
async function read(rel) { return readFile(path.join(root, rel), 'utf8'); }
async function exists(rel) { try { await access(path.join(root, rel)); return true; } catch { return false; } }

const REQUIRED_FILES = [
  'package.json',
  'public/index.html', 'public/en/index.html',
  'public/js/app.js', 'public/js/core/color.mjs', 'public/styles/main.css',
  'scripts/build.mjs', 'scripts/check.mjs', 'scripts/check-generated.mjs', 'scripts/serve.mjs',
  'test/core.test.mjs', 'HANDOFF.md', 'VERIFICATION.md',
];
for (const rel of REQUIRED_FILES) if (!(await exists(rel))) fail(`missing required file: ${rel}`);

const pkg = JSON.parse(await read('package.json'));
if (pkg.type !== 'module') fail('package.json must be ESM ("type":"module")');
if (!pkg.engines || pkg.engines.node !== '>=24') fail('package.json engines.node must be ">=24"');
if (pkg.dependencies && Object.keys(pkg.dependencies).length) fail('package.json must have zero dependencies');
if (pkg.devDependencies && Object.keys(pkg.devDependencies).length) fail('package.json must have zero devDependencies');
const REQUIRED_SCRIPTS = {
  test: 'node --test test/*.test.mjs',
  check: 'node scripts/check.mjs',
  'build:preview': 'node scripts/build.mjs',
  'check:generated:preview': 'node scripts/check-generated.mjs',
};
for (const [name, cmd] of Object.entries(REQUIRED_SCRIPTS)) {
  if (!pkg.scripts || pkg.scripts[name] !== cmd) fail(`package.json script "${name}" must be exactly: ${cmd}`);
}

// Core purity: the computation core must not touch DOM/network/storage.
const core = await read('public/js/core/color.mjs');
for (const token of ['document', 'window', 'fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'navigator', 'import(']) {
  if (core.includes(token)) fail(`core purity: color.mjs must not contain "${token}"`);
}

// App safety: no HTML sinks anywhere in the DOM layer.
const app = await read('public/js/app.js');
for (const token of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'Function(']) {
  if (app.includes(token)) fail(`app safety: app.js must not contain "${token}"`);
}

// No network/storage/analytics anywhere in product code.
for (const [rel, text] of [['public/js/app.js', app], ['public/js/core/color.mjs', core]]) {
  for (const token of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'localStorage', 'sessionStorage', 'document.cookie']) {
    if (text.includes(token)) fail(`${rel} must not contain "${token}"`);
  }
}

// HTML hygiene for both language pages.
async function checkPage(rel, { lang, homeHref }) {
  const html = await read(rel);
  if (!html.includes(`<html lang="${lang}">`)) fail(`${rel}: <html lang="${lang}"> missing`);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${rel}: title missing`);
  if (!html.includes('name="description"')) fail(`${rel}: meta description missing`);
  if (!html.includes('content="noindex, nofollow"')) fail(`${rel}: preview pages must be noindex`);
  if (!html.includes('rel="canonical"')) fail(`${rel}: canonical link missing`);
  for (const hl of ['hreflang="zh-Hant"', 'hreflang="en"', 'hreflang="x-default"']) {
    if (!html.includes(hl)) fail(`${rel}: ${hl} link missing`);
  }
  if (!html.includes(`href="${homeHref}"`)) fail(`${rel}: same-language home link (${homeHref}) missing`);
  if (/<script[^>]+src="https?:/i.test(html) || /<link[^>]+href="https?:/i.test(html)) {
    fail(`${rel}: external resources are forbidden`);
  }
  return html;
}
const zh = await checkPage('public/index.html', { lang: 'zh-Hant', homeHref: '../../' });
const en = await checkPage('public/en/index.html', { lang: 'en', homeHref: '../../en/' });

// Both pages prefill the SPEC section 3 initial pair (#777777 on #FFFFFF).
for (const [rel, html] of [['public/index.html', zh], ['public/en/index.html', en]]) {
  if (!html.includes('value="#777777"') || !html.includes('value="#FFFFFF"')) {
    fail(`${rel}: initial pair must be prefilled #777777 on #FFFFFF (SPEC section 3)`);
  }
}

// Forbidden-claim audit (SPEC section 2): the product must never claim to
// be the collection's only/sole contrast evaluator or checker.
const CLAIM_PATTERNS = [
  /only\s+(contrast|colour|color)\s+(checker|evaluator|tool)/i,
  /sole\s+(contrast|colour|color)/i,
  /(contrast|colour|color)\s+(checker|evaluator)[^<.]{0,40}\bonly\b/i,
  /唯一[^<。]{0,10}(對比|比對|檢查器)/,
  /(對比|比對)[^<。]{0,10}唯一/,
];
for (const [rel, text] of [['public/index.html', zh], ['public/en/index.html', en], ['public/js/app.js', app], ['public/js/core/color.mjs', core]]) {
  for (const pattern of CLAIM_PATTERNS) {
    if (pattern.test(text)) fail(`forbidden claim in ${rel}: matches ${pattern}`);
  }
}

if (failures.length) {
  console.error('check FAIL\n' + failures.map((f) => `- ${f}`).join('\n'));
  process.exit(1);
}
console.log('check OK - files, scripts, purity, HTML hygiene and claim audit all pass');
