// Deliberately small offline DOM double: no browser, rendering, network or OS behavior.
export class Element {
  constructor(doc, tag) { this.doc = doc; this.tagName = tag.toUpperCase(); this.children = []; this.attributes = new Map(); this.listeners = new Map(); this._text = ''; this._value = undefined; this.checked = false; this.hidden = false; this.disabled = false; this.parentElement = null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); if (name === 'hidden') this.hidden = true; if (name === 'disabled') this.disabled = true; if (name === 'value') this._value = String(value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  get id() { return this.getAttribute('id'); }
  set id(value) { this.setAttribute('id', value); }
  get className() { return this.getAttribute('class') ?? ''; }
  set className(value) { this.setAttribute('class', value); }
  get value() { return this._value ?? (this.tagName === 'SELECT' ? this.children[0]?.value ?? '' : ''); }
  set value(value) { this._value = String(value); }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this.replaceChildren(); this._text = String(value); }
  append(...elements) { for (const element of elements) { if (!(element instanceof Element)) throw new Error('fake DOM expects elements'); element.remove(); element.parentElement = this; this.children.push(element); } }
  replaceChildren(...elements) { for (const child of this.children) child.parentElement = null; this.children = []; this._text = ''; if (this.tagName === 'SELECT') this._value = undefined; this.append(...elements); }
  remove() { if (!this.parentElement) return; const parent = this.parentElement; parent.children = parent.children.filter(child => child !== this); this.parentElement = null; }
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(callback); }
  dispatch(type, extra = {}) { const event = { type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra }; for (const callback of this.listeners.get(type) ?? []) callback(event); return event; }
  click() { if (this.tagName === 'A' && this.getAttribute('download')) this.doc.downloads.push({ href: this.getAttribute('href'), filename: this.getAttribute('download') }); this.dispatch('click'); }
  focus() { this.doc.activeElement = this; }
  reset() { for (const element of descendants(this)) if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') { element.value = ''; element.checked = false; } }
  get isConnected() { let root = this; while (root.parentElement) root = root.parentElement; return root === this.doc.root; }
}
export function descendants(element) { return element.children.flatMap(child => [child, ...descendants(child)]); }
export function ancestor(element, tag) { while (element && element.tagName !== tag.toUpperCase()) element = element.parentElement; return element; }
export function fakeDocument(html, language) {
  const doc = { documentElement: { lang: language }, downloads: [], createElement(tag) { return new Element(doc, tag); }, getElementById(id) { return descendants(doc.root).find(element => element.id === id) ?? null; } };
  doc.root = new Element(doc, 'document');
  const stack = [doc.root]; const voids = new Set(['meta', 'link', 'input', 'br', 'hr']);
  for (const match of html.matchAll(/<(\/?)([a-z0-9-]+)([^>]*)>/gi)) {
    const [, closing, tagRaw, attrs] = match; const tag = tagRaw.toLowerCase();
    if (closing) { if (stack.at(-1).tagName === tag.toUpperCase()) stack.pop(); continue; }
    const element = doc.createElement(tag);
    for (const attribute of attrs.matchAll(/([a-zA-Z0-9-]+)(?:="([^"]*)")?/g)) element.setAttribute(attribute[1], attribute[2] ?? '');
    stack.at(-1).append(element); if (tag === 'body') doc.body = element;
    if (!voids.has(tag)) stack.push(element);
  }
  return doc;
}
