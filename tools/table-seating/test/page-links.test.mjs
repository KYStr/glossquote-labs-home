import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('canonical and alternate links resolve to the intended language pages', async () => {
  const zh = new URL('../public/index.html', import.meta.url);
  const en = new URL('../public/en/index.html', import.meta.url);

  for (const page of [zh, en]) {
    const html = await readFile(page, 'utf8');
    const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]+)">/g)];
    assert.deepEqual(canonicals.map(([, href]) => new URL(href, page).href), [page.href]);
    const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)];
    assert.equal(alternates.length, 3);
    assert.deepEqual(Object.fromEntries(alternates.map(([, lang, href]) => [lang, new URL(href, page).href])), {
      'zh-Hant': zh.href,
      en: en.href,
      'x-default': zh.href,
    });
  }
});
