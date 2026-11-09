// Static checks for the BMI/TDEE tool: file contract, privacy/security
// invariants from SPEC §5, bilingual completeness markers.
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (msg) => failures.push(msg);

const required = [
  'package.json',
  'public/index.html',
  'public/en/index.html',
  'public/js/app.js',
  'public/js/core/bmi.mjs',
  'public/styles/app.css',
  'scripts/build.mjs',
  'scripts/check.mjs',
  'scripts/check-generated.mjs',
  'scripts/serve.mjs',
  'HANDOFF.md',
  'VERIFICATION.md',
];
for (const path of required) {
  try {
    await stat(join(root, path));
  } catch {
    fail(`missing required file: ${path}`);
  }
}

const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
if (pkg.type !== 'module') fail('package.json must be ESM ("type":"module")');
if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
  fail('runtime dependencies must be zero');
}
for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
  if (!pkg.scripts?.[script]) fail(`package.json missing script: ${script}`);
}

const core = await readFile(join(root, 'public/js/core/bmi.mjs'), 'utf8');
const app = await readFile(join(root, 'public/js/app.js'), 'utf8');
const zh = await readFile(join(root, 'public/index.html'), 'utf8');
const en = await readFile(join(root, 'public/en/index.html'), 'utf8');

// Core purity: no DOM / network / storage.
for (const banned of ['document', 'window', 'fetch(', 'localStorage', 'sessionStorage', 'XMLHttpRequest', 'eval(', 'Function(']) {
  if (core.includes(banned)) fail(`core module must not reference: ${banned}`);
}
// App safety: text-only rendering, no network/storage.
for (const banned of ['innerHTML', 'outerHTML', 'document.write', 'fetch(', 'localStorage', 'sessionStorage', 'XMLHttpRequest', 'eval(', 'Function(']) {
  if (app.includes(banned)) fail(`app.js must not use: ${banned}`);
}
if (!app.includes('textContent')) fail('app.js must render via textContent');

// HTML invariants per language.
for (const [name, html] of [['zh', zh], ['en', en]]) {
  if (/src\s*=\s*"https?:/i.test(html) || /href\s*=\s*"https?:/i.test(html)) {
    fail(`${name} page must not reference external resources`);
  }
  if (!html.includes('noindex')) fail(`${name} page must carry preview noindex`);
  if (!html.includes('hreflang')) fail(`${name} page must carry hreflang cross-links`);
  if (!html.includes('rel="canonical"')) fail(`${name} page must carry a canonical link`);
  if (!html.includes('1.375') || !html.includes('1.725')) {
    fail(`${name} page must print the five activity multipliers`);
  }
  if (!html.includes('Mifflin')) fail(`${name} page must name the Mifflin-St Jeor equation`);
}
if (!zh.includes('不是醫療建議')) fail('zh page missing the not-medical-advice statement');
if (!en.includes('not medical advice')) fail('en page missing the not-medical-advice statement');
if (!zh.includes('未四捨五入')) fail('zh page missing the unrounded-category sentence');
if (!en.includes('unrounded')) fail('en page missing the unrounded-category sentence');
if (!zh.includes('23.0') || !en.includes('23.0')) fail('Asia-Pacific action points must be printed');

// Honesty gate (SPEC §6): no deficit/surplus eating-target wording anywhere
// in the shipped UI copy. (The disclaimer sentences state the tool gives NO
// such target; those use 給/ gives-no phrasing and are checked above.)
for (const banned of ['熱量赤字', 'calorie deficit', 'calorie surplus', 'eat less', '少吃', '每日應攝取']) {
  if (zh.includes(banned) || en.includes(banned) || app.includes(banned)) {
    fail(`eating-target wording found: ${banned}`);
  }
}

// Constants appear once (core only).
for (const token of ['0.45359237', '1.375', '1.725']) {
  if (!core.includes(token)) fail(`core missing constant: ${token}`);
  if (app.includes(token)) fail(`constant ${token} must live only in the core`);
}

if (failures.length > 0) {
  for (const f of failures) console.error(`FAIL: ${f}`);
  process.exit(1);
}
console.log('Static checks passed.');
