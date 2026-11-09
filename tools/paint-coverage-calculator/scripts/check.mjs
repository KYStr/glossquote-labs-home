// Static checks for the tool: file contract, bilingual page requirements,
// and the privacy/security floor (no remote resources, no unsafe DOM in
// app code, no DOM/network/storage access in the pure core).

import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { TOOL_ROOT } from './build.mjs';

const failures = [];
const ok = (cond, label) => {
  if (cond) console.log(`  ok — ${label}`);
  else {
    failures.push(label);
    console.error(`  FAIL — ${label}`);
  }
};

async function read(rel) {
  return readFile(path.join(TOOL_ROOT, rel), 'utf8');
}

const REQUIRED = [
  'package.json',
  'public/index.html',
  'public/en/index.html',
  'public/js/app.js',
  'public/js/core/paint-core.mjs',
  'public/js/core/fractions.mjs',
  'public/styles/main.css',
  'scripts/build.mjs',
  'scripts/check.mjs',
  'scripts/check-generated.mjs',
  'scripts/serve.mjs',
  'test/fixtures.test.mjs',
  'test/validation.test.mjs',
  'HANDOFF.md',
  'VERIFICATION.md',
];
for (const rel of REQUIRED) {
  let exists = true;
  try {
    await access(path.join(TOOL_ROOT, rel));
  } catch {
    exists = false;
  }
  ok(exists, `exists: ${rel}`);
}

const pkg = JSON.parse(await read('package.json'));
ok(pkg.type === 'module', 'package.json is ESM');
ok(pkg.engines?.node === '>=24', 'package.json requires Node >=24');
ok(!pkg.dependencies || Object.keys(pkg.dependencies).length === 0, 'zero runtime dependencies');
for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
  ok(typeof pkg.scripts?.[script] === 'string', `script present: ${script}`);
}

const zh = await read('public/index.html');
const en = await read('public/en/index.html');
for (const [name, html, langAttr] of [
  ['zh', zh, 'lang="zh-Hant"'],
  ['en', en, 'lang="en"'],
]) {
  ok(html.includes(langAttr), `${name}: lang attribute`);
  ok(/<title>[^<]+<\/title>/.test(html), `${name}: title`);
  ok(html.includes('name="description"'), `${name}: meta description`);
  ok(html.includes('noindex'), `${name}: preview noindex`);
  ok(html.includes('rel="canonical"'), `${name}: canonical`);
  ok(html.includes('hreflang="zh-Hant"') && html.includes('hreflang="en"'), `${name}: hreflang cross-links`);
  ok(/<h1>[^<]+<\/h1>/.test(html), `${name}: h1`);
  ok(html.includes('href="../../"'), `${name}: same-language homepage link (../../)`);
}

const appJs = await read('public/js/app.js');
ok(!appJs.includes('innerHTML'), 'app.js never uses innerHTML');
ok(!appJs.includes('outerHTML') && !appJs.includes('insertAdjacentHTML'), 'app.js uses no HTML insertion APIs');
ok(!appJs.includes('fetch(') && !appJs.includes('localStorage'), 'app.js does no network/storage access');

for (const rel of ['public/js/core/paint-core.mjs', 'public/js/core/fractions.mjs']) {
  const src = await read(rel);
  ok(
    !/document\.|window\.|fetch\(|localStorage|sessionStorage|XMLHttpRequest|eval\(|new Function/.test(src),
    `${rel}: pure core (no DOM/network/storage/eval)`,
  );
}

for (const rel of [
  'public/index.html',
  'public/en/index.html',
  'public/js/app.js',
  'public/styles/main.css',
]) {
  const src = await read(rel);
  ok(!/https?:\/\//.test(src), `${rel}: no remote URLs (fully local)`);
}

if (failures.length > 0) {
  console.error(`check: FAIL — ${failures.length} problem(s)`);
  process.exit(1);
}
console.log('check: OK — all static checks passed');
