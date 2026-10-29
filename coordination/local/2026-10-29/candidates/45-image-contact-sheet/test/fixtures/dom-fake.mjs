import { FakeCanvas } from './browser-fakes.mjs';

// A deliberately tiny event/DOM recorder. It has no HTML layout, accessibility tree or browser APIs.
class Element {
  constructor(tag, document) {
    this.tagName = tag; this.document = document; this.children = []; this.dataset = {};
    this.attributes = {}; this.events = new Map(); this.hidden = false; this.disabled = false; this.checked = false;
    this.ownText = ''; this._value = ''; this.files = [];
  }
  set textContent(value) { this.ownText = String(value); this.children = []; }
  get textContent() { return this.ownText + this.children.map((n) => n.textContent).join(''); }
  set value(value) { this._value = value; if (this.tagName === 'input' && value === '') this.files = []; }
  get value() { return this._value; }
  append(...nodes) { for (const n of nodes) { n.parent = this; this.children.push(n); } }
  replaceChildren(...nodes) { this.children = []; this.ownText = ''; this.append(...nodes); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((n) => n !== this); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, handler) { const handlers = this.events.get(name) ?? []; handlers.push(handler); this.events.set(name, handlers); }
  dispatch(name, extra = {}) { for (const handler of this.events.get(name) ?? []) handler({ target: this, ...extra }); }
  click() {
    if (this.disabled) return;
    if (this.tagName === 'a') this.document.downloads.push({ href: this.href, download: this.download });
    this.dispatch('click');
  }
  focus() { this.document.activeElement = this; }
  querySelector(selector) {
    const match = /^\[data-row="(-?\d+)"\]\[data-action="([a-z]+)"\]$/u.exec(selector);
    if (!match) throw new Error('Unsupported fake DOM selector');
    for (const child of this.children) {
      if (child.dataset.row === match[1] && child.dataset.action === match[2]) return child;
      const nested = child.querySelector(selector); if (nested) return nested;
    }
    return null;
  }
}
export function fakeDocument(language, html) {
  const nodes = new Map(), downloads = [];
  const document = { documentElement: { lang: language }, activeElement: null, downloads,
    createElement(tag) { return new Element(tag, document); }, getElementById(id) { return nodes.get(id); } };
  document.body = document.createElement('body');
  for (const match of html.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"[^>]*>/gu)) {
    const element = document.createElement(match[1]); element.id = match[2];
    element.disabled = /\sdisabled(?:\s|>)/u.test(match[0]);
    element.hidden = /\shidden(?:\s|>)/u.test(match[0]);
    nodes.set(element.id, element);
  }
  const canvas = new FakeCanvas(), node = nodes.get('preview');
  for (const property of ['width', 'height']) Object.defineProperty(node, property, { get: () => canvas[property], set: (value) => { canvas[property] = value; } });
  node.getContext = canvas.getContext.bind(canvas); node.toBlob = canvas.toBlob.bind(canvas);
  return { document, nodes, canvas, downloads };
}
