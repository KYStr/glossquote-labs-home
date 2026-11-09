// Static checks for the Water Intake Calculator (SPEC sections 4-5):
// file contract, pinned constants, page/string-table agreement, core purity,
// forbidden-language audit, and no external resources anywhere.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL } from '../public/js/core/model.mjs';
import { STRINGS, modelStatement, auditableStrings, auditText } from '../public/js/core/strings.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (msg) => problems.push(msg);

async function read(rel) {
  try { return await readFile(path.join(root, rel), 'utf8'); }
  catch { fail('missing file: ' + rel); return ''; }
}

// 1. File contract + package shape
const pkg = JSON.parse(await read('package.json'));
for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
  if (!pkg.scripts || !pkg.scripts[script]) fail('package.json missing script: ' + script);
}
if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) fail('runtime dependencies must be zero');
if (!pkg.engines || !pkg.engines.node || !pkg.engines.node.includes('24')) fail('package.json engines.node must require >=24');

const zhHtml = await read('public/index.html');
const enHtml = await read('public/en/index.html');
const appJs = await read('public/js/app.js');
const coreModel = await read('public/js/core/model.mjs');
const coreStrings = await read('public/js/core/strings.mjs');

// 2. Pinned constants equal SPEC section 4 exactly
if (MODEL.baselineLowMlPerKg !== 30 || MODEL.baselineHighMlPerKg !== 35) fail('baseline rates must be 30/35 ml per kg');
if (MODEL.cupMl !== 250) fail('cup must be 250 ml');
if (MODEL.weightMinKg !== 20 || MODEL.weightMaxKg !== 300) fail('weight bounds must be 20-300 kg');
const expectedActivity = { sedentary: 0, light: 350, moderate: 700, high: 1050 };
for (const [k, v] of Object.entries(expectedActivity)) {
  if (MODEL.activityMl[k] !== v) fail('activity addition mismatch: ' + k);
}
const expectedClimate = { temperate: 1.0, warm: 1.1, hot: 1.25 };
for (const [k, v] of Object.entries(expectedClimate)) {
  if (MODEL.climate[k].factor !== v) fail('climate multiplier mismatch: ' + k);
}

// 3. Pages agree with the string tables and the generated model statement
for (const [locale, html, langAttr] of [['zh-Hant', zhHtml, 'zh-Hant'], ['en', enHtml, 'en']]) {
  const s = STRINGS[locale];
  if (!html.includes('<html lang="' + langAttr + '">')) fail(locale + ': wrong lang attribute');
  if (!html.includes('<title>' + s.title + '</title>')) fail(locale + ': title diverges from string table');
  if (!html.includes('<meta name="description" content="' + s.description + '">')) fail(locale + ': meta description diverges');
  if (!html.includes('<h1>' + s.h1 + '</h1>')) fail(locale + ': h1 diverges');
  if (!html.includes(s.disclaimer)) fail(locale + ': full disclaimer missing from page');
  if (!html.includes(modelStatement(locale))) fail(locale + ': on-page model statement diverges from generated statement');
  if (!html.includes('<!--META-->')) fail(locale + ': <!--META--> placeholder missing');
}
if (!zhHtml.includes('href="../../"')) fail('zh page must link back to the same-language homepage (../../)');
if (!enHtml.includes('href="../../en/"')) fail('en page must link back to the same-language homepage (../../en/)');
if (!zhHtml.includes('href="en/"')) fail('zh page must cross-link to the en page');
if (!enHtml.includes('href="../"')) fail('en page must cross-link to the zh page');

// 4. Disclaimer adjacency: disclaimer element directly follows the result
for (const [locale, html] of [['zh-Hant', zhHtml], ['en', enHtml]]) {
  const resultClose = html.indexOf('</section>', html.indexOf('id="result"'));
  const disclaimerAt = html.indexOf('id="disclaimer"');
  if (resultClose === -1 || disclaimerAt === -1 || disclaimerAt < resultClose) {
    fail(locale + ': disclaimer is not after the result block');
  } else if (html.slice(resultClose + '</section>'.length, disclaimerAt).replace(/<p\s*$/, '').trim() !== '') {
    fail(locale + ': content intervenes between result and disclaimer');
  }
}

// 5. Forbidden-language audit (SPEC 5.2) over string tables and page text,
//    with the disclaimer itself exempted
for (const locale of ['zh-Hant', 'en']) {
  for (const text of auditableStrings(locale)) {
    const hits = auditText(text);
    if (hits.length > 0) fail(locale + ': forbidden language in strings: ' + hits.join(', '));
  }
}
for (const [locale, html] of [['zh-Hant', zhHtml], ['en', enHtml]]) {
  const stripped = html.split(STRINGS[locale].disclaimer).join('');
  const hits = auditText(stripped);
  if (hits.length > 0) fail(locale + ': forbidden language in page: ' + hits.join(', '));
}

// 6. Core purity and DOM safety
for (const [name, src] of [['model.mjs', coreModel], ['strings.mjs', coreStrings]]) {
  for (const bad of ['document', 'window', 'localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'eval(', 'Function(']) {
    if (src.includes(bad)) fail('core ' + name + ' must not reference ' + bad);
  }
}
if (appJs.includes('innerHTML')) fail('app.js must never use innerHTML');
for (const bad of ['localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'eval(', 'Function(', 'sendBeacon']) {
  if (appJs.includes(bad)) fail('app.js must not use ' + bad);
}

// 7. No external resources anywhere in public/
async function walk(dir, base, out) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, base, out);
    else out.push(path.relative(base, full));
  }
  return out;
}
for (const rel of await walk(path.join(root, 'public'), path.join(root, 'public'), [])) {
  const src = await read('public/' + rel.split(path.sep).join('/'));
  if (/https?:\/\//.test(src)) fail('external URL found in public/' + rel);
  if (/(src|href)\s*=\s*"\/\//.test(src)) fail('protocol-relative resource in public/' + rel);
}

if (problems.length > 0) {
  console.error('CHECK FAIL (' + problems.length + ')');
  for (const p of problems) console.error(' - ' + p);
  process.exit(1);
}
console.log('CHECK PASS (files, constants, page/string agreement, adjacency, audit, purity, no external resources)');
