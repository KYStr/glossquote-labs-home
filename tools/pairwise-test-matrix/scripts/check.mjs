// Static checks: package contract, forbidden sinks, core purity,
// generated worker source in sync, and both HTML pages carrying the
// SPEC-pinned metadata (no inline scripts, no production canonical or
// hreflang in the candidate, robots noindex).

import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { workerSourceText } from './build.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PUBLIC = join(ROOT, 'public');

const failures = [];
function check(ok, label) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures.push(label);
}

const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
check(pkg.type === 'module', 'package.json: type module');
check(typeof pkg.engines?.node === 'string' && pkg.engines.node.includes('24'), 'package.json: engines node >=24');
for (const s of ['test', 'check', 'build:preview', 'check:generated:preview']) {
  check(typeof pkg.scripts?.[s] === 'string', `package.json: script ${s}`);
}
check(!pkg.dependencies && !pkg.devDependencies, 'package.json: zero dependencies');

const core = await readFile(join(PUBLIC, 'js', 'core', 'pairwise.mjs'), 'utf8');
check(!/^import /m.test(core) && !/ from ['"]/.test(core), 'core: no imports (self-contained for Worker embedding)');
for (const token of ['document.', 'window.', 'localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'eval(', 'new Function', 'innerHTML']) {
  check(!core.includes(token), `core: no ${token}`);
}

const appJs = await readFile(join(PUBLIC, 'js', 'app.js'), 'utf8');
const controller = await readFile(join(PUBLIC, 'js', 'controller.mjs'), 'utf8');
const executor = await readFile(join(PUBLIC, 'js', 'worker-executor.mjs'), 'utf8');
for (const [name, src] of [['app.js', appJs], ['controller.mjs', controller], ['worker-executor.mjs', executor]]) {
  for (const token of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'eval(', 'new Function', 'innerHTML', 'document.write', 'localStorage', 'sessionStorage', 'sendBeacon', 'import(']) {
    check(!src.includes(token), `${name}: no ${token}`);
  }
}
check(!/\.postMessage\(/.test(appJs), 'app.js: no direct postMessage (executor owns the Worker)');

const generated = await workerSourceText();
const committed = await readFile(join(PUBLIC, 'js', 'worker-source.mjs'), 'utf8');
check(committed === generated, 'worker-source.mjs in sync with core + entry');

const zh = await readFile(join(PUBLIC, 'index.html'), 'utf8');
const en = await readFile(join(PUBLIC, 'en', 'index.html'), 'utf8');
for (const [name, html] of [['index.html', zh], ['en/index.html', en]]) {
  check(!/<script(?![^>]*\ssrc=)/.test(html), `${name}: no inline script`);
  check(html.includes('noindex,nofollow'), `${name}: robots noindex,nofollow`);
  check(html.includes('Content-Security-Policy'), `${name}: CSP meta`);
  check(html.includes("default-src 'none'") && html.includes("script-src 'self'") && html.includes('worker-src blob:'), `${name}: pinned CSP directives`);
  check(!/rel="canonical"/.test(html) && !/hreflang/.test(html), `${name}: no production canonical/hreflang (SPEC candidate rule)`);
}
check(zh.includes('lang="zh-Hant"') && zh.includes('<h1>兩兩覆蓋測試矩陣</h1>'), 'index.html: zh-Hant H1');
check(zh.includes('<title>兩兩覆蓋測試矩陣｜Gloss Tools</title>'), 'index.html: zh title');
check(zh.includes('測試工程師有幾個有限選項，需先挑一份能覆蓋任兩維選項配對的測試清單。'), 'index.html: zh description');
check(en.includes('lang="en"') && en.includes('<h1>Pairwise Test Matrix</h1>'), 'en/index.html: en H1');
check(en.includes('<title>Pairwise Test Matrix | Gloss Tools</title>'), 'en/index.html: en title');
check(en.includes('Build a reproducible set of test cases that covers all pairs of values across the supplied dimensions.'), 'en/index.html: en description');
check(zh.includes('href="./en/index.html"') && zh.includes('href="../../"'), 'index.html: language + home links');
check(en.includes('href="../index.html"') && en.includes('href="../../en/"'), 'en/index.html: language + home links');
check(zh.includes('這是最少案例的證明嗎？') && zh.includes('這代表每個組合都會測嗎？'), 'index.html: zh FAQ');
check(en.includes('Is this a minimum-case proof?') && en.includes('Does it include every combination?'), 'en/index.html: en FAQ');

if (failures.length > 0) {
  console.error(`\ncheck failed: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('\ncheck ok');
