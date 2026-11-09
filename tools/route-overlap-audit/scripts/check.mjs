// Static source checks (no build output needed).
// Usage: node scripts/check.mjs
// Verifies: package contract (Node >=24, ESM, zero deps, required scripts),
// core purity (no imports, no DOM/network/storage references), the fixed
// Worker handler (no dynamic execution, only run/postMessage), forbidden
// sinks anywhere under public/js and scripts, bilingual message parity
// (zh/en carry exactly the same keys), and the two static pages (lang,
// title, description, h1, noindex meta, no production canonical/hreflang
// per SPEC, language link, same-language home link, required control ids).

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full, base));
    else if (entry.isFile()) files.push(path.relative(base, full));
  }
  return files;
}

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
check(pkg.type === 'module', 'package.json: type must be module');
check(typeof pkg.engines?.node === 'string' && pkg.engines.node.includes('24'), 'package.json: engines.node must require >=24');
check(!pkg.dependencies || Object.keys(pkg.dependencies).length === 0, 'package.json: no runtime dependencies allowed');
check(!pkg.devDependencies || Object.keys(pkg.devDependencies).length === 0, 'package.json: no devDependencies allowed');
for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
  check(typeof pkg.scripts?.[script] === 'string', `package.json: missing script ${script}`);
}

const core = await readFile(path.join(root, 'public', 'js', 'core', 'core.mjs'), 'utf8');
check(!/^import\s/m.test(core) && !/from\s+['"]/.test(core), 'core.mjs: must not import anything');
for (const token of ['document', 'window', 'self.', 'localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'XMLHttpRequest', 'WebSocket', 'eval(', 'new Function', 'innerHTML']) {
  check(!core.includes(token), `core.mjs: forbidden token ${token}`);
}
check(core.includes('export function run('), 'core.mjs: must export run');
check(core.includes('export function serializeReport('), 'core.mjs: must export serializeReport');

const handler = await readFile(path.join(root, 'scripts', 'worker-handler.mjs'), 'utf8');
for (const token of ['eval(', 'new Function', 'import(', 'fetch(', 'localStorage', 'document']) {
  check(!handler.includes(token), `worker-handler.mjs: forbidden token ${token}`);
}
check(handler.includes('self.onmessage'), 'worker-handler.mjs: must define self.onmessage');
check(handler.includes('run(data.input)'), 'worker-handler.mjs: must call run on the posted input');
check(handler.includes('self.postMessage'), 'worker-handler.mjs: must post the outcome back');

const FORBIDDEN = [
  'eval(', 'new Function', 'innerHTML', 'outerHTML', 'insertAdjacentHTML',
  'document.write', 'fetch(', 'XMLHttpRequest', 'WebSocket', 'navigator.sendBeacon',
  'localStorage', 'sessionStorage', 'indexedDB', 'Notification',
];
const jsFiles = (await listFiles(path.join(root, 'public', 'js'))).filter((f) => f.endsWith('.mjs') || f.endsWith('.js'));
for (const file of jsFiles) {
  const source = await readFile(path.join(root, 'public', 'js', file), 'utf8');
  for (const token of FORBIDDEN) {
    check(!source.includes(token), `public/js/${file}: forbidden token ${token}`);
  }
}

const { MESSAGES } = await import(path.join(root, 'public', 'js', 'messages.mjs'));
const zhKeys = Object.keys(MESSAGES.zh).sort();
const enKeys = Object.keys(MESSAGES.en).sort();
check(JSON.stringify(zhKeys) === JSON.stringify(enKeys), 'messages.mjs: zh and en keys must match exactly');
check(zhKeys.length > 0, 'messages.mjs: must define messages');

const pages = [
  {
    file: 'public/index.html',
    lang: 'zh-Hant',
    title: '路由樣式交疊檢查｜Gloss Tools',
    h1: '路由樣式交疊檢查',
    description: 'API 維護者新增一條靜態或參數路由前，想找同一方法下可能同時匹配的既有樣式，拿到實際可複算的 path witness。',
    langLink: './en/index.html',
    homeLink: '../../',
  },
  {
    file: 'public/en/index.html',
    lang: 'en',
    title: 'Route Pattern Overlap Audit | Gloss Tools',
    h1: 'Route Pattern Overlap Audit',
    description: 'Find pairs of supported route patterns with a matching method and show a path that fits both.',
    langLink: '../index.html',
    homeLink: '../../en/',
  },
];
for (const page of pages) {
  const html = await readFile(path.join(root, page.file), 'utf8');
  check(html.includes(`<html lang="${page.lang}">`), `${page.file}: lang must be ${page.lang}`);
  check(html.includes(`<title>${page.title}</title>`), `${page.file}: title mismatch`);
  check(html.includes(`<h1>${page.h1}</h1>`), `${page.file}: h1 mismatch`);
  check(html.includes(`content="${page.description}"`), `${page.file}: description mismatch`);
  check(html.includes('name="robots" content="noindex, nofollow"'), `${page.file}: must carry robots noindex, nofollow`);
  check(!html.includes('rel="canonical"'), `${page.file}: preview must not carry a production canonical (SPEC)`);
  check(!html.includes('hreflang'), `${page.file}: preview must not carry hreflang (SPEC)`);
  check(html.includes(`href="${page.langLink}"`), `${page.file}: language link must be ${page.langLink}`);
  check(html.includes(`href="${page.homeLink}"`), `${page.file}: home link must be ${page.homeLink}`);
  check(html.includes('worker-src blob:'), `${page.file}: CSP must allow blob: workers`);
  for (const id of ['routes', 'run', 'example', 'reset', 'cancel', 'download', 'status', 'error', 'notice', 'results', 'summary', 'no-overlaps', 'table-wrap', 'results-body', 'prev-page', 'next-page', 'page-label']) {
    check(html.includes(`id="${id}"`), `${page.file}: missing element id=${id}`);
  }
  check(html.includes('<label for="routes">'), `${page.file}: routes field must have a visible label`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log('check: all static checks passed');
}
