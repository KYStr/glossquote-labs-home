// Static checks for Numeric Range Coverage Audit.
// Syntax-checks every JS file, enforces zero runtime dependencies, scans for
// forbidden sinks, and verifies the two language pages carry the exact
// SPEC-pinned metadata. Exit non-zero on any failure.
//
// Usage: node scripts/check.mjs

import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (message) => failures.push(message);

async function listJs(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listJs(full, base)));
    else if (entry.isFile() && entry.name.endsWith('.mjs')) files.push(full);
  }
  return files;
}

const major = Number(process.version.slice(1).split('.')[0]);
if (major < 24) fail(`Node >= 24 required, found ${process.version}`);

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (pkg.type !== 'module') fail('package.json must set "type": "module"');
if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) fail('runtime dependencies are forbidden');
if (pkg.devDependencies && Object.keys(pkg.devDependencies).length > 0) fail('devDependencies are forbidden');
for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
  if (!pkg.scripts || !pkg.scripts[script]) fail(`package.json missing script: ${script}`);
}

// File contract.
const required = [
  'package.json',
  'public/index.html',
  'public/en/index.html',
  'public/js/core/range.mjs',
  'public/js/core/controller.mjs',
  'public/js/worker-source.mjs',
  'public/js/app.js',
  'public/styles/app.css',
  'scripts/build.mjs',
  'scripts/check.mjs',
  'scripts/serve.mjs',
  'scripts/check-generated.mjs',
  'HANDOFF.md',
  'VERIFICATION.md',
];
for (const file of required) {
  try {
    await readFile(path.join(root, file), 'utf8');
  } catch {
    fail(`missing required file: ${file}`);
  }
}

// Syntax-check every .mjs under public/, scripts/, test/.
const jsFiles = [
  ...(await listJs(path.join(root, 'public'))),
  ...(await listJs(path.join(root, 'scripts'))),
  ...(await listJs(path.join(root, 'test'))),
];
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch {
    fail(`syntax error in ${path.relative(root, file)}`);
  }
}

// Forbidden sinks and capabilities.
const forbidden = [
  [/fetch\s*\(/, 'fetch('],
  [/XMLHttpRequest/, 'XMLHttpRequest'],
  [/WebSocket/, 'WebSocket'],
  [/\beval\s*\(/, 'eval('],
  [/new\s+Function/, 'new Function'],
  [/innerHTML/, 'innerHTML'],
  [/document\.write/, 'document.write'],
  [/localStorage/, 'localStorage'],
  [/sessionStorage/, 'sessionStorage'],
  [/indexedDB/, 'indexedDB'],
  [/navigator\.clipboard/, 'navigator.clipboard'],
  [/sendBeacon/, 'sendBeacon'],
  [/\.src\s*=/, '.src ='],
  [/\.href\s*=\s*['"`]javascript:/, 'javascript: href'],
];
// Worker onmessage/onerror assignments are the sanctioned worker wiring, not
// inline handlers; the handler-attribute check applies to HTML only, with an
// explicit event-name list (a bare /on\w+=/ would false-positive on content=).
const HANDLER_ATTRS = ['onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover', 'onmousemove', 'onmouseout', 'onmouseenter', 'onmouseleave', 'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur', 'oninput', 'onchange', 'onsubmit', 'onload', 'onerror', 'onresize', 'onscroll', 'oncontextmenu', 'onpaste', 'oncopy', 'oncut', 'ondrag', 'ondrop', 'ontouchstart', 'ontouchend', 'onpointerdown', 'onpointerup', 'onwheel', 'onselect', 'onreset', 'onsearch'];
const htmlForbidden = [[new RegExp(`\\s(${HANDLER_ATTRS.join('|')})\\s*=`, 'i'), 'inline event handler attribute']];
const jsFilesToScan = await listJs(path.join(root, 'public/js'));
for (const file of jsFilesToScan) {
  const text = await readFile(file, 'utf8');
  for (const [pattern, label] of forbidden) {
    if (pattern.test(text)) fail(`${path.relative(root, file)}: forbidden ${label}`);
  }
}
for (const file of [path.join(root, 'public/index.html'), path.join(root, 'public/en/index.html')]) {
  const text = await readFile(file, 'utf8');
  for (const [pattern, label] of [...forbidden, ...htmlForbidden]) {
    if (pattern.test(text)) fail(`${path.relative(root, file)}: forbidden ${label}`);
  }
}

// Core purity: no DOM / network / storage references in the pure core.
for (const file of ['public/js/core/range.mjs', 'public/js/core/controller.mjs']) {
  const text = await readFile(path.join(root, file), 'utf8');
  for (const token of ['document', 'window', 'navigator', 'localStorage', 'sessionStorage', 'fetch(']) {
    if (text.includes(token)) fail(`${file}: pure core references ${token}`);
  }
}

// Worker bundle contract: worker-source imports only the core; app.js carries
// exactly one placeholder for the build to replace.
const workerText = await readFile(path.join(root, 'public/js/worker-source.mjs'), 'utf8');
if (!workerText.includes("from './core/range.mjs'")) fail('worker-source.mjs must import the core');
if ((workerText.match(/^import /gm) || []).length !== 1) fail('worker-source.mjs must have exactly one import');
const appText = await readFile(path.join(root, 'public/js/app.js'), 'utf8');
if ((appText.split('"__WORKER_SOURCE_PLACEHOLDER__"').length - 1) !== 1) {
  fail('app.js must contain exactly one worker-source placeholder');
}

// Page metadata: exact SPEC-pinned strings.
const zh = await readFile(path.join(root, 'public/index.html'), 'utf8');
const en = await readFile(path.join(root, 'public/en/index.html'), 'utf8');
const pageChecks = [
  [zh, 'lang="zh-Hant"', 'zh lang'],
  [zh, '<title>數值區間覆蓋檢查｜Gloss Tools</title>', 'zh title'],
  [zh, '資料工程師在切分資料處理責任、掃描門檻或連續索引區段前，想核對整個定義域內有沒有漏段或重複工作，並指回原列。', 'zh description'],
  [zh, '<h1>數值區間覆蓋檢查</h1>', 'zh h1'],
  [zh, '相接端點算重疊嗎？', 'zh FAQ 1'],
  [zh, '三段重合會乘三嗎？', 'zh FAQ 2'],
  [zh, 'href="../../"', 'zh home link'],
  [zh, 'href="./en/index.html"', 'zh language link'],
  [en, 'lang="en"', 'en lang'],
  [en, '<title>Numeric Range Coverage Audit | Gloss Tools</title>', 'en title'],
  [en, 'Check half-open decimal ranges for gaps and overlaps. Review exact lengths and the source rows active in each span.', 'en description'],
  [en, '<h1>Numeric Range Coverage Audit</h1>', 'en h1'],
  [en, 'Do touching endpoints overlap?', 'en FAQ 1'],
  [en, 'Is a three-way overlap counted three times?', 'en FAQ 2'],
  [en, 'href="../../en/"', 'en home link'],
  [en, 'href="../index.html"', 'en language link'],
];
for (const [text, needle, label] of pageChecks) {
  if (!text.includes(needle)) fail(`page check failed: ${label}`);
}
for (const [label, text] of [['zh', zh], ['en', en]]) {
  if (!text.includes('name="robots" content="noindex,nofollow"')) fail(`${label} page missing robots noindex`);
  if (!text.includes('http-equiv="Content-Security-Policy"')) fail(`${label} page missing CSP meta`);
  if (!text.includes("worker-src blob:")) fail(`${label} CSP missing worker-src blob:`);
  if (!text.includes('rel="canonical"')) fail(`${label} page missing canonical`);
  if (!text.includes('rel="alternate" hreflang=')) fail(`${label} page missing hreflang`);
  if (!/id="domain-start"/.test(text) || !/id="domain-end"/.test(text) || !/id="intervals"/.test(text)) {
    fail(`${label} page missing input fields`);
  }
  for (const id of ['run-btn', 'load-example-btn', 'reset-btn', 'cancel-btn', 'download-btn', 'status-text', 'error-box', 'results', 'spans-body', 'prev-page', 'next-page']) {
    if (!text.includes(`id="${id}"`)) fail(`${label} page missing #${id}`);
  }
}

if (failures.length > 0) {
  console.error(`check FAILED (${failures.length}):`);
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}
console.log(`check OK: ${jsFiles.length} JS files syntax-checked, pages and contracts verified`);
