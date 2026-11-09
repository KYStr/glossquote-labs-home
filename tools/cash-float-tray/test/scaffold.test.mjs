// Scaffold checks: file contract, package contract, page metadata and
// forbidden-capability scan, as node:test assertions (mirrors scripts/check.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFile(join(root, rel), 'utf8');

test('required files exist', async () => {
  for (const rel of [
    'package.json', 'HANDOFF.md', 'VERIFICATION.md',
    'public/index.html', 'public/en/index.html',
    'public/js/core/solve.mjs', 'public/js/core/flow.mjs', 'public/js/app.js',
    'public/styles/app.css',
    'scripts/build.mjs', 'scripts/check.mjs', 'scripts/check-generated.mjs', 'scripts/serve.mjs',
    'test/fixtures.test.mjs', 'test/validation.test.mjs',
    'test/algorithm.test.mjs', 'test/flow.test.mjs', 'test/scaffold.test.mjs',
  ]) {
    assert.ok(await stat(join(root, rel)).then((s) => s.isFile()), `missing ${rel}`);
  }
});

test('package.json: ESM, Node >=24, zero dependencies, all scripts', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.type, 'module');
  assert.match(String(pkg.engines.node), /24/);
  assert.deepStrictEqual(pkg.dependencies || {}, {});
  for (const s of ['test', 'check', 'build:preview', 'check:generated:preview']) {
    assert.ok(pkg.scripts[s], `missing script ${s}`);
  }
});

test('pages: lang, title, description, noindex, canonical, hreflang, home + language links', async () => {
  const zh = await read('public/index.html');
  const en = await read('public/en/index.html');
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.match(en, /<html lang="en">/);
  assert.ok(zh.includes('<title>收銀盤留款清點｜Gloss Tools</title>'));
  assert.ok(en.includes('<title>Cash Float Tray | Gloss Tools</title>'));
  for (const html of [zh, en]) {
    assert.ok(html.includes('name="robots" content="noindex, nofollow"'));
    assert.ok(html.includes('rel="canonical"'));
    assert.ok(html.includes('hreflang="x-default"'));
    assert.ok(html.includes('<h1>'));
  }
  assert.ok(zh.includes('href="../../"'));
  assert.ok(en.includes('href="../../../en/"'));
  assert.ok(zh.includes('href="./en/index.html"'));
  assert.ok(en.includes('href="../index.html"'));
});

test('no forbidden sinks or capabilities in public/js', async () => {
  async function listJs(dir) {
    const out = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...(await listJs(p)));
      else if (p.endsWith('.js') || p.endsWith('.mjs')) out.push(p);
    }
    return out;
  }
  const forbidden = [
    'innerHTML', 'outerHTML', 'document.write', 'insertAdjacentHTML',
    'fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage',
    'indexedDB', 'navigator.sendBeacon', 'WebSocket', 'eval(',
  ];
  for (const file of await listJs(join(root, 'public', 'js'))) {
    const src = await readFile(file, 'utf8');
    for (const pat of forbidden) {
      assert.ok(!src.includes(pat), `${file} contains forbidden "${pat}"`);
    }
  }
});

test('core modules stay pure (no DOM/network/storage)', async () => {
  for (const rel of ['public/js/core/solve.mjs', 'public/js/core/flow.mjs']) {
    const src = await read(rel);
    for (const pat of ['document.', 'window.', 'localStorage', 'fetch(']) {
      assert.ok(!src.includes(pat), `${rel} contains "${pat}"`);
    }
  }
});
