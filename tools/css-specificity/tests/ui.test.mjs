// UI wiring tests under a hand-written Node DOM shim. HONEST SCOPE: this is
// NOT a browser. It exercises app.mjs event wiring, rendering and state
// flow against fake elements that mirror the ids in src/index.html.
// Rendering, layout, real focus visibility, IME and browser lifecycle
// remain NOT_RUN (see VERIFICATION.md).

import { test } from 'node:test';
import assert from 'node:assert/strict';

class TextNodeShim {
  constructor(text) { this.nodeType = 3; this.textContent = text; this.parentNode = null; }
}

const docHolder = { doc: null };

class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.nodeType = 1;
    this.childNodes = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.value = '';
    this.hidden = false;
    this.open = false;
    this.parentNode = null;
    this.focusCount = 0;
    const classes = new Set();
    this.classList = {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    };
  }
  get children() { return this.childNodes.filter((n) => n.nodeType === 1); }
  get firstChild() { return this.childNodes.length ? this.childNodes[0] : null; }
  appendChild(node) {
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }
  removeChild(node) {
    const i = this.childNodes.indexOf(node);
    if (i >= 0) this.childNodes.splice(i, 1);
    node.parentNode = null;
    return node;
  }
  replaceChildren(...nodes) {
    while (this.childNodes.length) this.removeChild(this.childNodes[0]);
    for (const n of nodes) this.appendChild(n);
  }
  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  dispatch(type, extra) {
    const event = {
      button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
      prevented: false,
      preventDefault() { this.prevented = true; },
      ...(extra || {}),
    };
    for (const fn of this.listeners.get(type) || []) fn(event);
    return event;
  }
  focus() { this.focusCount++; if (docHolder.doc) docHolder.doc.activeElement = this; }
  set textContent(v) {
    this.childNodes = [];
    if (v !== '' && v !== null && v !== undefined) {
      const t = new TextNodeShim(String(v));
      t.parentNode = this;
      this.childNodes.push(t);
    }
  }
  get textContent() {
    let out = '';
    const walk = (n) => {
      if (n.nodeType === 3) out += n.textContent;
      else for (const c of n.childNodes) walk(c);
    };
    walk(this);
    return out;
  }
}

const registry = new Map();
function makeEl(tag, id, attrs) {
  const e = new El(tag);
  if (id) { e.setAttribute('id', id); registry.set(id, e); }
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

const body = new El('body');
const doc = {
  documentElement: { lang: 'zh-Hant' },
  title: '',
  activeElement: null,
  body,
  getElementById: (id) => registry.get(id) || null,
  createElement: (tag) => new El(tag),
  createTextNode: (t) => new TextNodeShim(t),
};
docHolder.doc = doc;

const h1 = makeEl('h1', null, { 'data-i18n': 'h1' });
const leftInput = makeEl('textarea', 'left-input');
leftInput.value = '#card .title';
const rightInput = makeEl('textarea', 'right-input');
rightInput.value = '.card h2.title';
const compareBtn = makeEl('button', 'compare-btn', { 'data-i18n': 'compare' });
const resetBtn = makeEl('button', 'reset-btn');
const langLink = makeEl('a', 'lang-link', { href: '/en/index.html' });
langLink.textContent = 'English';
const status = makeEl('p', 'status', { 'data-i18n': 'statusIdle' });
const errorSummary = makeEl('section', 'error-summary');
errorSummary.hidden = true;
const errorList = makeEl('ul', 'error-list');
errorSummary.appendChild(errorList);
const result = makeEl('section', 'result');
result.hidden = true;
const cmpProse = makeEl('p', 'cmp-prose');
const firstDiffValue = makeEl('span', 'first-diff-value');
const summaryText = makeEl('textarea', 'summary-text');
const leftTriple = makeEl('span', 'left-triple');
const rightTriple = makeEl('span', 'right-triple');
const leftTree = makeEl('div', 'left-tree');
const rightTree = makeEl('div', 'right-tree');
result.appendChild(cmpProse);
const grammar = makeEl('details', 'grammar');
makeEl('meta', 'meta-desc');
for (const e of [h1, leftInput, rightInput, compareBtn, resetBtn, langLink, status, errorSummary, result, grammar]) {
  body.appendChild(e);
}

const winListeners = new Map();
const win = {
  addEventListener(type, fn) {
    if (!winListeners.has(type)) winListeners.set(type, []);
    winListeners.get(type).push(fn);
  },
  fire(type) { for (const fn of winListeners.get(type) || []) fn({}); },
};
const hist = { calls: [], pushState(a, b, url) { this.calls.push(url); } };

globalThis.document = doc;
globalThis.window = win;
globalThis.history = hist;

await import(new URL('../src/assets/app.mjs?ui=1', import.meta.url));

test('initial render: idle status, defaults present, no result', () => {
  assert.equal(status.textContent, '尚未比較。');
  assert.equal(result.hidden, true);
  assert.equal(leftInput.value, '#card .title');
  assert.equal(rightInput.value, '.card h2.title');
});

test('compare renders exact summary, prose, triples and trees', () => {
  compareBtn.dispatch('click');
  assert.equal(result.hidden, false);
  assert.equal(summaryText.value, 'L: (1,1,0)\nR: (0,2,1)\ncomparison: left\nfirstDifference: A');
  assert.equal(cmpProse.textContent, '左邊的 specificity 較高。');
  assert.equal(firstDiffValue.textContent, 'A');
  assert.equal(leftTriple.textContent, '(1,1,0)');
  assert.equal(rightTriple.textContent, '(0,2,1)');
  assert.ok(leftTree.textContent.includes('#card'));
  assert.ok(leftTree.textContent.includes('ID'));
  assert.equal(status.textContent, '比較完成。');
});

test('where annotation is rendered and editing clears the result at once', () => {
  leftInput.value = ':where(#a.b div)::before';
  leftInput.dispatch('input');
  assert.equal(result.hidden, true);
  assert.equal(status.textContent, '內容已修改，請重新比較。');
  compareBtn.dispatch('click');
  assert.equal(result.hidden, false);
  assert.ok(leftTree.textContent.includes('（:where 的子節點不計入）'));
  assert.equal(leftTriple.textContent, '(0,0,1)');
});

test('failure shows the error summary and focuses the first invalid field', () => {
  leftInput.value = ':foo';
  leftInput.dispatch('input');
  assert.equal(errorSummary.hidden, true, 'edit clears errors immediately');
  compareBtn.dispatch('click');
  assert.equal(errorSummary.hidden, false);
  assert.equal(errorList.children.length, 1);
  assert.ok(errorList.textContent.includes('UNSUPPORTED_NAME'));
  assert.equal(doc.activeElement, leftInput);
  assert.equal(result.hidden, true);
});

test('repair and re-compare recovers; reset restores the documented state', () => {
  leftInput.value = 'div';
  leftInput.dispatch('input');
  compareBtn.dispatch('click');
  assert.equal(result.hidden, false);
  assert.equal(errorSummary.hidden, true);
  grammar.open = true;
  grammar.dispatch('toggle');
  resetBtn.dispatch('click');
  assert.equal(leftInput.value, '#card .title');
  assert.equal(rightInput.value, '.card h2.title');
  assert.equal(result.hidden, true);
  assert.equal(status.textContent, '尚未比較。');
  assert.equal(grammar.open, false);
});

test('unmodified language activation preserves raw/result/disclosure and switches strings', () => {
  compareBtn.dispatch('click');
  grammar.open = true;
  grammar.dispatch('toggle');
  const ev = langLink.dispatch('click');
  assert.equal(ev.prevented, true);
  assert.deepEqual(hist.calls, ['/en/index.html']);
  assert.equal(doc.title, 'CSS Selector Specificity Comparator');
  assert.equal(doc.documentElement.lang, 'en');
  assert.equal(leftInput.value, '#card .title', 'raw text preserved');
  assert.equal(result.hidden, false, 'structured result preserved');
  assert.equal(status.textContent, 'Comparison complete.');
  assert.equal(grammar.open, true, 'disclosure state preserved');
  assert.equal(langLink.textContent, '繁體中文');
  assert.equal(doc.activeElement, langLink, 'focus moves to the language control');
});

test('modified language activation is left to the browser (fresh page)', () => {
  const before = hist.calls.length;
  const ev = langLink.dispatch('click', { ctrlKey: true });
  assert.equal(ev.prevented, false);
  assert.equal(hist.calls.length, before);
});

test('pagehide clears results and demands a fresh compare; reset works in English too', () => {
  win.fire('pagehide');
  assert.equal(result.hidden, true);
  assert.equal(status.textContent, 'Content changed; please compare again.');
  compareBtn.dispatch('click');
  assert.equal(result.hidden, false);
  resetBtn.dispatch('click');
  assert.equal(status.textContent, 'Not compared yet.');
  assert.equal(leftInput.value, '#card .title');
});
