// Deliberately small fake DOM. It has no browser, layout, network, storage or native input.
import assert from 'node:assert/strict';

class Element {
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.listeners = new Map(); this.attributes = {}; this.value = ''; this.checked = false; this.disabled = false; this.hidden = false; this._text = ''; }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes) { for (const child of this.children) child.parentElement = null; this.children = []; this.append(...nodes); this._text = ''; }
  set textContent(value) { this.replaceChildren(); this._text = String(value); }
  get textContent() { return this._text + this.children.map(node => node.textContent).join(''); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(name, handler) { if (!this.listeners.has(name)) this.listeners.set(name, []); this.listeners.get(name).push(handler); }
  fire(name) { const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }; for (const handler of this.listeners.get(name) ?? []) handler(event); return event; }
  click() { if (this.disabled) return; if (this.tagName === 'A' && this.download) this.doc.downloads.push({ href: this.href, filename: this.download }); this.fire('click'); }
  focus() { assert.equal(this.disabled, false, `Cannot focus disabled ${this.id}`); for (let item = this; item; item = item.parentElement) assert.equal(item.hidden, false, `Cannot focus hidden ${this.id}`); this.doc.activeElement = this; }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(node => node !== this); this.parentElement = null; }
}
export function fakeDocument(html) {
  const ids = new Map(), doc = { downloads: [], activeElement: null, createElement: tag => new Element(tag, doc), getElementById: id => { assert.ok(ids.has(id), `Missing element ${id}`); return ids.get(id); } };
  const stack = [], voids = ['meta', 'link', 'input', 'br'];
  for (const match of html.matchAll(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/g)) {
    const [, closing, tag, attrs] = match;
    if (closing) { while (stack.length && stack.pop().tagName !== tag.toUpperCase()) { /* Match authored static markup only. */ } continue; }
    const node = doc.createElement(tag);
    for (const attribute of attrs.matchAll(/([a-zA-Z][a-zA-Z0-9:-]*)(?:="([^"]*)")?/g)) {
      const name = attribute[1], value = attribute[2] ?? '';
      node.attributes[name] = value;
      if (['id', 'value', 'lang'].includes(name)) node[name] = value;
      if (['disabled', 'hidden', 'checked'].includes(name)) node[name] = true;
    }
    if (node.id) { assert.equal(ids.has(node.id), false); ids.set(node.id, node); }
    if (stack.length) stack.at(-1).append(node);
    if (tag === 'html') doc.documentElement = node;
    if (tag === 'body') doc.body = node;
    if (!voids.includes(tag)) stack.push(node);
  }
  return doc;
}
export function fakeHost() {
  const listeners = new Map();
  return { TextEncoder, TextDecoder, Blob, FileReader: class {}, URL: { createObjectURL() {}, revokeObjectURL() {} }, crypto: { getRandomValues() {} }, addEventListener(name, handler) { listeners.set(name, handler); }, fire(name, event = {}) { listeners.get(name)?.(event); } };
}
