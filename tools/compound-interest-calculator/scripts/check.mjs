// Static checks for the tool's file contract and house rules.
// Exits non-zero and lists every problem found.
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (msg) => problems.push(msg);

async function read(rel) {
  try {
    return await readFile(path.join(toolDir, rel), 'utf8');
  } catch {
    fail(`missing file: ${rel}`);
    return '';
  }
}

const REQUIRED = [
  'package.json',
  'public/index.html',
  'public/en/index.html',
  'public/js/app.js',
  'public/js/core/money.mjs',
  'public/js/core/simulate.mjs',
  'public/js/core/csv.mjs',
  'public/styles/app.css',
  'scripts/build.mjs',
  'scripts/check.mjs',
  'scripts/check-generated.mjs',
  'scripts/serve.mjs',
  'HANDOFF.md',
  'VERIFICATION.md',
];
for (const rel of REQUIRED) {
  const info = await stat(path.join(toolDir, rel)).catch(() => null);
  if (!info || !info.isFile()) fail(`missing file: ${rel}`);
}

// package.json: ESM, Node >=24, zero dependencies, required scripts.
const pkg = JSON.parse(await read('package.json') || '{}');
if (pkg.type !== 'module') fail('package.json: type must be "module"');
if (!pkg.engines || pkg.engines.node !== '>=24') fail('package.json: engines.node must be ">=24"');
if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) fail('package.json: runtime dependencies must be zero');
for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
  if (!pkg.scripts || !pkg.scripts[script]) fail(`package.json: missing script "${script}"`);
}

// Core purity: no DOM, network, storage or HTML injection anywhere in core.
const coreDir = path.join(toolDir, 'public/js/core');
for (const name of await readdir(coreDir)) {
  if (!name.endsWith('.mjs')) continue;
  const src = await readFile(path.join(coreDir, name), 'utf8');
  for (const banned of ['document', 'window', 'fetch(', 'localStorage', 'sessionStorage', 'XMLHttpRequest', 'innerHTML', 'eval(', 'Function(']) {
    if (src.includes(banned)) fail(`core/${name}: forbidden reference "${banned}"`);
  }
}

// App layer: user input is rendered with textContent/value only.
const app = await read('public/js/app.js');
if (app.includes('innerHTML')) fail('public/js/app.js: innerHTML is forbidden (use textContent)');
if (/fetch\(|XMLHttpRequest|localStorage|sessionStorage/.test(app)) {
  fail('public/js/app.js: network/storage access is forbidden');
}

// Pages: language, SEO and privacy contract for both locales.
const pages = [
  { rel: 'public/index.html', lang: 'zh-Hant', home: 'href="../../"' },
  { rel: 'public/en/index.html', lang: 'en', home: 'href="../../../en/"' },
];
for (const page of pages) {
  const html = await read(page.rel);
  if (!html.includes(`<html lang="${page.lang}">`)) fail(`${page.rel}: wrong or missing lang="${page.lang}"`);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${page.rel}: missing <title>`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) fail(`${page.rel}: missing meta description`);
  if (!/<h1>[^<]+<\/h1>/.test(html)) fail(`${page.rel}: missing <h1>`);
  if (!html.includes('name="robots" content="noindex')) fail(`${page.rel}: preview must be noindex`);
  if (!html.includes('rel="canonical"')) fail(`${page.rel}: missing canonical`);
  if (!html.includes('hreflang="zh-Hant"') || !html.includes('hreflang="en"') || !html.includes('hreflang="x-default"')) {
    fail(`${page.rel}: hreflang set must include zh-Hant, en and x-default`);
  }
  if (!html.includes(page.home)) fail(`${page.rel}: missing same-language home link ${page.home}`);
  if (!html.includes('src="../js/app.js"') && !html.includes('src="./js/app.js"')) {
    fail(`${page.rel}: does not load the shared app.js`);
  }
  // No external resources: no http(s) src/href on resource tags.
  for (const m of html.matchAll(/<(?:script|link|img)\b[^>]*(?:src|href)="(https?:[^"]*)"/g)) {
    fail(`${page.rel}: external resource ${m[1]}`);
  }
}

if (problems.length > 0) {
  console.error(`check FAIL (${problems.length} problem${problems.length === 1 ? '' : 's'})`);
  for (const p of problems) console.error(` - ${p}`);
  process.exit(1);
}
console.log('check PASS: file contract, core purity, bilingual page contract, zero dependencies');
