import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fields } from '../src/core.mjs';

const root = 'https://preview.invalid/tools/fluid-typography/';
const english = root + 'en/';

function fakeNode(properties = {}) {
  const listeners = new Map();
  return {
    ...properties,
    style: {},
    setAttribute(name, value) { this[name] = value; },
    addEventListener(name, fn) { listeners.set(name, fn); },
    emit(name, event) { listeners.get(name)(event); },
    replaceChildren() {},
    append() {},
    focus() { this.focused = true; },
  };
}

async function boot(pathname, nonce, overlay = html => html) {
  const html = overlay(await readFile(new URL('../' + pathname, import.meta.url), 'utf8'));
  let current = new URL(pathname, root);
  const resolve = href => new URL(href, current).href;
  const ids = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, fakeNode()]));
  const selectors = new Map();
  const byId = id => ids.get(id);
  byId('language').href = resolve(html.match(/id="language" href="([^"]+)"/)[1]);
  byId('labs-home').href = resolve(html.match(/id="labs-home"[^>]*href="([^"]+)"/)[1]);
  for (const key of fields) selectors.set(`[data-field-label="${key}"]`, fakeNode());
  for (const [, lang, href] of html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)) {
    selectors.set(`link[hreflang="${lang}"]`, fakeNode({ href: resolve(href) }));
  }
  const canonical = fakeNode({ href: resolve(html.match(/rel="canonical" href="([^"]+)"/)[1]) });
  selectors.set('link[rel="canonical"]', canonical);
  selectors.set('meta[name="description"]', fakeNode());
  const rendered = [...html.matchAll(/data-t="([^"]+)"/g)].map(([, t]) => fakeNode({ dataset: { t } }));
  const fakeWindow = fakeNode();
  const historyWrites = [];
  globalThis.document = {
    documentElement: { lang: html.match(/<html lang="([^"]+)"/)[1] },
    getElementById: byId,
    querySelector: selector => selectors.get(selector),
    querySelectorAll: () => rendered,
    createElement: () => fakeNode(),
  };
  globalThis.location = { get href() { return current.href; }, get origin() { return current.origin; } };
  globalThis.history = { pushState(_data, _title, url) { historyWrites.push(url.href); current = new URL(url); } };
  globalThis.requestAnimationFrame = () => {};
  globalThis.addEventListener = fakeWindow.addEventListener;
  await import(`../src/app.mjs?${nonce}`);
  return {
    byId, canonical, historyWrites, lang: () => document.documentElement.lang,
    pop(url) { current = new URL(url); fakeWindow.emit('popstate', {}); },
  };
}

function click(link, props = {}) {
  const event = { button: 0, preventDefault() { this.defaultPrevented = true; }, ...props };
  link.emit('click', event);
  return Boolean(event.defaultPrevented);
}

test('static deep link and reload boot in English and keep normal link semantics', async () => {
  for (const bootId of ['first', 'reload']) {
    const app = await boot('en/index.html', bootId);
    assert.equal(app.lang(), 'en');
    assert.equal(app.byId('sample').value, 'Type that grows with your ideas.');
    assert.equal(app.byId('language').href, root);
    assert.equal(app.byId('labs-home').href, 'https://preview.invalid/en/');
    for (const modifier of [{ button: 1 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }]) {
      assert.equal(click(app.byId('language'), modifier), false);
    }
    assert.deepEqual(app.historyWrites, []);
  }
});

test('language navigation and history restore preserve generated CSS, field errors and focus', async () => {
  const app = await boot('index.html', 'history');
  const link = app.byId('language');
  app.byId('form').emit('submit', { preventDefault() {} });
  const css = app.byId('css').value;
  assert.match(css, /clamp/);
  link.focus();
  assert.equal(click(link), true);
  assert.deepEqual(app.historyWrites, [english]);
  assert.equal(app.lang(), 'en');
  assert.equal(app.canonical.href, english);
  assert.equal(app.byId('labs-home').href, 'https://preview.invalid/en/');
  assert.equal(app.byId('css').value, css);
  assert.equal(link.focused, true);
  const minimum = app.byId('vmin');
  minimum.value = 'bad';
  minimum.emit('input', {});
  assert.equal(app.byId('css').value, '');
  app.byId('form').emit('submit', { preventDefault() {} });
  app.pop(root + 'index.html');
  assert.equal(app.lang(), 'zh-Hant');
  assert.equal(app.canonical.href, root);
  assert.equal(app.byId('labs-home').href, 'https://preview.invalid/');
  assert.equal(minimum.value, 'bad');
  assert.equal(minimum['aria-invalid'], 'true');
  app.pop(english);
  assert.equal(app.lang(), 'en');
  assert.equal(minimum.value, 'bad');
  assert.equal(minimum['aria-invalid'], 'true');
  assert.deepEqual(app.historyWrites, [english]);
});

test('published canonical paths and home links are used without switching host', async () => {
  const app = await boot('index.html', 'overlay', html => html
    .replace('hreflang="zh-TW" href="./"', 'hreflang="zh-Hant" href="' + root + 'index.html"')
    .replace('hreflang="en" href="en/"', 'hreflang="en" href="' + english + 'index.html"')
    .replace('href="../../" aria-label=', 'href="https://glossquote.invalid/index.html" aria-label='));
  assert.equal(click(app.byId('language')), true);
  assert.deepEqual(app.historyWrites, [english + 'index.html']);
  assert.equal(app.byId('labs-home').href, 'https://glossquote.invalid/en/index.html');
  app.pop(root + 'index.html');
  assert.equal(app.byId('labs-home').href, 'https://glossquote.invalid/index.html');
});
