// Static HTML tests: both language pages carry the SPEC-pinned metadata,
// noindex, CSP (worker-src blob:), the required control ids, a visible
// label for the routes field, path-only language/home links, and no inline
// handlers or inline scripts. Message parity is checked here too.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MESSAGES } from '../public/js/messages.mjs';

const IDS = [
  'routes', 'run', 'example', 'reset', 'cancel', 'download', 'status',
  'error', 'notice', 'results', 'summary', 'no-overlaps', 'table-wrap',
  'results-body', 'prev-page', 'next-page', 'page-label',
];

const pages = [
  {
    file: new URL('../public/index.html', import.meta.url),
    lang: 'zh-Hant',
    title: '路由樣式交疊檢查｜Gloss Tools',
    h1: '路由樣式交疊檢查',
    description: 'API 維護者新增一條靜態或參數路由前，想找同一方法下可能同時匹配的既有樣式，拿到實際可複算的 path witness。',
    langLink: './en/index.html',
    homeLink: '../../',
    script: './js/app.js',
    css: './styles/app.css',
  },
  {
    file: new URL('../public/en/index.html', import.meta.url),
    lang: 'en',
    title: 'Route Pattern Overlap Audit | Gloss Tools',
    h1: 'Route Pattern Overlap Audit',
    description: 'Find pairs of supported route patterns with a matching method and show a path that fits both.',
    langLink: '../index.html',
    homeLink: '../../en/',
    script: '../js/app.js',
    css: '../styles/app.css',
  },
];

for (const page of pages) {
  test(`page ${page.lang}: metadata, controls, links`, async () => {
    const html = await readFile(page.file, 'utf8');
    assert.ok(html.includes(`<html lang="${page.lang}">`), 'lang');
    assert.ok(html.includes(`<title>${page.title}</title>`), 'title');
    assert.ok(html.includes(`<h1>${page.h1}</h1>`), 'h1');
    assert.ok(html.includes(`content="${page.description}"`), 'description');
    assert.ok(html.includes('name="robots" content="noindex, nofollow"'), 'robots noindex');
    assert.ok(!html.includes('rel="canonical"'), 'no production canonical in preview');
    assert.ok(!html.includes('hreflang'), 'no hreflang in preview');
    assert.ok(html.includes('worker-src blob:'), 'CSP allows blob: workers');
    assert.ok(html.includes(`href="${page.langLink}"`), 'language link is path-only');
    assert.ok(html.includes(`href="${page.homeLink}"`), 'home link');
    assert.ok(html.includes(`src="${page.script}"`), 'app script');
    assert.ok(html.includes(`href="${page.css}"`), 'stylesheet');
    for (const id of IDS) assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
    assert.ok(html.includes('<label for="routes">'), 'visible label for routes');
    assert.ok(!html.includes('onclick='), 'no inline handlers');
    assert.ok(!html.includes('<script>'), 'no inline scripts');
    assert.ok(html.includes('aria-live="polite"'), 'polite live region');
  });
}

test('messages: zh and en carry identical keys', () => {
  assert.deepEqual(Object.keys(MESSAGES.zh).sort(), Object.keys(MESSAGES.en).sort());
  for (const key of Object.keys(MESSAGES.zh)) {
    assert.equal(typeof MESSAGES.zh[key], typeof MESSAGES.en[key], `type mismatch for ${key}`);
  }
});
