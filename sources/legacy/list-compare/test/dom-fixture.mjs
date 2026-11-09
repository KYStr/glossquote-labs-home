import { renderPage } from '../scripts/pages.mjs';

// A small offline DOM adapter for event wiring, never browser evidence.
class NodeFixture {
  constructor(document, tag = '') {
    this.document = document; this.tagName = tag; this.children = []; this.attributes = {};
    this.events = {}; this.value = ''; this.textContent = ''; this.checked = false; this.hidden = false;
  }
  set innerHTML(unused) { throw new Error('HTML parsing must not be used'); }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { (this.events[name] ??= []).push(callback); }
  fire(name, props = {}) { for (const fn of this.events[name] ?? []) fn({ preventDefault() {}, ...props }); }
  focus() { this.document.activeElement = this; }
  append(...nodes) { for (const node of nodes) { if (node.tagName === '#fragment') this.children.push(...node.children); else this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
}

export function fixtureDocument(language = 'en') {
  const nodes = new Map();
  const createdTags = [];
  const document = {
    documentElement: { lang: language }, nodes, createdTags, activeElement: null,
    getElementById(id) { if (!nodes.has(id)) throw new Error(`Unknown fixture id: ${id}`); return nodes.get(id); },
    createElement(tag) { createdTags.push(tag); return new NodeFixture(document, tag); },
    createDocumentFragment() { return new NodeFixture(document, '#fragment'); }
  };
  for (const match of renderPage(language).matchAll(/\bid="([^"]+)"/g)) nodes.set(match[1], new NodeFixture(document));
  const window = new NodeFixture(document);
  window.navigator = {};
  return { document, window, get: id => document.getElementById(id) };
}

export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
