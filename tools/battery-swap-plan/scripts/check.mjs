// Static checks for the Event Battery Swap Plan candidate: package contract,
// bilingual page structure, core purity, forbidden sinks/capabilities,
// and literal-fixture coverage in the test suite.
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}
function ok(msg) {
  console.log(`ok: ${msg}`);
}

async function read(rel) {
  return readFile(join(root, rel), 'utf8');
}

// --- package.json ---
const pkg = JSON.parse(await read('package.json'));
if (pkg.type !== 'module') fail('package.json: type must be "module".');
if (!String(pkg.engines?.node || '').includes('24')) fail('package.json: engines.node must require Node >=24.');
if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) fail('package.json: runtime dependencies must be zero.');
if (pkg.devDependencies && Object.keys(pkg.devDependencies).length > 0) fail('package.json: devDependencies must be zero.');
for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
  if (!pkg.scripts?.[script]) fail(`package.json: missing script "${script}".`);
}
ok('package.json contract');

// --- pages ---
const zh = await read('public/index.html');
const en = await read('public/en/index.html');
const requiredIds = [
  'plan-form', 'charged', 'charged-error', 'devices', 'add-device', 'submit',
  'cancel', 'load-example', 'clear-draft', 'status', 'result',
  'result-empty', 'result-body', 'sum-required', 'sum-extra', 'sum-unused',
  'sum-first-missing', 'shortage-note', 'enough-note', 'result-table',
];
for (const [name, html] of [['zh', zh], ['en', en]]) {
  for (const id of requiredIds) {
    if (!html.includes(`id="${id}"`)) fail(`${name} page missing id="${id}".`);
  }
  if (!html.includes('name="robots" content="noindex, nofollow"')) fail(`${name} page missing preview noindex.`);
  if (!html.includes('rel="canonical"')) fail(`${name} page missing canonical.`);
  if (!html.includes('hreflang="x-default"')) fail(`${name} page missing x-default alternate.`);
  if (!html.includes('<h1>')) fail(`${name} page missing h1.`);
  if (!html.includes('name="description"')) fail(`${name} page missing description.`);
  if (!html.includes('type="module"')) fail(`${name} page missing module script.`);
}
if (!zh.includes('lang="zh-Hant"')) fail('zh page lang must be zh-Hant.');
if (!en.includes('lang="en"')) fail('en page lang must be en.');
if (!zh.includes('活動備用電池替換表｜Gloss Tools')) fail('zh page title mismatch.');
if (!en.includes('Event Battery Swap Plan | Gloss Tools')) fail('en page title mismatch.');
if (!zh.includes('href="../../"')) fail('zh page missing same-language home link (../../).');
if (!en.includes('href="../../../en/"')) fail('en page missing same-language home link (../../../en/).');
if (!zh.includes('href="./en/index.html"')) fail('zh page missing language link.');
if (!en.includes('href="../index.html"')) fail('en page missing language link.');
ok('bilingual page structure');

// --- core purity + forbidden capabilities in public/js ---
async function listJs(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listJs(p)));
    else if (entry.isFile() && (p.endsWith('.js') || p.endsWith('.mjs'))) out.push(p);
  }
  return out;
}
const jsFiles = await listJs(join(root, 'public', 'js'));
const forbidden = [
  'innerHTML', 'outerHTML', 'document.write', 'insertAdjacentHTML',
  'fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage',
  'indexedDB', 'navigator.sendBeacon', 'WebSocket', 'eval(',
];
for (const file of jsFiles) {
  const src = await readFile(file, 'utf8');
  for (const pat of forbidden) {
    if (src.includes(pat)) fail(`${file}: forbidden pattern "${pat}".`);
  }
}
const coreFiles = jsFiles.filter((f) => f.includes(`${join('js', 'core')}`));
for (const file of coreFiles) {
  const src = await readFile(file, 'utf8');
  for (const pat of ['document.', 'window.', 'localStorage', 'fetch(']) {
    if (src.includes(pat)) fail(`core file ${file} must stay pure (found "${pat}").`);
  }
  if (!src.includes('export function solve') && !src.includes('export function createFlow')) {
    fail(`core file ${file} has no expected export.`);
  }
}
ok('core purity + forbidden-capability scan');

// --- CSS: no remote assets ---
const css = await read('public/styles/app.css');
if (/https?:\/\//.test(css) || /@import/.test(css)) fail('app.css must not reference remote assets.');
ok('CSS has no remote references');

// --- fixture coverage: all 8 literal case ids appear in the test suite ---
const fixturesTest = await read('test/fixtures.test.mjs');
const caseIds = [
  'battery-swap-plan.gaps-and-shortage', 'battery-swap-plan.simultaneous',
  'battery-swap-plan.exact-end', 'battery-swap-plan.swap-after-gap',
  'battery-swap-plan.zero-stock', 'battery-swap-plan.overlap',
  'battery-swap-plan.dirty-after-edit', 'battery-swap-plan.cancel-then-late',
];
for (const id of caseIds) {
  if (!fixturesTest.includes(id)) fail(`test suite missing literal case ${id}.`);
}
ok('all 8 literal fixture cases are tested');

// --- required files ---
for (const rel of [
  'HANDOFF.md', 'VERIFICATION.md',
  'public/js/core/solve.mjs', 'public/js/core/flow.mjs', 'public/js/app.js',
  'scripts/build.mjs', 'scripts/check.mjs', 'scripts/check-generated.mjs', 'scripts/serve.mjs',
  'test/fixtures.test.mjs', 'test/validation.test.mjs',
  'test/algorithm.test.mjs', 'test/flow.test.mjs', 'test/scaffold.test.mjs',
]) {
  try {
    await read(rel);
  } catch {
    fail(`missing required file: ${rel}.`);
  }
}
ok('required files present');

if (failed) process.exit(1);
console.log('check OK.');
