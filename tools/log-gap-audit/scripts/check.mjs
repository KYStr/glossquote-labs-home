// Static checks for Log Gap Audit (source tree, no browser needed).
// Fails (exit 1) on the first violated check, printing what failed.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;

function check(ok, label) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures += 1;
}

async function read(rel) {
  return readFile(path.join(root, rel), 'utf8');
}

const pkg = JSON.parse(await read('package.json'));
check(pkg.type === 'module', 'package.json: ESM (type module)');
check(
  typeof pkg.engines?.node === 'string' && pkg.engines.node.replace(/^>=/, '').split('.')[0] >= 24,
  'package.json: Node >= 24',
);
check(Object.keys(pkg.dependencies ?? {}).length === 0, 'package.json: zero runtime dependencies');
for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
  check(typeof pkg.scripts?.[script] === 'string', `package.json: script ${script}`);
}

// Forbidden sinks in product JavaScript. The single allowed dynamic import
// is the fixed literal './worker-source.mjs' (never user content).
const jsFiles = [
  'public/js/core/audit.mjs',
  'public/js/controller.mjs',
  'public/js/app.js',
  'public/js/worker.mjs',
  'public/js/worker-entry.mjs',
];
const forbidden = [
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /WebSocket/,
  /\.innerHTML/,
  /\.outerHTML/,
  /document\.write/,
  /localStorage/,
  /sessionStorage/,
  /indexedDB/,
  /sendBeacon/,
  /navigator\.clipboard/,
];
for (const rel of jsFiles) {
  const src = await read(rel);
  for (const pattern of forbidden) {
    check(!pattern.test(src), `${rel}: no ${pattern}`);
  }
  const dynamicImports = [...src.matchAll(/import\s*\(/g)];
  const allowedDynamic = [...src.matchAll(/import\(['"]\.\/worker-source\.mjs['"]\)/g)];
  check(
    dynamicImports.length === allowedDynamic.length,
    `${rel}: dynamic import only for fixed ./worker-source.mjs`,
  );
}

// Core and controller must be pure: no actual DOM / network / storage API
// use. (Names such as createWorker are plain identifiers, not API calls.)
const apiUses = [
  /\bdocument\s*\./,
  /\bwindow\s*\./,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bfetch\s*\(/,
  /\bindexedDB\b/,
  /\bnew\s+Worker\s*\(/,
  /\bnew\s+Blob\s*\(/,
  /\bURL\s*\.\s*(createObjectURL|revokeObjectURL)\b/,
];
for (const rel of ['public/js/core/audit.mjs', 'public/js/controller.mjs']) {
  const src = await read(rel);
  for (const pattern of apiUses) {
    check(!pattern.test(src), `${rel}: no ${pattern}`);
  }
}

// Worker bundle inputs: the entry fragment has no imports; the core has none.
const entry = await read('public/js/worker-entry.mjs');
check(!/^\s*import\b/m.test(entry), 'worker-entry.mjs: no imports (bundle fragment)');
const core = await read('public/js/core/audit.mjs');
check(!/^\s*import\b/m.test(core), 'core/audit.mjs: no imports (bundle fragment)');

const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

// Both pages: exact SPEC metadata, noindex, required element ids, links.
const pages = [
  {
    rel: 'public/index.html',
    lang: 'zh-Hant',
    h1: '記錄序號與時間缺口檢查',
    title: '記錄序號與時間缺口檢查｜Gloss Tools',
    description:
      '維運人員從測試資料匯出一段序號和相對毫秒，要分清哪兩行間缺序號、時間倒退、或間隔超過檢查門檻。',
    homeHref: '../../',
    langHref: 'en/index.html',
  },
  {
    rel: 'public/en/index.html',
    lang: 'en',
    h1: 'Log Sequence and Time Gap Audit',
    title: 'Log Sequence and Time Gap Audit | Gloss Tools',
    description:
      'Find sequence gaps, repeats and time reversals in adjacent log rows. Inspect the original row pairs and exact differences.',
    homeHref: '../../en/',
    langHref: '../index.html',
  },
];
const requiredIds = [
  'main', 'records', 'threshold', 'fileInput', 'findBtn', 'exampleBtn', 'resetBtn',
  'cancelBtn', 'downloadBtn', 'status', 'errorBox', 'exampleNote', 'findingsSection',
  'findingsSummary', 'findingsBody', 'pagination', 'prevPageBtn', 'nextPageBtn', 'pageInfo',
];
for (const page of pages) {
  const html = await read(page.rel);
  check(html.includes(`<html lang="${page.lang}">`), `${page.rel}: lang=${page.lang}`);
  check(html.includes(`<h1>${page.h1}</h1>`), `${page.rel}: exact H1`);
  check(html.includes(`<title>${page.title}</title>`), `${page.rel}: exact title`);
  check(
    html.includes(`<meta name="description" content="${page.description}">`),
    `${page.rel}: exact description`,
  );
  check(
    html.includes('<meta name="robots" content="noindex,nofollow">'),
    `${page.rel}: robots noindex,nofollow`,
  );
  check(
    html.includes(`<meta http-equiv="Content-Security-Policy" content="${CSP}">`),
    `${page.rel}: CSP meta`,
  );
  check(html.includes(`href="${page.homeHref}"`), `${page.rel}: same-language home link`);
  check(html.includes(`href="${page.langHref}"`), `${page.rel}: language link`);
  check(!/https?:\/\/(?!glossquote\.com)/.test(html), `${page.rel}: no remote URLs`);
  for (const id of requiredIds) {
    check(html.includes(`id="${id}"`), `${page.rel}: element #${id}`);
  }
  check(html.includes('id="auditForm"'), `${page.rel}: form present`);
  check(html.includes('SEQ_GAP'), `${page.rel}: SEQ_GAP note present`);
}

// Bilingual parity: each page's buttons carry its own language.
const zh = await read('public/index.html');
const en = await read('public/en/index.html');
check(zh.includes('找出相鄰記錄異常') && zh.includes('下載報告'), 'zh page: button labels');
check(en.includes('Find adjacent anomalies') && en.includes('Download report'), 'en page: button labels');
check(zh.includes('會先依序號排序嗎？') && zh.includes('超過門檻如何定義？'), 'zh page: FAQ');
check(en.includes('Are rows sorted first?') && en.includes('When is a time gap flagged?'), 'en page: FAQ');

// Serve script must send the full security headers (frame-ancestors cannot
// be expressed in a meta tag, so it lives in the server).
const serve = await read('scripts/serve.mjs');
for (const header of [
  'frame-ancestors',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'X-Robots-Tag',
]) {
  check(serve.includes(header), `serve.mjs: sends ${header}`);
}
check(serve.includes('127.0.0.1'), 'serve.mjs: loopback only');

if (failures > 0) {
  console.error(`check.mjs: ${failures} failure(s)`);
  process.exit(1);
}
console.log('check.mjs: all static checks passed');
