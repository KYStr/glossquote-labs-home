// Static checks for the Running Pace Calculator preview.
// Fails (exit 1) on the first category with problems; prints one line per
// problem so the output is reviewable. Checks are lexical/structural only;
// behaviour is covered by the node:test suites.

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

function fail(message) {
  problems.push(message);
}

async function read(rel) {
  return readFile(path.join(root, rel), 'utf8');
}

async function exists(rel) {
  return (await stat(path.join(root, rel)).catch(() => null)) !== null;
}

// 1. Required files.
const required = [
  'package.json',
  'public/index.html',
  'public/en/index.html',
  'public/js/app.js',
  'public/js/core/constants.mjs',
  'public/js/core/time.mjs',
  'public/js/core/units.mjs',
  'public/js/core/validate.mjs',
  'public/js/core/solver.mjs',
  'public/js/core/splits.mjs',
  'public/js/core/riegel.mjs',
  'public/js/core/state.mjs',
  'public/styles/app.css',
  'scripts/build.mjs',
  'scripts/check.mjs',
  'scripts/serve.mjs',
  'HANDOFF.md',
  'VERIFICATION.md',
];
for (const rel of required) {
  if (!(await exists(rel))) fail(`missing required file: ${rel}`);
}

// 2. package.json contract: ESM, Node >= 24, zero dependencies, all scripts.
const pkg = JSON.parse(await read('package.json'));
if (pkg.type !== 'module') fail('package.json: "type" must be "module"');
if (pkg.engines?.node !== '>=24') fail('package.json: engines.node must be ">=24"');
for (const key of ['dependencies', 'devDependencies']) {
  if (pkg[key] && Object.keys(pkg[key]).length > 0) {
    fail(`package.json: ${key} must be empty (zero-dependency tool)`);
  }
}
for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
  if (!pkg.scripts?.[script]) fail(`package.json: missing script "${script}"`);
}

// 3. Core purity: no DOM, network, storage, eval or HTML injection anywhere
//    in the product code; core modules must not import the DOM layer.
const coreDir = path.join(root, 'public/js/core');
const coreFiles = (await readdir(coreDir)).filter((name) => name.endsWith('.mjs'));
const forbidden = [
  [/\bdocument\b/, 'document'],
  [/\bwindow\b/, 'window'],
  [/\bfetch\s*\(/, 'fetch()'],
  [/\bXMLHttpRequest\b/, 'XMLHttpRequest'],
  [/\blocalStorage\b/, 'localStorage'],
  [/\bsessionStorage\b/, 'sessionStorage'],
  [/\binnerHTML\b/, 'innerHTML'],
  [/\beval\s*\(/, 'eval()'],
  [/\bFunction\s*\(/, 'Function()'],
];
for (const name of coreFiles) {
  const source = stripComments(await readFile(path.join(coreDir, name), 'utf8'));
  for (const [pattern, label] of forbidden) {
    if (pattern.test(source)) fail(`core/${name}: forbidden construct ${label}`);
  }
  if (source.includes('app.js')) fail(`core/${name}: core must not reference the DOM layer`);
}
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const appSource = await read('public/js/app.js');
for (const [pattern, label] of forbidden.slice(6)) {
  if (pattern.test(stripComments(appSource))) fail(`js/app.js: forbidden construct ${label}`);
}

// 4. SPEC constants appear once, in constants.mjs, with the pinned values.
const constantsSource = await read('public/js/core/constants.mjs');
for (const pinned of ['1.609344', '1.06', '21.0975', '42.195']) {
  if (!constantsSource.includes(pinned)) fail(`constants.mjs: pinned value ${pinned} not found`);
}
for (const name of coreFiles) {
  if (name === 'constants.mjs') continue;
  const source = stripComments(await readFile(path.join(coreDir, name), 'utf8'));
  if (source.includes('1.609344') || source.includes('1.06')) {
    fail(`core/${name}: SPEC constants must live only in constants.mjs`);
  }
}

// 5. Both HTML pages: language, title, description, noindex preview,
//    canonical + hreflang cross-links, same-language home link, local assets.
async function checkPage(rel, lang, homeHref) {
  const html = await read(rel);
  if (!html.includes(`<html lang="${lang}">`)) fail(`${rel}: <html lang="${lang}"> missing`);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${rel}: <title> missing`);
  if (!html.includes('name="description"')) fail(`${rel}: meta description missing`);
  if (!html.includes('content="noindex, nofollow"')) fail(`${rel}: preview must be noindex`);
  if (!html.includes('rel="canonical"')) fail(`${rel}: canonical link missing`);
  if (!html.includes('hreflang="zh-Hant"') || !html.includes('hreflang="en"')) {
    fail(`${rel}: hreflang cross-links missing`);
  }
  if (!html.includes(`href="${homeHref}"`)) fail(`${rel}: same-language home link ${homeHref} missing`);
  if (/(?:src|href)="https?:\/\//.test(html)) fail(`${rel}: external resource reference found`);
  if (!html.includes('<h1>')) fail(`${rel}: <h1> missing`);
}
await checkPage('public/index.html', 'zh-Hant', '../../');
await checkPage('public/en/index.html', 'en', '../../../en/');

// 6. CSS must stay local: no imports or remote URLs.
const css = await read('public/styles/app.css');
if (css.includes('@import') || /url\(\s*['"]?https?:/.test(css)) {
  fail('styles/app.css: external reference found');
}

// 7. Serve script must bind loopback only and never auto-open a browser.
const serve = await read('scripts/serve.mjs');
if (!serve.includes('127.0.0.1')) fail('scripts/serve.mjs: must bind 127.0.0.1');
if (serve.includes('node:child_process')) fail('scripts/serve.mjs: must not spawn an opener');

if (problems.length > 0) {
  for (const problem of problems) console.error(`check FAILED: ${problem}`);
  process.exit(1);
}
console.log('check OK — file contract, core purity, constants and page metadata all pass.');
