// Static checks (SPEC §5/§6): required files, exact npm script interface,
// forbidden API/selector-execution tokens, HTML hygiene, localization parity,
// CSP agreement between _headers and the preview server, core purity, and a
// core smoke test against the documented default example.

import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
function fail(msg) { failures.push(msg); }
async function read(rel) { return readFile(path.join(root, rel), 'utf8'); }
async function exists(rel) {
  try { await access(path.join(root, rel)); return true; } catch { return false; }
}

const REQUIRED_FILES = [
  'src/index.html', 'src/en/index.html',
  'src/assets/core.mjs', 'src/assets/controller.mjs', 'src/assets/app.mjs',
  'src/assets/texts.mjs', 'src/assets/styles.css', 'src/_headers',
  'scripts/build.mjs', 'scripts/check.mjs', 'scripts/check-generated.mjs',
  'scripts/serve.mjs', 'package.json', 'README.md', 'VERIFICATION.md',
];
for (const rel of REQUIRED_FILES) {
  if (!(await exists(rel))) fail('missing required file: ' + rel);
}

const REQUIRED_SCRIPTS = {
  'test': 'node --test tests/*.test.mjs',
  'check': 'node scripts/check.mjs',
  'build:preview': 'node scripts/build.mjs --mode=preview',
  'check:generated:preview': 'node scripts/check-generated.mjs --mode=preview',
  'build:production': 'node scripts/build.mjs --mode=production',
  'check:generated:production': 'node scripts/check-generated.mjs --mode=production',
  'dev': 'node scripts/serve.mjs',
};
const pkg = JSON.parse(await read('package.json'));
for (const [name, cmd] of Object.entries(REQUIRED_SCRIPTS)) {
  if (!pkg.scripts || pkg.scripts[name] !== cmd) {
    fail('package.json script "' + name + '" must be exactly: ' + cmd);
  }
}
if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) fail('package.json must have zero dependencies');
if (pkg.devDependencies && Object.keys(pkg.devDependencies).length > 0) fail('package.json must have zero devDependencies');

const FORBIDDEN = [
  'fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'localStorage',
  'sessionStorage', 'document.cookie', 'navigator.clipboard', 'eval(',
  'Function(', 'innerHTML', 'outerHTML', 'insertAdjacentHTML',
  'document.write', 'querySelector', 'location.search', 'location.hash',
  'createElementNS', 'DOMParser',
];
const assetFiles = ['core.mjs', 'controller.mjs', 'app.mjs', 'texts.mjs'];
const assetText = {};
for (const name of assetFiles) {
  assetText[name] = await read('src/assets/' + name);
  for (const token of FORBIDDEN) {
    if (assetText[name].includes(token)) fail('forbidden token "' + token + '" in src/assets/' + name);
  }
}
for (const token of ['document', 'window', 'history', 'location']) {
  if (assetText['core.mjs'].includes(token)) fail('core.mjs must stay DOM-free; found "' + token + '"');
}

const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'none'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
const headersFile = await read('src/_headers');
if (!headersFile.includes('Content-Security-Policy: ' + CSP)) fail('src/_headers CSP does not match SPEC §5');
if (!headersFile.includes('X-Content-Type-Options: nosniff')) fail('src/_headers missing nosniff');
if (!headersFile.includes('Referrer-Policy: no-referrer')) fail('src/_headers missing no-referrer');
const serveText = await read('scripts/serve.mjs');
if (!serveText.includes(CSP)) fail('scripts/serve.mjs CSP does not match src/_headers');

const { TEXTS } = await import(pathToFileURL(path.join(root, 'src/assets/texts.mjs')).href);
function flatten(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (v !== null && typeof v === 'object') flatten(v, key, out);
    else out.add(key);
  }
  return out;
}
const zhKeys = flatten(TEXTS.zh, '', new Set());
const enKeys = flatten(TEXTS.en, '', new Set());
for (const k of zhKeys) if (!enKeys.has(k)) fail('texts key missing in en: ' + k);
for (const k of enKeys) if (!zhKeys.has(k)) fail('texts key missing in zh: ' + k);
for (const code of ['SCHEMA', 'LENGTH', 'EMPTY', 'UNSUPPORTED_CHAR', 'UNSUPPORTED_NAME', 'UNSUPPORTED_CONTEXT', 'DEPTH', 'BRANCH_LIMIT', 'SYNTAX']) {
  if (!zhKeys.has('errors.' + code) || !enKeys.has('errors.' + code)) fail('missing error text: ' + code);
}

function lookup(table, dotted) {
  let cur = table;
  for (const part of dotted.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

const appIds = [...assetText['app.mjs'].matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]);
for (const page of ['src/index.html', 'src/en/index.html']) {
  const html = await read(page);
  const lang = page.includes('/en/') ? 'en' : 'zh-Hant';
  if (!html.includes('<html lang="' + lang + '">')) fail(page + ': wrong lang attribute');
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) fail(page + ': must contain exactly one h1');
  if (!html.includes('<script type="module" src="/assets/app.mjs"></script>')) fail(page + ': module script reference mismatch');
  if (!html.includes('<link rel="stylesheet" href="/assets/styles.css">')) fail(page + ': stylesheet reference mismatch');
  if (/<script(?![^>]*src=)/.test(html)) fail(page + ': inline script found');
  if (/<style[\s>]/.test(html)) fail(page + ': inline style element found');
  if (/\sstyle=/.test(html)) fail(page + ': inline style attribute found');
  if (/\son[a-z]+\s*=/.test(html)) fail(page + ': inline event handler found');
  for (const id of appIds) {
    if (!html.includes('id="' + id + '"')) fail(page + ': missing element id used by app.mjs: ' + id);
  }
  const i18nKeys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
  for (const key of i18nKeys) {
    if (lookup(TEXTS.zh, key) === undefined || lookup(TEXTS.en, key) === undefined) {
      fail(page + ': data-i18n key not present in both locales: ' + key);
    }
  }
}

const { compareSelectors, formatSummary } = await import(pathToFileURL(path.join(root, 'src/assets/core.mjs')).href);
const { INITIAL_LEFT, INITIAL_RIGHT } = await import(pathToFileURL(path.join(root, 'src/assets/controller.mjs')).href);
const smoke = compareSelectors({ left: INITIAL_LEFT, right: INITIAL_RIGHT });
if (!smoke.ok) fail('core smoke: default example must parse');
else {
  if (JSON.stringify(smoke.left.specificity) !== '[1,1,0]') fail('core smoke: L triple mismatch');
  if (JSON.stringify(smoke.right.specificity) !== '[0,2,1]') fail('core smoke: R triple mismatch');
  if (smoke.comparison !== 'left' || smoke.firstDifference !== 'A') fail('core smoke: comparison mismatch');
  if (formatSummary(smoke) !== 'L: (1,1,0)\nR: (0,2,1)\ncomparison: left\nfirstDifference: A') fail('core smoke: summary mismatch');
}
for (const page of ['src/index.html', 'src/en/index.html']) {
  const html = await read(page);
  for (const [id, expected] of [['left-input', INITIAL_LEFT], ['right-input', INITIAL_RIGHT]]) {
    const match = html.match(new RegExp('id="' + id + '"[^>]*>([^<]*)</textarea>'));
    if (!match || match[1] !== expected) fail(page + ': initial value of #' + id + ' must be ' + JSON.stringify(expected));
  }
}

if (failures.length > 0) {
  console.error('CHECK FAIL (' + failures.length + ')');
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log('CHECK PASS');
