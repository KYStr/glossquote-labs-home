import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../scripts/files.mjs';
import { renderPage } from '../scripts/pages.mjs';
import zh from '../public/js/locales/zh-Hant.mjs';
import en from '../public/js/locales/en.mjs';

test('locale keys and error codes have complete bilingual parity', () => {
  assert.deepEqual(Object.keys(zh).sort(),Object.keys(en).sort());
  assert.deepEqual(Object.keys(zh.errors).sort(),Object.keys(en.errors).sort());
  for (const locale of [zh,en]) {
    for (const value of Object.values(locale)) if (typeof value==='string') assert.ok(value.length>0);
    assert.equal(locale.faqs.length,6);
    for (const pair of locale.faqs) assert.equal(pair.length,2);
  }
});
test('static pages match escaped source templates, labels, error hooks and empty initialization', async () => {
  for (const [file,locale] of [['index.html',zh],['en/index.html',en]]) {
    const html=await readFile(join(ROOT,'public',file),'utf8');
    assert.equal(html,renderPage(locale));
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(new Set(ids).size,ids.length);
    for (const match of html.matchAll(/\bfor="([^"]+)"/g)) assert.ok(ids.includes(match[1]));
    for (const match of html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g)) for (const id of match[1].split(' ')) assert.ok(ids.includes(id),id);
    for (const id of ['left-file','right-file','compare','download-png','download-json']) assert.match(html,new RegExp(`id="${id}"[^>]*disabled`));
    assert.match(html,/id="results"[^>]*hidden/); assert.match(html,/id="comparison"[^>]*hidden/);
    assert.ok(!html.includes('rel="canonical"')); assert.ok(!html.includes('sitemap'));
  }
});
