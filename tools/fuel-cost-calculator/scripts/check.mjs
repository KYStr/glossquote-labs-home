// Static checks for the Fuel Cost Calculator candidate.
//
// Verifies the house contract without a browser: package shape, core purity
// (no DOM/network/storage, no floating-point shortcuts in the pinned
// constants), the DOM layer never turning user input into HTML, and both
// pages carrying the required bilingual/SEO/privacy markers with no
// external resources.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const failures = [];
const fail = (message) => failures.push(message);
const read = (rel) => readFile(path.join(toolRoot, rel), 'utf8');

// --- package.json -------------------------------------------------------
const pkg = JSON.parse(await read('package.json'));
if (pkg.type !== 'module') fail('package.json: "type" must be "module"');
if (!pkg.engines || pkg.engines.node !== '>=24') fail('package.json: engines.node must be ">=24"');
for (const key of ['dependencies', 'devDependencies']) {
  if (pkg[key] && Object.keys(pkg[key]).length > 0) {
    fail(`package.json: ${key} must be empty (zero dependencies)`);
  }
}
for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
  if (!pkg.scripts || !pkg.scripts[script]) fail(`package.json: missing script "${script}"`);
}

// --- core purity ----------------------------------------------------------
const coreDir = path.join(toolRoot, 'public/js/core');
const coreFiles = (await readdir(coreDir)).filter((name) => name.endsWith('.mjs')).sort();
if (coreFiles.length === 0) fail('public/js/core: no core modules found');
const forbiddenCore = [
  'document', 'window', 'localStorage', 'sessionStorage', 'fetch(',
  'XMLHttpRequest', 'eval(', 'Function(', 'Math.', 'parseFloat', 'Number(',
];
let coreText = '';
for (const name of coreFiles) {
  const text = await read(`public/js/core/${name}`);
  coreText += text;
  for (const token of forbiddenCore) {
    if (text.includes(token)) fail(`public/js/core/${name}: forbidden token "${token}"`);
  }
}

// The pinned exact constants must appear verbatim (SPEC section 4 audit).
for (const pinned of ['112903n', '480n', '56826125n', '201168n', '3785411784n', '454609n', '1609344n']) {
  if (!coreText.includes(pinned)) fail(`core: pinned constant ${pinned} not found verbatim`);
}

// --- DOM layer safety -----------------------------------------------------
const appText = await read('public/js/app.js');
for (const token of ['innerHTML', 'outerHTML', 'document.write', 'fetch(', 'localStorage', 'eval(']) {
  if (appText.includes(token)) fail(`public/js/app.js: forbidden token "${token}"`);
}
if (!appText.includes('textContent')) fail('public/js/app.js: expected textContent rendering');

// --- pages ----------------------------------------------------------------
const pages = [
  { rel: 'public/index.html', lang: 'zh-Hant' },
  { rel: 'public/en/index.html', lang: 'en' },
];
for (const page of pages) {
  const html = await read(page.rel);
  if (!html.includes(`<html lang="${page.lang}">`)) fail(`${page.rel}: wrong or missing lang`);
  if (!html.includes('<title>')) fail(`${page.rel}: missing <title>`);
  if (!html.includes('name="description"')) fail(`${page.rel}: missing meta description`);
  if (!html.includes('content="noindex, nofollow"')) fail(`${page.rel}: preview must be noindex`);
  if (!html.includes('rel="canonical"')) fail(`${page.rel}: missing canonical`);
  if (!html.includes('hreflang="zh-Hant"') || !html.includes('hreflang="en"')) {
    fail(`${page.rel}: missing hreflang cross-links`);
  }
  if (!html.includes('<h1>')) fail(`${page.rel}: missing <h1>`);
  if (/src="https?:\/\//.test(html) || /href="https?:\/\//.test(html)) {
    fail(`${page.rel}: external resource URL found`);
  }
  if (!html.includes('Content-Security-Policy')) fail(`${page.rel}: missing CSP meta`);
}

// Cross-language equivalence spot checks: both pages expose the same fields.
const zhHtml = await read('public/index.html');
const enHtml = await read('public/en/index.html');
for (const id of ['distance-value', 'consumption-value', 'price-value', 'people-value', 'split-toggle', 'out-fuel', 'out-total', 'out-echo']) {
  if (!zhHtml.includes(`id="${id}"`) || !enHtml.includes(`id="${id}"`)) {
    fail(`pages: field/output id "${id}" missing on one of the pages`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`check FAIL ${failure}`);
  process.exit(1);
}
console.log('check OK');
