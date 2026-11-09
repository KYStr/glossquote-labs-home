import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fields } from '../src/core.mjs';
import { messages } from '../src/messages.mjs';

for (const name of (await readdir('src')).filter(name => name.endsWith('.mjs'))) {
  const result = spawnSync(process.execPath, ['--check', 'src/' + name], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
const app = await readFile('src/app.mjs', 'utf8');
const css = await readFile('style.css', 'utf8');
assert.doesNotMatch(app + css, /https?:\/\//);
assert.doesNotMatch(app, /innerHTML|outerHTML|eval\(|new Function|localStorage|sessionStorage|fetch\(|XMLHttpRequest|clipboard|serviceWorker/);
assert.match(app, /textContent/);
assert.match(app, /addEventListener\('pagehide'/);
assert.match(app, /addEventListener\('pageshow'/);
assert.match(css, /:focus-visible/);

const zh = 'https://preview.invalid/tools/fluid-typography/';
const en = zh + 'en/';
for (const [file, lang, canonical, home, alternate] of [
  ['index.html', 'zh-Hant', zh, 'https://preview.invalid/', en],
  ['en/index.html', 'en', en, 'https://preview.invalid/en/', zh],
]) {
  const html = await readFile(file, 'utf8');
  const resolved = value => new URL(value, new URL(file, zh)).href;
  assert.ok(html.includes(`<html lang="${lang}">`), file);
  assert.ok(html.includes(`<title>${messages[lang].title} · GlossQuote Labs</title>`), file);
  assert.match(html, /<meta name="description" content="[^"]{20,}">/, file);
  assert.match(html, /name="robots" content="noindex,nofollow"/, file);
  assert.equal(resolved(html.match(/rel="canonical" href="([^"]+)"/)[1]), canonical, file);
  for (const [alternateLang, expected] of [['zh-TW', zh], ['en', en], ['x-default', zh]]) {
    const match = html.match(new RegExp(`hreflang="${alternateLang}" href="([^"]+)"`));
    assert.equal(resolved(match[1]), expected, file);
  }
  assert.equal(resolved(html.match(/id="labs-home"[^>]+href="([^"]+)"/)[1]), home, file);
  assert.equal(resolved(html.match(/id="language" href="([^"]+)"/)[1]), alternate, file);
  const assets = [...html.matchAll(/<(?:link rel="stylesheet"|script type="module") (?:href|src)="([^"]+)"/g)];
  assert.deepEqual(assets.map(([, resource]) => resolved(resource)), [zh + 'style.css', zh + 'src/app.mjs']);
  for (const [, resource] of assets) await readFile(new URL(resource, new URL('../' + file, import.meta.url)));
  assert.doesNotMatch(html, /https?:\/\/|maxlength=/, file);
  assert.match(html, /Content-Security-Policy/, file);
  assert.ok(html.includes("connect-src 'none'"), file);
  assert.match(html, /<noscript>/, file);
  assert.match(html, /aria-live="polite"/, file);
  assert.ok(html.indexOf('id="generate"') < html.indexOf('id="select"'), file);
  assert.ok(html.indexOf('id="select"') < html.indexOf('id="reset"'), file);
  for (const [, key, content] of html.matchAll(/data-t="(\w+)">([^<]*)<\//g)) {
    assert.equal(content, messages[lang][key], `${file} ${key}`);
  }
  for (const key of fields) {
    assert.ok(html.includes(`data-field-label="${key}">${messages[lang][key]} (`), file);
    assert.match(html, new RegExp(`id="${key}" name="${key}" type="text".*aria-describedby="${key}-range ${key}-error`), file);
  }
}
console.log('Syntax, static safety, bilingual metadata, field labels and resource paths PASS.');
