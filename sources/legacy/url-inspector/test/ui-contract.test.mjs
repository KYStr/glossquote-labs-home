import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { messages } from '../public/js/i18n.mjs';
test('T02 both static documents expose equal controls, fixed navigation, no truncation or submit', async () => {
  const pages = await Promise.all(['../public/index.html', '../public/en/index.html'].map(p => readFile(new URL(p, import.meta.url), 'utf8')));
  const ids = html => [...html.matchAll(/id="([^"]+)"/gu)].map(m => m[1]);
  assert.deepEqual(ids(pages[0]), ids(pages[1]));
  for (const page of pages) {
    assert.equal(new Set(ids(page)).size, ids(page).length);
    assert.equal([...page.matchAll(/id="language-hint"/gu)].length, 1);
    const header = /<header\b[^>]*>([\s\S]*?)<\/header>/u.exec(page)[1];
    assert.match(header, /aria-describedby="language-hint"/);
    assert.match(header, /class="language-switch"[\s\S]*id="language-hint"/);
    assert.match(page, /<textarea id="result"[^>]*readonly/);
    assert.match(page, /id="status"[^>]*role="status"/);
    assert.match(page, /<noscript>/); assert.doesNotMatch(page, /maxlength|<form\b|target="_blank"|http-equiv="refresh"/);
    for (const [, tag] of page.matchAll(/(<button[^>]*>)/gu)) assert.match(tag, /type="button"/);
  }
  assert.match(pages[0], /href="https:\/\/glossquote.com\/index.html"/);
  assert.match(pages[1], /href="https:\/\/glossquote.com\/en\/index.html"/);
  assert.deepEqual(Object.keys(messages['zh-Hant'].errors), Object.keys(messages.en.errors));
});
