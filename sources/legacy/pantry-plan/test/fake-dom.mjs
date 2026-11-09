// Bounded offline adapter for app event wiring. No rendering, layout, accessibility tree,
// browser, OS input, network, files, clipboard, or permission assertions are provided.
export class FakeElement {
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.parentNode = null; this.attributes = new Map(); this.listeners = new Map(); this._text = ''; this.value = ''; this.disabled = false; this.hidden = false; this.dataset = {}; this.files = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this.replaceChildren(); this._text = String(value); }
  get id() { return this.attributes.get('id') ?? ''; }
  set id(value) { this.attributes.set('id', value); }
  get href() { return this.attributes.get('href') ?? ''; }
  set href(value) { this.attributes.set('href', value); }
  get className() { return this.attributes.get('class') ?? ''; }
  set className(value) { this.attributes.set('class', value); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); if (name === 'disabled' || name === 'hidden') this[name] = true; }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  append(...nodes) { for (const node of nodes) { node.parentNode = this; this.children.push(node); } }
  replaceChildren(...nodes) { for (const child of this.children) child.parentNode = null; this.children = []; this._text = ''; this.append(...nodes); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(node => node !== this); this.parentNode = null; }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(fn); }
  emit(type, props = {}) { const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...props }; for (const fn of this.listeners.get(type) ?? []) fn(event); return event; }
  click() {
    for (let node = this; node; node = node.parentNode) if (node.disabled) return;
    if (this.tagName === 'A' && this.download) this.doc.downloads.push({ url: this.href, filename: this.download });
    this.emit('click');
  }
  focus() { this.doc.activeElement = this; }
  matches(selector) {
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    if (selector === '[data-path]') return this.dataset.path !== undefined;
    const attr = /^\[([\w-]+)="([^"]+)"\]$/.exec(selector);
    if (attr) return this.getAttribute(attr[1]) === attr[2];
    return this.tagName === selector.toUpperCase();
  }
  querySelectorAll(selector) { return this.children.flatMap(node => [...(node.matches(selector) ? [node] : []), ...node.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}
export function fakeDocument(html) {
  const doc = { downloads: [], activeElement: null, createElement(tag) { return new FakeElement(tag, this); } };
  const root = new FakeElement('root', doc); const stack = [root];
  const voids = new Set(['META', 'LINK', 'INPUT', 'BR', 'HR', 'IMG']);
  for (const token of html.matchAll(/<\/?([A-Za-z][\w-]*)([^>]*)>|([^<]+)/g)) {
    if (token[3] !== undefined) { stack.at(-1)._text += token[3]; continue; }
    if (token[0].startsWith('</')) { if (stack.at(-1).tagName === token[1].toUpperCase()) stack.pop(); continue; }
    const node = doc.createElement(token[1]);
    for (const attr of token[2].matchAll(/([:\w-]+)(?:="([^"]*)")?/g)) node.setAttribute(attr[1], attr[2] ?? '');
    if (node.tagName === 'HTML') { doc.documentElement = node; node.lang = node.getAttribute('lang'); }
    if (node.tagName === 'BODY') doc.body = node;
    stack.at(-1).append(node); if (!voids.has(node.tagName)) stack.push(node);
  }
  doc.getElementById = id => root.querySelector(`#${id}`);
  doc.querySelectorAll = selector => root.querySelectorAll(selector);
  doc.querySelector = selector => root.querySelector(selector);
  return doc;
}

export function fakeHost() {
  const readers = [], blobs = new Map(), revoked = [], timers = new Map(), events = new Map(), navigation = [];
  let sequence = 0;
  const host = {
    BigInt, Blob, TextDecoder, Intl,
    FileReader: class {
      constructor() { readers.push(this); this.readyState = 0; }
      readAsArrayBuffer(file) { this.file = file; this.readyState = 1; }
      abort() { this.readyState = 2; }
      complete(text) { this.result = new TextEncoder().encode(text).buffer; this.readyState = 2; this.onload?.(); }
    },
    URL: { createObjectURL(blob) { const url = `blob:fake-${++sequence}`; blobs.set(url, blob); return url; }, revokeObjectURL(url) { revoked.push(url); } },
    setTimeout(fn, delay) { const id = ++sequence; timers.set(id, { fn, delay }); return id; }, clearTimeout(id) { timers.delete(id); },
    navigator: { clipboard: { writeText: async () => {} } },
    location: { assign: path => navigation.push(path), reload: () => navigation.push('reload') },
    addEventListener(type, fn) { events.set(type, fn); },
  };
  return { host, readers, blobs, revoked, timers, events, navigation };
}
