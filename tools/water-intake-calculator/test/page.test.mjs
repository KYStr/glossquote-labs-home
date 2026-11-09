// Built-page structure tests (SPEC 7(f) and section 6 localization checks).
// The preview build is run into a temporary directory so the tests are
// self-contained; expectations come from the SPEC and the string tables,
// which the SPEC fixes as the auditable text source.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRINGS } from '../public/js/core/strings.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function buildTemp() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'water-intake-page-'));
  await new Promise((resolve, reject) => {
    execFile(process.execPath,
      ['scripts/build.mjs', '--mode=preview', '--out=' + path.join(tmp, 'dist'), '--manifest=' + path.join(tmp, 'manifest.json')],
      { cwd: root, env: process.env },
      (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve(stdout)));
  });
  return tmp;
}

test('built pages: structure, disclaimer adjacency, links, meta', async (t) => {
  const tmp = await buildTemp();
  t.after(() => rm(tmp, { recursive: true, force: true }));
  const zh = await readFile(path.join(tmp, 'dist', 'index.html'), 'utf8');
  const en = await readFile(path.join(tmp, 'dist', 'en', 'index.html'), 'utf8');

  for (const [locale, html, langAttr] of [['zh-Hant', zh, 'zh-Hant'], ['en', en, 'en']]) {
    const s = STRINGS[locale];
    assert.ok(html.includes('<html lang="' + langAttr + '">'), locale + ' lang');
    assert.ok(html.includes('<title>' + s.title + '</title>'), locale + ' title');
    assert.ok(html.includes('<meta name="description" content="' + s.description + '">'), locale + ' description');
    assert.ok(html.includes('<h1>' + s.h1 + '</h1>'), locale + ' h1');
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'), locale + ' preview noindex');
    assert.ok(html.includes('rel="canonical"'), locale + ' canonical present');
    assert.ok(html.includes('hreflang="zh-Hant"') && html.includes('hreflang="en"'), locale + ' hreflang cross-links');
    // SPEC 7(f): the full disclaimer is adjacent to the result block.
    const resultClose = html.indexOf('</section>', html.indexOf('id="result"'));
    const disclaimerAt = html.indexOf('id="disclaimer"');
    assert.ok(resultClose !== -1 && disclaimerAt > resultClose, locale + ' disclaimer after result');
    assert.equal(html.slice(resultClose + '</section>'.length, disclaimerAt).replace(/<p\s*$/, '').trim(), '',
      locale + ' nothing between result and disclaimer');
    assert.ok(html.includes(s.disclaimer), locale + ' full disclaimer text present');
    // Initial state shows fixture W1's range (SPEC section 3).
    assert.ok(html.includes('2,100–2,450'), locale + ' initial W1 ml range');
    assert.ok(html.includes('8.4–9.8'), locale + ' initial W1 cups range');
    // No single-number summary in title or h1 (SPEC section 4).
    assert.ok(!/\d/.test(s.title), locale + ' title has no figure');
    assert.ok(!/\d/.test(s.h1), locale + ' h1 has no figure');
    // No external resources.
    assert.ok(!/https?:\/\//.test(html), locale + ' no external URLs');
  }
  assert.ok(zh.includes('href="../../"'), 'zh home link');
  assert.ok(en.includes('href="../../en/"'), 'en home link');
});

test('built assets: app and core contain no storage, network or HTML injection', async (t) => {
  const tmp = await buildTemp();
  t.after(() => rm(tmp, { recursive: true, force: true }));
  const app = await readFile(path.join(tmp, 'dist', 'js', 'app.js'), 'utf8');
  const core = await readFile(path.join(tmp, 'dist', 'js', 'core', 'model.mjs'), 'utf8');
  for (const bad of ['localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'innerHTML']) {
    assert.ok(!app.includes(bad), 'app.js must not contain ' + bad);
  }
  for (const bad of ['document', 'window', 'localStorage', 'fetch(']) {
    assert.ok(!core.includes(bad), 'core must not contain ' + bad);
  }
});
