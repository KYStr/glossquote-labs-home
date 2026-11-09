// Static checks for Binary Record Inspector (source tree).
// Verifies the package contract, both HTML pages (exact SPEC metadata,
// preview noindex, no production canonical/hreflang, fixed navigation),
// the no-network/no-dynamic-execution/no-storage rules, and core purity.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
  else console.log(`ok - ${message}`);
}

async function read(rel) {
  return readFile(path.join(root, rel), 'utf8');
}

const pkg = JSON.parse(await read('package.json'));
check(pkg.type === 'module', 'package.json: type module');
check(
  typeof pkg.engines?.node === 'string' && pkg.engines.node.includes('24'),
  'package.json: Node >= 24',
);
check(
  pkg.dependencies === undefined && pkg.devDependencies === undefined,
  'package.json: zero dependencies',
);
for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
  check(typeof pkg.scripts?.[script] === 'string', `package.json: script ${script}`);
}

const zh = await read('public/index.html');
const en = await read('public/en/index.html');

check(zh.includes('<html lang="zh-Hant">'), 'zh page: lang zh-Hant');
check(en.includes('<html lang="en">'), 'en page: lang en');
check(
  zh.includes('<title>二進位記錄欄位檢視｜Gloss Tools</title>'),
  'zh page: exact title',
);
check(
  en.includes('<title>Binary Record Inspector | Gloss Tools</title>'),
  'en page: exact title',
);
check(zh.includes('<h1>二進位記錄欄位檢視</h1>'), 'zh page: exact H1');
check(en.includes('<h1>Binary Record Inspector</h1>'), 'en page: exact H1');
check(
  zh.includes(
    '<meta name="description" content="工程師拿到測試 fixture 的十六進位 dump 和欄位位置，需在寫解析器前驗證多個欄的 endian 和 signed 讀值。">',
  ),
  'zh page: exact description',
);
check(
  en.includes(
    '<meta name="description" content="Read integer fields from a pasted hex record using explicit offsets, byte order and signedness.">',
  ),
  'en page: exact description',
);
check(
  zh.includes('偏移從哪裡算？') && zh.includes('第一個 byte 的偏移是 0。'),
  'zh page: FAQ offset',
);
check(
  zh.includes('兩欄可以共用 bytes 嗎？') &&
    zh.includes('可以，讀值依每欄指定型別，不會改寫。'),
  'zh page: FAQ overlap',
);
check(
  en.includes('Where does an offset start?') &&
    en.includes('The first byte is at offset zero.'),
  'en page: FAQ offset',
);
check(
  en.includes('Can two fields overlap?') &&
    en.includes('Each field reads its requested bytes without editing them.'),
  'en page: FAQ overlap',
);

for (const [name, html] of [
  ['zh', zh],
  ['en', en],
]) {
  check(
    html.includes('<meta name="robots" content="noindex, nofollow">'),
    `${name} page: preview noindex`,
  );
  check(!html.includes('rel="canonical"'), `${name} page: no production canonical`);
  check(!html.includes('hreflang'), `${name} page: no hreflang in preview`);
  check(
    html.includes("default-src 'none'") &&
      html.includes("script-src 'self'") &&
      html.includes("worker-src blob:") &&
      html.includes("connect-src 'none'") &&
      html.includes("frame-ancestors 'none'"),
    `${name} page: CSP meta per SPEC`,
  );
  check(
    html.includes('X-Content-Type-Options') && html.includes('Permissions-Policy'),
    `${name} page: security meta headers`,
  );
  check(html.includes('id="hex-input"') && html.includes('id="layout-input"'), `${name} page: inputs`);
  check(html.includes('id="run-button"'), `${name} page: run button`);
  check(html.includes('id="download-button"'), `${name} page: download button`);
  check(html.includes('id="results"'), `${name} page: results section`);
  check(html.includes('aria-live="polite"'), `${name} page: polite status region`);
}
check(zh.includes('href="../../"'), 'zh page: home link ../../');
check(en.includes('href="../../en/"'), 'en page: home link ../../en/');
check(zh.includes('href="en/index.html"'), 'zh page: language link to en');
check(en.includes('href="../index.html"'), 'en page: language link to zh');
check(zh.includes('href="styles/app.css"'), 'zh page: stylesheet reference');
check(en.includes('href="../styles/app.css"'), 'en page: stylesheet reference');
check(zh.includes('src="js/app.js"'), 'zh page: app script reference');
check(en.includes('src="../js/app.js"'), 'en page: app script reference');

const core = await read('public/js/core/inspector.mjs');
const controller = await read('public/js/controller.mjs');
const app = await read('public/js/app.js');
const workerEntry = await read('src/worker-entry.mjs');

const forbidden = [
  ['fetch(', 'fetch'],
  ['XMLHttpRequest', 'XHR'],
  ['WebSocket', 'WebSocket'],
  ['eval(', 'eval'],
  ['new Function', 'new Function'],
  ['innerHTML', 'innerHTML'],
  ['document.write', 'document.write'],
  ['localStorage', 'localStorage'],
  ['sessionStorage', 'sessionStorage'],
  ['indexedDB', 'indexedDB'],
  ['sendBeacon', 'beacon'],
  ['import(', 'dynamic import'],
  ['clipboard', 'clipboard'],
  ['console.log', 'console logging'],
  ['console.info', 'console logging'],
  ['console.warn', 'console logging'],
  ['console.error', 'console logging'],
];
for (const [name, source] of [
  ['core', core],
  ['controller', controller],
  ['app', app],
  ['worker-entry', workerEntry],
]) {
  for (const [pattern, label] of forbidden) {
    check(!source.includes(pattern), `${name}: no ${label}`);
  }
}
check(!/^\s*import\s/m.test(workerEntry), 'worker-entry: no import statements');
check(!/^\s*export\s/m.test(workerEntry), 'worker-entry: no export statements');
check(
  workerEntry.includes('self.onmessage') && workerEntry.includes('self.postMessage'),
  'worker-entry: wires self.onmessage/postMessage',
);
check(
  !core.includes('document') && !core.includes('window') && !core.includes('self'),
  'core: no DOM/window/self references',
);
check(!/^\s*import\s/m.test(core), 'core: no imports (embeddable into the Worker)');
check(app.includes("from './worker-source.js'"), 'app: imports generated worker source');
check(
  app.includes('textContent') && app.includes('createElement'),
  'app: safe DOM APIs',
);
check(controller.includes('serializeReport'), 'controller: serializes report before download');
check(app.includes('URL.revokeObjectURL'), 'app: revokes Blob URLs');
check(app.includes('pagehide') && app.includes('pageshow'), 'app: pagehide/bfcache handling');

const css = await read('public/styles/app.css');
check(css.includes('--gq-color-paper'), 'css: paper/ink tokens');
check(css.includes(':focus-visible'), 'css: visible focus treatment');
check(css.includes('prefers-reduced-motion'), 'css: reduced motion honored');

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exit(1);
}
console.log('\nall static checks passed');
